import asyncio
import logging
import os
from datetime import datetime
from typing import Dict, List, Optional

import httpx
from dotenv import load_dotenv

load_dotenv()
log = logging.getLogger(__name__)

MORALIS_BASE = "https://deep-index.moralis.io/api/v2.2"
BSC_CHAIN = "bsc"


def _iso_to_unix(ts: Optional[str]) -> int:
    if not ts:
        return 0
    try:
        return int(datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp())
    except (ValueError, TypeError):
        return 0


def _normalize_transfer(t: Dict) -> Dict:
    """Normalize a Moralis transfer record into the shape FeatureExtractor expects."""
    return {
        "blockNumber": t.get("block_number") or "0",
        "hash": t.get("transaction_hash") or "",
        "from": (t.get("from_address") or "").lower(),
        "to": (t.get("to_address") or "").lower(),
        "value": t.get("value") or "0",
        "timeStamp": str(_iso_to_unix(t.get("block_timestamp"))),
        "tokenAddress": (t.get("address") or "").lower(),
        "tokenSymbol": t.get("token_symbol") or "",
    }


class ChainDataClient:
    """
    Moralis-backed BSC chain data client.

    Free tier at https://admin.moralis.com gives 40k compute units/day — plenty
    for hackathon usage. Every request is resilient: when the key is missing or
    Moralis is unreachable, methods return empty results so the rest of the
    engine can still respond (agents reason with whatever they got).
    """

    def __init__(self) -> None:
        self.api_key = os.getenv("MORALIS_API_KEY")
        self._client: Optional[httpx.AsyncClient] = None
        if not self.api_key:
            log.warning(
                "MORALIS_API_KEY not set — on-chain data will be empty. "
                "Get a free key at https://admin.moralis.com"
            )

    def enabled(self) -> bool:
        return bool(self.api_key)

    async def _get(self, path: str, params: Optional[Dict] = None) -> Dict:
        if not self.api_key:
            return {}
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=30.0,
                headers={"X-API-Key": self.api_key, "accept": "application/json"},
            )
        try:
            resp = await self._client.get(f"{MORALIS_BASE}{path}", params=params or {})
            if resp.status_code >= 400:
                log.warning("Moralis %s returned %s: %s", path, resp.status_code, resp.text[:200])
                return {}
            return resp.json()
        except httpx.HTTPError as e:
            log.warning("Moralis HTTP error on %s: %s", path, e)
            return {}

    async def get_wallet_token_transfers(self, wallet: str, limit: int = 100) -> List[Dict]:
        limit = min(limit, 100)  # Moralis free tier caps page size at 100
        data = await self._get(
            f"/{wallet}/erc20/transfers",
            {"chain": BSC_CHAIN, "limit": limit, "order": "DESC"},
        )
        return [_normalize_transfer(t) for t in (data.get("result") or [])]

    async def get_wallet_history(self, wallet: str, limit: int = 100) -> List[Dict]:
        limit = min(limit, 100)
        data = await self._get(
            f"/wallets/{wallet}/history",
            {"chain": BSC_CHAIN, "limit": limit, "order": "DESC"},
        )
        out: List[Dict] = []
        for t in data.get("result") or []:
            out.append({
                "blockNumber": t.get("block_number") or "0",
                "hash": t.get("hash") or "",
                "from": (t.get("from_address") or "").lower(),
                "to": (t.get("to_address") or "").lower(),
                "value": t.get("value") or "0",
                "timeStamp": str(_iso_to_unix(t.get("block_timestamp"))),
            })
        return out

    async def get_wallet_stats(self, wallet: str) -> Dict:
        return await self._get(f"/wallets/{wallet}/stats", {"chain": BSC_CHAIN})

    async def get_token_metadata(self, token: str) -> Dict:
        data = await self._get(
            "/erc20/metadata",
            {"chain": BSC_CHAIN, "addresses[]": token},
        )
        if isinstance(data, list) and data:
            return data[0]
        return {}

    async def is_erc20_contract(self, address: str) -> bool:
        """True if Moralis knows this address as a real ERC-20 token contract.
        Moralis returns decimals='0' and empty name/symbol for regular wallets,
        so we require a non-empty name or symbol to confirm it's a token."""
        meta = await self.get_token_metadata(address)
        if not meta or meta.get("decimals") is None:
            return False
        name = (meta.get("name") or "").strip()
        symbol = (meta.get("symbol") or "").strip()
        total_supply = meta.get("total_supply")
        # A real token has a name or symbol or total_supply
        return bool(name or symbol or total_supply)

    async def get_token_transfers(self, token: str, limit: int = 100) -> List[Dict]:
        limit = min(limit, 100)  # Moralis free tier caps page size at 100
        data = await self._get(
            f"/erc20/{token}/transfers",
            {"chain": BSC_CHAIN, "limit": limit, "order": "ASC"},
        )
        return [_normalize_transfer(t) for t in (data.get("result") or [])]

    async def get_early_buyers(self, token: str, window_minutes: int = 8) -> List[Dict]:
        """Transfers in the first N minutes after this token's earliest observed transfer.
        Returns one record per distinct recipient (the 'buyer')."""
        transfers = await self.get_token_transfers(token)
        if not transfers:
            return []
        try:
            first_ts = int(transfers[0].get("timeStamp") or 0)
        except (TypeError, ValueError):
            return []
        cutoff = first_ts + window_minutes * 60
        seen = set()
        buyers: List[Dict] = []
        for t in transfers:
            try:
                ts = int(t.get("timeStamp") or 0)
            except (TypeError, ValueError):
                continue
            if ts > cutoff:
                break
            buyer = (t.get("to") or "").lower()
            if not buyer or buyer in seen or buyer == "0x0000000000000000000000000000000000000000":
                continue
            seen.add(buyer)
            buyers.append(t)
        return buyers

    async def get_wallet_transactions(self, wallet: str, start_block: int = 0) -> List[Dict]:
        """Legacy-named method kept for compatibility with main.py.
        Merges native tx history with ERC20 transfers so feature extraction sees
        both trading and funding flows."""
        history_task = self.get_wallet_history(wallet)
        transfers_task = self.get_wallet_token_transfers(wallet)
        history, transfers = await asyncio.gather(history_task, transfers_task)
        combined = history + transfers
        combined.sort(key=lambda x: int(x.get("timeStamp") or 0), reverse=True)
        return combined

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None
