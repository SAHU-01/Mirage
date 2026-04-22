from typing import TypedDict, List, Optional, Dict, Any  # noqa: F401
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


_AGENT_JSON_RULES = """Return ONLY a single JSON object with EXACTLY these three top-level keys, no others:
- "score": integer 0-100 (lower = more adversarial, higher = more alpha-like)
- "findings": array of 2-4 short string observations
- "citations": array of objects, each with keys {"claim": string, "block_number": integer|null, "tx_hash": string|null, "wallet_address": string|null}

Do NOT include keys like "wallet", "token", "verdict", "reasoning", or any other top-level keys.
Cite only block numbers, tx hashes, and wallet addresses that appear in the provided evidence pool.
If the evidence pool is empty, set each citation's block_number/tx_hash/wallet_address to null and still produce findings from the structured features.

Example valid output:
{"score": 22, "findings": ["High bundle coefficient (0.87) indicates coordinated same-block buys", "Timing entropy of 0.4 suggests automated cadence"], "citations": [{"claim": "High bundle coefficient", "block_number": 42891334, "tx_hash": null, "wallet_address": null}]}"""

COIN_SYSTEM = f"""You are the Coin Agent in Mirage, an anti-adversarial copy-trading intelligence system for BNB Chain / Four.meme.
Reason about token safety, creator history, and tokenomics signals.

{_AGENT_JSON_RULES}"""

WALLET_SYSTEM = f"""You are the Wallet Agent in Mirage. Reason about wallet funding sources, cluster behavior, and co-buyer overlap.
Flag bundle bots (high bundle_coefficient), shared funding ancestors with known adversarial wallets (low graph_distance_to_adversarial), and low cross_token_alpha_variance.

{_AGENT_JSON_RULES}"""

TIMING_SYSTEM = f"""You are the Timing Agent in Mirage. Reason about block-timing entropy and transaction cadence.
Low timing_entropy = bot-like regularity. Coordinated same-block buys (high bundle_coefficient) = bundle behavior.

{_AGENT_JSON_RULES}"""

AGGREGATOR_SYSTEM = """You are the Trust Verdict Engine. Given three agent analyses, produce a final verdict.

Return ONLY a single JSON object with EXACTLY these keys:
- "verdict": one of "COPY", "AVOID", "UNCERTAIN"
- "trust_score": integer 0-100
- "counter_argument": one sentence describing what would need to be true to invalidate this verdict

Do NOT add any other keys. Example:
{"verdict": "AVOID", "trust_score": 18, "counter_argument": "This verdict would flip if the same-block buys were routed through a single aggregator contract rather than coordinated wallets."}"""


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


def _validate_citations(findings: List[str], citations: Any, evidence_pool: Dict) -> List[Dict]:
    """Drop citations that reference block numbers or tx hashes not in the evidence pool.
    Tolerates LLM outputs where individual citations are strings or missing fields."""
    if not isinstance(citations, list):
        return []
    valid_blocks = set(evidence_pool.get("block_numbers", []))
    valid_hashes = set(evidence_pool.get("tx_hashes", []))
    valid_wallets = set(evidence_pool.get("wallets", []))

    cleaned: List[Dict] = []
    for c in citations:
        if not isinstance(c, dict):
            continue
        block_ok = c.get("block_number") is None or c.get("block_number") in valid_blocks
        hash_ok = c.get("tx_hash") is None or c.get("tx_hash") in valid_hashes
        wallet_ok = c.get("wallet_address") is None or c.get("wallet_address") in valid_wallets
        if block_ok and hash_ok and wallet_ok:
            cleaned.append({
                "claim": str(c.get("claim", "")),
                "block_number": c.get("block_number"),
                "tx_hash": c.get("tx_hash"),
                "wallet_address": c.get("wallet_address"),
            })
    return cleaned


class MirageReasoner:
    def __init__(self):
        self.llm = ChatOpenAI(
            model=os.getenv("LLM_MODEL", "deepseek-chat"),
            api_key=os.getenv("DEEPSEEK_API_KEY"),
            base_url=os.getenv("LLM_BASE_URL", "https://api.deepseek.com/v1"),
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
