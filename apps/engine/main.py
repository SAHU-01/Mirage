from __future__ import annotations

import asyncio
import logging
import re
from contextlib import asynccontextmanager
from datetime import timedelta
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from agents.reasoner import MirageReasoner
from core.cache import FeatureCache
from core.chain_data import ChainDataClient
from core.features import FeatureExtractor
from core.store import MirageStore
from core.telegram import TelegramPush
from workers import exit_watchdog, labeler, outcome_resolver

log = logging.getLogger(__name__)
ADDRESS_RE = re.compile(r"^0x[a-fA-F0-9]{40}$")


def _validate_address(address: str, label: str) -> str:
    if not address or not ADDRESS_RE.match(address):
        raise HTTPException(status_code=400, detail=f"Invalid {label} address")
    return address.lower()


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.reasoner = MirageReasoner()
    app.state.chain = ChainDataClient()
    app.state.cache = FeatureCache()
    app.state.store = MirageStore()
    app.state.telegram = TelegramPush()
    app.state.adversarial_set = set()

    await app.state.cache.ensure_indexes()
    await app.state.store.ensure_indexes()

    # Hot-load the labeled adversarial set so FeatureExtractor has something
    # meaningful to measure graph_distance against.
    if app.state.store.enabled():
        app.state.adversarial_set = await app.state.store.adversarial_set()

    # Background workers — cancelled on shutdown. Each is resilient to its
    # dependency being unreachable; they sleep + retry.
    background = [
        asyncio.create_task(
            outcome_resolver.run_forever(app.state.store, app.state.chain)
        ),
        asyncio.create_task(
            exit_watchdog.run_forever(
                app.state.store, app.state.chain, app.state.telegram
            )
        ),
    ]
    app.state.background_tasks = background

    try:
        yield
    finally:
        for t in background:
            t.cancel()
        for t in background:
            try:
                await t
            except (asyncio.CancelledError, Exception):
                pass
        await app.state.chain.close()
        await app.state.cache.close()
        await app.state.store.close()
        await app.state.telegram.close()


