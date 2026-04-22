"""
Labeler: seeds the adversarial wallet dataset from known rugs.

Strategy:
  1. For each token flagged AVOID in our verdict history that the resolver has
     since marked as "rugged" or "dumped", we treat its creator + first-50
     distinct buyers as adversarial with confidence proportional to how bad
     the outcome was.
  2. Any wallet that has been the first buyer on 3+ rugged tokens is
     promoted to confidence >= 0.9.

Run periodically (every few hours). Writes to MirageStore.label_adversarial().
"""
from __future__ import annotations

import logging
from collections import Counter

from core.chain_data import ChainDataClient
from core.store import MirageStore

log = logging.getLogger(__name__)


async def label_from_resolved_rugs(
    store: MirageStore,
    chain: ChainDataClient,
    limit: int = 100,
) -> int:
    if not store.enabled() or not chain.enabled():
        return 0

    rugs = await store.list_verdicts(kind="token", resolved=True, limit=limit)
    rugs = [v for v in rugs if v.get("final_outcome") in ("rugged", "dumped")]
    if not rugs:
        return 0

    early_buyer_counts: Counter[str] = Counter()
    labeled = 0
    for v in rugs:
        token = v["address"]
        try:
            buyers = await chain.get_early_buyers(token, window_minutes=8)
        except Exception as e:  # noqa: BLE001
            log.warning("labeler fetch failed for %s: %s", token, e)
            continue

        first_wave = []
        for b in buyers[:50]:
            addr = (b.get("to") or "").lower()
            if not addr or addr == "0x0000000000000000000000000000000000000000":
                continue
            first_wave.append(addr)
            early_buyer_counts[addr] += 1

        confidence = 0.75 if v["final_outcome"] == "rugged" else 0.5
        for addr in first_wave:
            await store.label_adversarial(
                address=addr,
                source="rug_early_buyer",
                confidence=confidence,
                evidence={"token": token, "outcome": v["final_outcome"]},
            )
            labeled += 1

    # Promote repeat offenders.
    for addr, count in early_buyer_counts.items():
        if count >= 3:
            await store.label_adversarial(
                address=addr,
                source="serial_rug_buyer",
                confidence=0.95,
                evidence={"rugs_seen": count},
            )

    return labeled
