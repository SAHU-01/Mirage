from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class Transaction(BaseModel):
    hash: str
    from_address: str
    to_address: str
    value: float
    block_number: int
    timestamp: datetime
    token_address: Optional[str] = None

class WalletFeatures(BaseModel):
    wallet_address: str
    bundle_coefficient: float
    co_buyer_jaccard: float
    timing_entropy: float
    cross_token_variance: float
    last_updated: datetime