app = FastAPI(title="Mirage Engine", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------- Request / response models -------

class AnalyzeWalletRequest(BaseModel):
    wallet_address: str
    token_address: Optional[str] = None


class AnalyzeTokenRequest(BaseModel):
    token_address: str
    window_minutes: int = Field(default=8, ge=1, le=60)


class AnalyzeRequest(BaseModel):
    address: str
    window_minutes: int = Field(default=8, ge=1, le=60)


class SubscribeRequest(BaseModel):
    chat_id: int
    wallet_address: str


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
    verdict_id: Optional[str] = None


class RankedBuyer(BaseModel):
    wallet_address: str
    trust_score: int
    verdict: str


class TokenMetadata(BaseModel):
    name: Optional[str] = None
    symbol: Optional[str] = None
    decimals: Optional[int] = None
    logo: Optional[str] = None


class TokenVerdict(BaseModel):
    token_address: str
    verdict: str
    trust_score: int
    bundle_contamination_pct: float
    graduation_probability: float
    ranked_buyers: List[RankedBuyer]
    counter_argument: str
    verdict_id: Optional[str] = None
    metadata: Optional[TokenMetadata] = None
    total_early_buyers: int = 0
    first_tx_ts: Optional[int] = None
    last_tx_ts: Optional[int] = None
    window_minutes: int = 8


# ------- Helpers -------

def _build_evidence_pool(txs: List[Dict], wallet_address: str) -> Dict[str, List]:
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


async def _analyze_wallet_core(
    wallet_address: str,
    token_address: Optional[str],
    *,
    record: bool = True,
) -> WalletVerdict:
    wallet_address = _validate_address(wallet_address, "wallet")
    if token_address:
        token_address = _validate_address(token_address, "token")

    cache: FeatureCache = app.state.cache
    chain: ChainDataClient = app.state.chain
    reasoner: MirageReasoner = app.state.reasoner
    store: MirageStore = app.state.store

    # Hot verdict cache — serves re-queries within 10 min instantly.
    cached_verdict = await store.get_cached_verdict("wallet", wallet_address)
    if cached_verdict:
        return WalletVerdict(**cached_verdict)

    cached_feats = await cache.get("wallet_features", wallet_address)
    if cached_feats:
        features = cached_feats["features"]
        evidence_pool = cached_feats["evidence_pool"]
    else:
        txs = await chain.get_wallet_transactions(wallet_address)
        distinct_tokens = {
            (t.get("tokenAddress") or "").lower() for t in txs if t.get("tokenAddress")
        }
        distinct_tokens.discard("")

        features = FeatureExtractor.extract_wallet_features(
            transactions=txs,
            wallet_address=wallet_address,
            known_adversarial=app.state.adversarial_set,
        )
        features["distinct_tokens_traded"] = len(distinct_tokens)
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

    verdict = result.get("final_verdict", "UNCERTAIN")
    trust_score = result.get("trust_score", 50)

    verdict_id = None
    if record:
        verdict_id = await store.record_verdict(
            kind="wallet",
            address=wallet_address,
            verdict=verdict,
            trust_score=trust_score,
            features=features,
            extras={"token_address": token_address},
        )

    response = WalletVerdict(
        wallet_address=wallet_address,
        token_address=token_address,
        verdict=verdict,
        trust_score=trust_score,
        counter_argument=result.get("counter_argument", ""),
        reasoning_trace=[AgentTrace(**t) for t in result.get("reasoning_trace", [])],
        features=features,
        verdict_id=verdict_id,
    )
    await store.set_cached_verdict("wallet", wallet_address, response.model_dump())
    return response


# ------- Endpoints -------

@app.get("/")
async def root():
    return {"service": "mirage-engine", "status": "ok"}


@app.get("/healthz")
async def healthz():
    return {
        "ok": True,
        "cache_enabled": app.state.cache.enabled(),
        "chain_enabled": app.state.chain.enabled(),
        "store_enabled": app.state.store.enabled(),
        "telegram_push_enabled": app.state.telegram.enabled(),
        "labeled_adversarial": len(app.state.adversarial_set),
    }


@app.post("/analyze_wallet", response_model=WalletVerdict)
async def analyze_wallet(body: AnalyzeWalletRequest):
    try:
        return await _analyze_wallet_core(body.wallet_address, body.token_address)
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        log.exception("analyze_wallet failed")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")


@app.post("/analyze_token", response_model=TokenVerdict)
async def analyze_token(body: AnalyzeTokenRequest):
    token_address = _validate_address(body.token_address, "token")
    chain: ChainDataClient = app.state.chain
    store: MirageStore = app.state.store

    if not chain.enabled():
        raise HTTPException(
            status_code=503,
            detail="Chain data disabled: set MORALIS_API_KEY in apps/engine/.env",
        )

    cached = await store.get_cached_verdict(
        "token", token_address, extras=f"w{body.window_minutes}"
    )
    if cached:
        return TokenVerdict(**cached)

    try:
        early_buyers_task = chain.get_early_buyers(
            token_address, window_minutes=body.window_minutes
        )
        meta_task = chain.get_token_metadata(token_address)
        early_buyers, raw_meta = await asyncio.gather(early_buyers_task, meta_task)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Chain data fetch failed: {e}")

    metadata = TokenMetadata(
        name=raw_meta.get("name") if raw_meta else None,
        symbol=raw_meta.get("symbol") if raw_meta else None,
        decimals=(
            int(raw_meta.get("decimals"))
            if raw_meta and raw_meta.get("decimals") is not None
            else None
        ),
        logo=raw_meta.get("logo") if raw_meta else None,
    )

    if not early_buyers:
        empty = TokenVerdict(
            token_address=token_address,
            verdict="UNCERTAIN",
            trust_score=50,
            bundle_contamination_pct=0.0,
            graduation_probability=0.0,
            ranked_buyers=[],
            counter_argument="No early buyers observed; token may be brand new, illiquid, or unindexed.",
            metadata=metadata,
            window_minutes=body.window_minutes,
        )
        return empty

    ts_values = [int(t["timeStamp"]) for t in early_buyers if t.get("timeStamp")]

    bundle_pct = FeatureExtractor.calculate_bundle_coefficient(early_buyers) * 100

    # Parallel buyer analysis — previously sequential, now asyncio.gather.
    # Also skip the store.record for each buyer to keep the verdict log clean:
    # we only persist the top-level *token* verdict.
    candidates: List[str] = []
    for tx in early_buyers:
        buyer = (tx.get("to") or "").lower()
        if buyer and ADDRESS_RE.match(buyer) and buyer not in candidates:
            candidates.append(buyer)
        if len(candidates) >= 8:  # cap LLM fanout
            break

    async def _analyze_buyer(addr: str) -> Optional[RankedBuyer]:
        try:
            wv = await _analyze_wallet_core(addr, token_address, record=False)
            return RankedBuyer(
                wallet_address=addr,
                trust_score=wv.trust_score,
                verdict=wv.verdict,
            )
        except HTTPException:
            return None
        except Exception as e:  # noqa: BLE001
            log.warning("buyer analysis failed for %s: %s", addr, e)
            return None

    results = await asyncio.gather(*(_analyze_buyer(a) for a in candidates))
    ranked = [r for r in results if r is not None]
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

    verdict_id = await store.record_verdict(
        kind="token",
        address=token_address,
        verdict=verdict,
        trust_score=token_score,
        features={
            "bundle_contamination_pct": round(bundle_pct, 2),
            "graduation_probability": round(graduation_probability, 2),
            "ranked_buyer_count": len(ranked),
        },
        extras={"window_minutes": body.window_minutes},
    )

    response = TokenVerdict(
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
        verdict_id=verdict_id,
        metadata=metadata,
        total_early_buyers=len(early_buyers),
        first_tx_ts=min(ts_values) if ts_values else None,
        last_tx_ts=max(ts_values) if ts_values else None,
        window_minutes=body.window_minutes,
    )

    await store.set_cached_verdict(
        "token", token_address, response.model_dump(), extras=f"w{body.window_minutes}"
    )
    return response


@app.post("/analyze")
async def analyze(body: AnalyzeRequest):
    """Auto-route: if address is an ERC-20 contract, run token analysis;
    otherwise run wallet analysis."""
    address = _validate_address(body.address, "address")
    chain: ChainDataClient = app.state.chain

    is_token = False
    if chain.enabled():
        try:
            is_token = await chain.is_erc20_contract(address)
        except Exception:  # noqa: BLE001
            is_token = False

    if is_token:
        verdict = await analyze_token(
            AnalyzeTokenRequest(token_address=address, window_minutes=body.window_minutes)
        )
        return {"kind": "token", "verdict": verdict}

    wallet_verdict = await _analyze_wallet_core(address, None)
    return {"kind": "wallet", "verdict": wallet_verdict}


@app.post("/subscribe")
async def subscribe(body: SubscribeRequest):
    wallet = _validate_address(body.wallet_address, "wallet")
    store: MirageStore = app.state.store
    chain: ChainDataClient = app.state.chain

    if not store.enabled():
        raise HTTPException(
            status_code=503,
            detail="Subscriptions require MongoDB (set MONGODB_URI).",
        )

    # Snapshot baseline so the watchdog only alerts on *new* activity.
    baseline: Dict[str, Any] = {}
    if chain.enabled():
        try:
            baseline = await exit_watchdog._snapshot_baseline(chain, wallet)  # noqa: SLF001
        except Exception:  # noqa: BLE001
            baseline = {}

    await store.add_subscription(body.chat_id, wallet, baseline=baseline)
    return {"ok": True, "wallet_address": wallet, "chat_id": body.chat_id}


@app.post("/unsubscribe")
async def unsubscribe(body: SubscribeRequest):
    wallet = _validate_address(body.wallet_address, "wallet")
    await app.state.store.remove_subscription(body.chat_id, wallet)
    return {"ok": True}


@app.get("/accuracy")
async def accuracy(days: int = 30):
    since = timedelta(days=days) if days > 0 else None
    return await app.state.store.accuracy_summary(since=since)


@app.post("/admin/run_labeler")
async def run_labeler():
    """Manual trigger for the labeling pipeline. In production this runs on a
    cron schedule; for hackathon we expose it as an endpoint so you can seed
    the adversarial set on demand."""
    store: MirageStore = app.state.store
    chain: ChainDataClient = app.state.chain
    n = await labeler.label_from_resolved_rugs(store, chain)
    app.state.adversarial_set = await store.adversarial_set()
    return {"labeled": n, "adversarial_set_size": len(app.state.adversarial_set)}


@app.post("/admin/run_resolver")
async def run_resolver():
    """Manual trigger for the outcome resolver."""
    store: MirageStore = app.state.store
    chain: ChainDataClient = app.state.chain
    n = await outcome_resolver.resolve_pending(store, chain)
    return {"resolved": n}


@app.get("/verdicts")
async def list_verdicts(kind: Optional[str] = None, limit: int = 50):
    verdicts = await app.state.store.list_verdicts(kind=kind, limit=limit)
    return {"verdicts": [
        {
            "verdict_id": v.get("verdict_id"),
            "kind": v.get("kind"),
            "address": v.get("address"),
            "verdict": v.get("verdict"),
            "trust_score": v.get("trust_score"),
            "created_at": v.get("created_at").isoformat() if v.get("created_at") else None,
            "resolved": v.get("resolved", False),
            "final_outcome": v.get("final_outcome"),
        }
        for v in verdicts
    ]}
