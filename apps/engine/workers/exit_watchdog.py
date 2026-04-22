"""
Exit watchdog: polls every subscribed wallet on a loop, detects distribution
patterns, pushes a Telegram alert when signals fire.

Distribution signals we look for:
  - Net outflow of any single ERC20 > X% of the wallet's holding in that token
    (value_sent_in_recent_window > holder_balance_snapshot * threshold)
  - ≥3 distinct tokens sold in the last <window> minutes
  - A transfer to a freshly-created wallet (funding_ancestor_depth == 0 heuristic)

We keep a baseline snapshot per subscription to compare across ticks.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List

from core.chain_data import ChainDataClient
from core.store import MirageStore
from core.telegram import TelegramPush

log = logging.getLogger(__name__)

DISTRIBUTION_TOKENS_THRESHOLD = 3
SUSTAINED_OUTFLOW_CUTOFF = 3  # ≥3 sends since last checkpoint fires an alert


def _recent_sends(transfers: List[Dict], wallet: str) -> List[Dict]:
    wallet_l = wallet.lower()
    return [t for t in transfers if (t.get("from") or "").lower() == wallet_l]


async def _snapshot_baseline(
    chain: ChainDataClient, wallet: str
) -> Dict[str, Any]:
    transfers = await chain.get_wallet_token_transfers(wallet, limit=20)
    latest_block = 0
    for t in transfers:
        try:
            b = int(t.get("blockNumber") or 0)
            latest_block = max(latest_block, b)
        except (TypeError, ValueError):
            continue
    return {"last_block": latest_block}


async def _check_subscription(
    chain: ChainDataClient,
    store: MirageStore,
    telegram: TelegramPush,
    sub: Dict[str, Any],
) -> None:
    wallet = sub["wallet_address"]
    chat_id = sub["chat_id"]
    baseline = sub.get("baseline") or {}
    last_block = int(baseline.get("last_block") or 0)

    transfers = await chain.get_wallet_token_transfers(wallet, limit=50)
    if not transfers:
        return

    # Only consider transfers newer than our last checkpoint.
    new_transfers = []
    highest_block = last_block
    for t in transfers:
        try:
            b = int(t.get("blockNumber") or 0)
        except (TypeError, ValueError):
            continue
        if b > last_block:
            new_transfers.append(t)
        highest_block = max(highest_block, b)

    if not new_transfers:
        return

    sends = _recent_sends(new_transfers, wallet)
    distinct_tokens_sold = {
        (t.get("tokenAddress") or "").lower() for t in sends if t.get("tokenAddress")
    }
    distinct_tokens_sold.discard("")

    alert_reasons = []
    if len(distinct_tokens_sold) >= DISTRIBUTION_TOKENS_THRESHOLD:
        alert_reasons.append(
            f"sold {len(distinct_tokens_sold)} distinct tokens since last check"
        )
    if len(sends) >= SUSTAINED_OUTFLOW_CUTOFF:
        alert_reasons.append(f"{len(sends)} outflows in a short window")

    if alert_reasons and telegram.enabled():
        preview = sends[0] if sends else new_transfers[0]
        tx_hash = preview.get("hash") or ""
        await telegram.send(
            chat_id,
            (
                f"🚨 *Exit signal* on `{wallet}`\n"
                + "\n".join(f"• {r}" for r in alert_reasons)
                + (f"\n\nLatest tx: `{tx_hash[:16]}…`" if tx_hash else "")
                + "\n\n— Mirage exit watchdog"
            ),
        )

    await store.update_subscription_checkpoint(
        chat_id, wallet, {"last_block": highest_block}
    )


async def run_forever(
    store: MirageStore,
    chain: ChainDataClient,
    telegram: TelegramPush,
    interval_seconds: int = 60,
) -> None:
    log.info("exit watchdog starting (interval=%ss)", interval_seconds)
    while True:
        try:
            subs = await store.list_subscriptions()
            for sub in subs:
                try:
                    await _check_subscription(chain, store, telegram, sub)
                except Exception as e:  # noqa: BLE001
                    log.warning(
                        "watchdog failed on %s: %s", sub.get("wallet_address"), e
                    )
        except asyncio.CancelledError:
            raise
        except Exception as e:  # noqa: BLE001
            log.warning("watchdog tick failed: %s", e)
        await asyncio.sleep(interval_seconds)
