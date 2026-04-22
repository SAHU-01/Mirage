from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
import re

from agents.reasoner import MirageReasoner
from core.bscscan import BscScanClient
from core.features import FeatureExtractor
from core.cache import FeatureCache


ADDRESS_RE = re.compile(r"^0x[a-fA-F0-9]{40}$")


def _validate_address(address: str, label: str) -> str:
    if not address or not ADDRESS_RE.match(address):
        raise HTTPException(status_code=400, detail=f"Invalid {label} address")
    return address.lower()


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.reasoner = MirageReasoner()
    app.state.bsc = BscScanClient()
    app.state.cache = FeatureCache()
    yield
    await app.state.bsc.close()
    await app.state.cache.close()


app = FastAPI(title="Mirage Engine", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeWalletRequest(BaseModel):
    wallet_address: str
    token_address: Optional[str] = None


class AnalyzeTokenRequest(BaseModel):
    token_address: str
    window_minutes: int = Field(default=8, ge=1, le=60)


class EvidenceCitationOut(BaseModel):
    claim: str
    block_number: Optional[int] = None
    tx_hash: Optional[str] = None
    wallet_address: Optional[str] = None


class AgentTrace(BaseModel):
    agent: str
    score: int
    findings: List[str]
    citations: List[EvidenceCitationOut]


class WalletVerdict(BaseModel):
    wallet_address: str
    token_address: Optional[str]
    verdict: str
    trust_score: int
    counter_argument: str
    reasoning_trace: List[AgentTrace]
    features: Dict[str, Any]


class RankedBuyer(BaseModel):
    wallet_address: str
    trust_score: int
    verdict: str


class TokenVerdict(BaseModel):
    token_address: str
    verdict: str
    trust_score: int
    bundle_contamination_pct: float
    graduation_probability: float
    ranked_buyers: List[RankedBuyer]
    counter_argument: str


def _build_evidence_pool(txs: List[Dict], wallet_address: str) -> Dict[str, List]:
    """Pool of block numbers, tx hashes, and wallets the agents are allowed to cite."""
    blocks, hashes, wallets = [], [], {wallet_address.lower()}
    for tx in txs[:200]:
        try:
            blocks.append(int(tx["blockNumber"]))
        except (KeyError, ValueError):
            pass
        if tx.get("hash"):
            hashes.append(tx["hash"])
        for field in ("from", "to"):
            val = tx.get(field)
            if val:
                wallets.add(val.lower())
    return {
        "block_numbers": sorted(set(blocks)),
        "tx_hashes": list(dict.fromkeys(hashes)),
        "wallets": list(wallets),
    }


async def _analyze_wallet_core(wallet_address: str, token_address: Optional[str]) -> WalletVerdict:
    wallet_address = _validate_address(wallet_address, "wallet")
    if token_address:
        token_address = _validate_address(token_address, "token")

    cache: FeatureCache = app.state.cache
    bsc: BscScanClient = app.state.bsc
    reasoner: MirageReasoner = app.state.reasoner

    cached = await cache.get("wallet_features", wallet_address)
    if cached:
        features = cached["features"]
        evidence_pool = cached["evidence_pool"]
    else:
        txs = await bsc.get_wallet_transactions(wallet_address)
        features = FeatureExtractor.extract_wallet_features(
            transactions=txs,
            wallet_address=wallet_address,
        )
        evidence_pool = _build_evidence_pool(txs, wallet_address)
        await cache.set(
            "wallet_features",
            wallet_address,
            {"features": features, "evidence_pool": evidence_pool},
        )

    state = {
        "wallet_address": wallet_address,
        "token_address": token_address,
        "features": features,
        "evidence_pool": evidence_pool,
        "reasoning_trace": [],
    }
    result = await reasoner.app.ainvoke(state)

    return WalletVerdict(
        wallet_address=wallet_address,
        token_address=token_address,
        verdict=result.get("final_verdict", "UNCERTAIN"),
        trust_score=result.get("trust_score", 50),
        counter_argument=result.get("counter_argument", ""),
        reasoning_trace=[AgentTrace(**t) for t in result.get("reasoning_trace", [])],
        features=features,
    )


@app.get("/")
async def root():
    return {"service": "mirage-engine", "status": "ok"}


@app.get("/healthz")
async def healthz():
    return {"ok": True, "cache_enabled": app.state.cache.enabled()}


@app.post("/analyze_wallet", response_model=WalletVerdict)
async def analyze_wallet(body: AnalyzeWalletRequest):
    try:
        return await _analyze_wallet_core(body.wallet_address, body.token_address)
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")


@app.post("/analyze_token", response_model=TokenVerdict)
async def analyze_token(body: AnalyzeTokenRequest):
    token_address = _validate_address(body.token_address, "token")
    bsc: BscScanClient = app.state.bsc

    try:
        early_buyers = await bsc.get_early_buyers(token_address, window_minutes=body.window_minutes)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"BscScan fetch failed: {e}")

    if not early_buyers:
        return TokenVerdict(
            token_address=token_address,
            verdict="UNCERTAIN",
            trust_score=50,
            bundle_contamination_pct=0.0,
            graduation_probability=0.0,
            ranked_buyers=[],
            counter_argument="No early buyers observed; insufficient data.",
        )

    bundle_pct = FeatureExtractor.calculate_bundle_coefficient(early_buyers) * 100

    ranked: List[RankedBuyer] = []
    for tx in early_buyers[:10]:  # cap to control LLM cost on hackathon tier
        buyer = tx.get("to", "").lower()
        if not buyer or not ADDRESS_RE.match(buyer):
            continue
        try:
            wv = await _analyze_wallet_core(buyer, token_address)
            ranked.append(RankedBuyer(
                wallet_address=buyer,
                trust_score=wv.trust_score,
                verdict=wv.verdict,
            ))
        except HTTPException:
            continue

    ranked.sort(key=lambda b: b.trust_score, reverse=True)

    avg_buyer_score = (
        sum(b.trust_score for b in ranked) / len(ranked) if ranked else 50
    )
    token_score = int(max(0, min(100, avg_buyer_score - bundle_pct / 2)))
    if token_score >= 70 and bundle_pct < 20:
        verdict = "COPY"
    elif token_score <= 35 or bundle_pct >= 50:
        verdict = "AVOID"
    else:
        verdict = "UNCERTAIN"

    graduation_probability = max(0.0, min(1.0, (token_score - bundle_pct) / 100))

    return TokenVerdict(
        token_address=token_address,
        verdict=verdict,
        trust_score=token_score,
        bundle_contamination_pct=round(bundle_pct, 2),
        graduation_probability=round(graduation_probability, 2),
        ranked_buyers=ranked,
        counter_argument=(
            "Verdict would flip if the high-trust buyers turn out to share funding ancestors "
            "with adversarial wallets outside the current evidence pool."
        ),
    )
