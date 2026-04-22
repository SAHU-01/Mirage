"""
Outcome resolver: walks unresolved verdicts that are at least RESOLVE_AFTER old
and checks what actually happened on-chain. For tokens, we compare the token's
bundle contamination and supply distribution now vs. when the verdict was
emitted. For wallets, we check whether the wallet dumped its early holdings.

This turns Mirage from "LLM vibes" into a feedback-looped product. The
collected (verdict, outcome) pairs are the defensible dataset.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import timedelta
from typing import Any, Dict

from core.chain_data import ChainDataClient
from core.store import MirageStore

log = logging.getLogger(__name__)

RESOLVE_AFTER = timedelta(hours=24)
RESOLVE_BATCH = 50


async def _resolve_token(
    chain: ChainDataClient,
    verdict: Dict[str, Any],
) -> tuple[str, Dict[str, Any]]:
    """Return (outcome, evidence) for a token verdict."""
    addr = verdict["address"]
    features = verdict.get("features", {}) or {}
    original_contamination = features.get("bundle_contamination_pct", 0.0)

    transfers = await chain.get_token_transfers(addr, limit=100)
    if not transfers:
        return "unknown", {"reason": "no recent transfers observed"}

    # Signals:
    #   - near-zero active holders beyond the first wave → dumped
    #   - all supply concentrated in one wallet → rugged / distribution
    #   - continued broad distribution with many unique recipients → graduated
    unique_recipients = {(t.get("to") or "").lower() for t in transfers}
    unique_recipients.discard("")
    unique_recipients.discard("0x0000000000000000000000000000000000000000")

    if len(unique_recipients) < 5:
        return "rugged", {
            "unique_recipients_observed": len(unique_recipients),
            "original_bundle_contamination_pct": original_contamination,
        }
    if len(unique_recipients) < 20 and original_contamination > 40:
        return "dumped", {
            "unique_recipients_observed": len(unique_recipients),
            "original_bundle_contamination_pct": original_contamination,
        }
    return "graduated", {"unique_recipients_observed": len(unique_recipients)}


async def _resolve_wallet(
    chain: ChainDataClient,
    verdict: Dict[str, Any],
) -> tuple[str, Dict[str, Any]]:
    addr = verdict["address"]
    original_distinct_tokens = (verdict.get("features") or {}).get("distinct_tokens_traded", 0)

    transfers = await chain.get_wallet_token_transfers(addr, limit=100)
    if not transfers:
        return "unknown", {"reason": "no recent transfers observed"}

    # Signals:
    #   - Tokens traded grew substantially → still active (dumped = moving on)
    #   - Same tokens still held → held
    current_tokens = {
        (t.get("tokenAddress") or "").lower()
        for t in transfers
        if t.get("tokenAddress")
    }
    current_tokens.discard("")

    if len(current_tokens) > original_distinct_tokens + 3:
        return "dumped", {
            "original_distinct_tokens": original_distinct_tokens,
            "current_distinct_tokens": len(current_tokens),
        }
    if len(current_tokens) == original_distinct_tokens:
        return "held", {"distinct_tokens": len(current_tokens)}
    return "graduated", {
        "original_distinct_tokens": original_distinct_tokens,
        "current_distinct_tokens": len(current_tokens),
    }


async def resolve_pending(
    store: MirageStore,
    chain: ChainDataClient,
    limit: int = RESOLVE_BATCH,
) -> int:
    """Run one pass over unresolved verdicts older than RESOLVE_AFTER. Returns
    the count of verdicts it resolved."""
    if not store.enabled() or not chain.enabled():
        return 0
    pending = await store.list_verdicts(
        resolved=False, limit=limit, older_than=RESOLVE_AFTER
    )
    resolved_count = 0
    for v in pending:
        try:
            if v["kind"] == "token":
                outcome, evidence = await _resolve_token(chain, v)
            elif v["kind"] == "wallet":
                outcome, evidence = await _resolve_wallet(chain, v)
            else:
                continue
            await store.record_outcome(v["verdict_id"], outcome, evidence)
            resolved_count += 1
        except Exception as e:  # noqa: BLE001
            log.warning("resolver failed on %s: %s", v.get("verdict_id"), e)
    return resolved_count


async def run_forever(
    store: MirageStore,
    chain: ChainDataClient,
    interval_seconds: int = 60 * 30,  # every 30 min
) -> None:
    log.info("outcome resolver starting (interval=%ss)", interval_seconds)
    while True:
        try:
            n = await resolve_pending(store, chain)
            if n:
                log.info("outcome resolver resolved %d verdicts", n)
        except asyncio.CancelledError:
            raise
        except Exception as e:  # noqa: BLE001
            log.warning("resolver tick failed: %s", e)
        await asyncio.sleep(interval_seconds)
