import logging
import os
from typing import List, Dict, Optional

import httpx
from dotenv import load_dotenv

load_dotenv()
log = logging.getLogger(__name__)

# Etherscan consolidated V2 API. BSC = chainid 56.
# Note: free-tier Etherscan keys only cover Ethereum mainnet; paid plans unlock BSC.
ETHERSCAN_V2_URL = "https://api.etherscan.io/v2/api"
BSC_CHAIN_ID = 56


class BscScanClient:
    def __init__(self) -> None:
        self.api_key = os.getenv("BSCSCAN_API_KEY") or os.getenv("ETHERSCAN_API_KEY")
        self._client: Optional[httpx.AsyncClient] = None

    async def _get(self, params: Dict) -> List[Dict]:
        merged = {"chainid": BSC_CHAIN_ID, "apikey": self.api_key, **params}
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=20.0)
        try:
            resp = await self._client.get(ETHERSCAN_V2_URL, params=merged)
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPError as e:
            log.warning("Etherscan HTTP error: %s", e)
            return []

        result = data.get("result")
        if data.get("status") == "1" and isinstance(result, list):
            return result
        # Etherscan returns status="0" with result as a string (error message) on
        # rate limits, plan issues, or empty history. Normalize to empty list.
        if isinstance(result, str):
            log.warning("Etherscan returned error: %s", result[:160])
        return []

    async def get_wallet_transactions(self, wallet_address: str, start_block: int = 0) -> List[Dict]:
        return await self._get({
            "module": "account",
            "action": "txlist",
            "address": wallet_address,
            "startblock": start_block,
            "endblock": 99999999,
            "page": 1,
            "offset": 200,
            "sort": "desc",
        })

    async def get_token_transfers_for_wallet(self, wallet_address: str) -> List[Dict]:
        return await self._get({
            "module": "account",
            "action": "tokentx",
            "address": wallet_address,
            "startblock": 0,
            "endblock": 99999999,
            "page": 1,
            "offset": 200,
            "sort": "desc",
        })

    async def get_token_transactions(self, token_address: str, start_block: int = 0) -> List[Dict]:
        return await self._get({
            "module": "account",
            "action": "tokentx",
            "contractaddress": token_address,
            "startblock": start_block,
            "endblock": 99999999,
            "page": 1,
            "offset": 500,
            "sort": "asc",
        })

    async def get_early_buyers(
        self,
        token_address: str,
        window_minutes: int = 8,
    ) -> List[Dict]:
        """Buyers in the first N minutes after the token's first observed transfer."""
        txs = await self.get_token_transactions(token_address)
        if not txs:
            return []
        try:
            first_ts = int(txs[0].get("timeStamp", 0))
        except (TypeError, ValueError):
            return []
        cutoff = first_ts + window_minutes * 60
        seen = set()
        buyers: List[Dict] = []
        for tx in txs:
            try:
                ts = int(tx.get("timeStamp", 0))
            except (TypeError, ValueError):
                continue
            if ts > cutoff:
                break
            buyer = (tx.get("to") or "").lower()
            if buyer and buyer not in seen:
                seen.add(buyer)
                buyers.append(tx)
        return buyers

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None
