from typing import TypedDict, List, Optional, Dict, Any
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field
import os
import json
import re


class EvidenceCitation(BaseModel):
    claim: str
    block_number: Optional[int] = None
    tx_hash: Optional[str] = None
    wallet_address: Optional[str] = None


class AgentOutput(BaseModel):
    agent: str
    score: int = Field(ge=0, le=100)
    findings: List[str]
    citations: List[EvidenceCitation] = []


class AgentState(TypedDict):
    wallet_address: str
    token_address: Optional[str]
    features: Dict[str, Any]
    evidence_pool: Dict[str, Any]
    coin_output: Optional[AgentOutput]
    wallet_output: Optional[AgentOutput]
    timing_output: Optional[AgentOutput]
    final_verdict: str
    trust_score: int
    counter_argument: str
    reasoning_trace: List[Dict[str, Any]]


COIN_SYSTEM = """You are the Coin Agent in Mirage, an anti-adversarial copy-trading intelligence system for BNB Chain / Four.meme.
Your job: reason about token safety, creator history, and tokenomics signals.
You MUST cite evidence. Every claim must reference a block number, tx hash, or wallet address from the provided evidence pool.
Return ONLY a JSON object with this shape:
{"score": <0-100 trust score>, "findings": ["<claim 1>", "<claim 2>", ...], "citations": [{"claim": "<claim>", "block_number": <int|null>, "tx_hash": "<str|null>", "wallet_address": "<str|null>"}]}
Lower score = more adversarial. Higher score = safer / more alpha-like."""

WALLET_SYSTEM = """You are the Wallet Agent in Mirage. Reason about wallet funding sources, cluster behavior, and co-buyer overlap.
Flag bundle bots (high bundle coefficient), funding ancestors shared with known adversarial wallets, and low cross-token alpha variance.
Every claim must cite a block, tx hash, or wallet address. Return the same JSON shape as other agents."""

TIMING_SYSTEM = """You are the Timing Agent in Mirage. Reason about block-timing entropy and transaction cadence.
Low timing entropy = bot-like regularity. Coordinated same-block buys = bundle behavior.
Every claim must cite a block number. Return the same JSON shape as other agents."""

AGGREGATOR_SYSTEM = """You are the Trust Verdict Engine. Given three agent analyses, produce:
1. A final verdict: COPY (safe to copy-trade), AVOID (adversarial signals), or UNCERTAIN (mixed/insufficient).
2. A composite Trust Score 0-100.
3. A counter-argument: one sentence describing what would need to be true to invalidate this verdict.

Return ONLY JSON: {"verdict": "COPY|AVOID|UNCERTAIN", "trust_score": <0-100>, "counter_argument": "<str>"}"""


def _parse_json_safely(text: str) -> Dict[str, Any]:
    """Extract a JSON object from LLM output, tolerating code fences or prose."""
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fence:
        text = fence.group(1)
    else:
        brace = re.search(r"\{.*\}", text, re.DOTALL)
        if brace:
            text = brace.group(0)
    return json.loads(text)


def _validate_citations(findings: List[str], citations: List[Dict], evidence_pool: Dict) -> List[Dict]:
    """Drop citations that reference block numbers or tx hashes not in the evidence pool."""
    valid_blocks = set(evidence_pool.get("block_numbers", []))
    valid_hashes = set(evidence_pool.get("tx_hashes", []))
    valid_wallets = set(evidence_pool.get("wallets", []))

    cleaned = []
    for c in citations:
        block_ok = c.get("block_number") is None or c["block_number"] in valid_blocks
        hash_ok = c.get("tx_hash") is None or c["tx_hash"] in valid_hashes
        wallet_ok = c.get("wallet_address") is None or c["wallet_address"] in valid_wallets
        if block_ok and hash_ok and wallet_ok:
            cleaned.append(c)
    return cleaned


class MirageReasoner:
    def __init__(self):
        self.llm = ChatOpenAI(
            model="deepseek-chat",
            api_key=os.getenv("DEEPSEEK_API_KEY"),
            base_url="https://api.deepseek.com",
            temperature=0.1,
        )
        self.workflow = StateGraph(AgentState)
        self.workflow.add_node("coin_agent", self.coin_agent)
        self.workflow.add_node("wallet_agent", self.wallet_agent)
        self.workflow.add_node("timing_agent", self.timing_agent)
        self.workflow.add_node("aggregator", self.aggregator)
        self.workflow.set_entry_point("coin_agent")
        self.workflow.add_edge("coin_agent", "wallet_agent")
        self.workflow.add_edge("wallet_agent", "timing_agent")
        self.workflow.add_edge("timing_agent", "aggregator")
        self.workflow.add_edge("aggregator", END)
        self.app = self.workflow.compile()

    async def _run_agent(self, state: AgentState, system_prompt: str, agent_name: str) -> AgentOutput:
        user_msg = (
            f"Wallet: {state['wallet_address']}\n"
            f"Token: {state.get('token_address') or 'n/a'}\n"
            f"Structured features: {json.dumps(state['features'])}\n"
            f"Evidence pool (cite only from these):\n"
            f"  block_numbers: {state['evidence_pool'].get('block_numbers', [])[:20]}\n"
            f"  tx_hashes: {state['evidence_pool'].get('tx_hashes', [])[:20]}\n"
            f"  wallets: {state['evidence_pool'].get('wallets', [])[:20]}"
        )
        resp = await self.llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_msg),
        ])
        try:
            parsed = _parse_json_safely(resp.content)
            parsed["citations"] = _validate_citations(
                parsed.get("findings", []),
                parsed.get("citations", []),
                state["evidence_pool"],
            )
            return AgentOutput(agent=agent_name, **parsed)
        except (json.JSONDecodeError, KeyError, ValueError):
            return AgentOutput(
                agent=agent_name,
                score=50,
                findings=[f"Agent output unparseable: {resp.content[:200]}"],
                citations=[],
            )

    async def coin_agent(self, state: AgentState):
        out = await self._run_agent(state, COIN_SYSTEM, "coin")
        return {"coin_output": out}

    async def wallet_agent(self, state: AgentState):
        out = await self._run_agent(state, WALLET_SYSTEM, "wallet")
        return {"wallet_output": out}

    async def timing_agent(self, state: AgentState):
        out = await self._run_agent(state, TIMING_SYSTEM, "timing")
        return {"timing_output": out}

    async def aggregator(self, state: AgentState):
        coin = state["coin_output"]
        wallet = state["wallet_output"]
        timing = state["timing_output"]

        summary = {
            "coin": {"score": coin.score, "findings": coin.findings},
            "wallet": {"score": wallet.score, "findings": wallet.findings},
            "timing": {"score": timing.score, "findings": timing.findings},
        }
        user_msg = f"Agent analyses:\n{json.dumps(summary, indent=2)}"
        resp = await self.llm.ainvoke([
            SystemMessage(content=AGGREGATOR_SYSTEM),
            HumanMessage(content=user_msg),
        ])

        verdict = "UNCERTAIN"
        trust_score = round((coin.score + wallet.score + timing.score) / 3)
        counter_argument = ""
        try:
            parsed = _parse_json_safely(resp.content)
            verdict = parsed.get("verdict", verdict).upper()
            if verdict not in ("COPY", "AVOID", "UNCERTAIN"):
                verdict = "UNCERTAIN"
            trust_score = int(parsed.get("trust_score", trust_score))
            trust_score = max(0, min(100, trust_score))
            counter_argument = parsed.get("counter_argument", "")
        except (json.JSONDecodeError, ValueError, KeyError):
            pass

        trace = [
            {"agent": "coin", "score": coin.score, "findings": coin.findings, "citations": [c.model_dump() for c in coin.citations]},
            {"agent": "wallet", "score": wallet.score, "findings": wallet.findings, "citations": [c.model_dump() for c in wallet.citations]},
            {"agent": "timing", "score": timing.score, "findings": timing.findings, "citations": [c.model_dump() for c in timing.citations]},
        ]

        return {
            "final_verdict": verdict,
            "trust_score": trust_score,
            "counter_argument": counter_argument,
            "reasoning_trace": trace,
        }
