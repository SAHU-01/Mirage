import math
import statistics
from typing import List, Dict, Set, Optional
from collections import Counter


# Seed list of known-adversarial BNB wallets. Expand via ingestion in production.
KNOWN_ADVERSARIAL_WALLETS: Set[str] = {
    # placeholders; replace with labeled-dataset addresses.
}


class FeatureExtractor:
    @staticmethod
    def calculate_bundle_coefficient(transactions: List[Dict]) -> float:
        """Fraction of txs that share a block with at least one other tx in the set."""
        if not transactions:
            return 0.0
        block_counts: Counter = Counter(tx.get("blockNumber") for tx in transactions)
        bundled = sum(count for count in block_counts.values() if count > 1)
        return bundled / len(transactions)

    @staticmethod
    def calculate_timing_entropy(timestamps: List[int]) -> float:
        """Shannon entropy of inter-transaction intervals. Low entropy = bot-like regularity."""
        if len(timestamps) < 2:
            return 0.0
        intervals = [abs(timestamps[i] - timestamps[i - 1]) for i in range(1, len(timestamps))]
        if not intervals:
            return 0.0
        counts = Counter(intervals)
        total = len(intervals)
        return -sum((c / total) * math.log2(c / total) for c in counts.values())

    @staticmethod
    def calculate_co_buyer_jaccard(wallets_a: List[str], wallets_b: List[str]) -> float:
        """Jaccard overlap between two buyer sets. High = coordinated cluster."""
        set_a, set_b = set(wallets_a), set(wallets_b)
        union = len(set_a | set_b)
        return len(set_a & set_b) / union if union else 0.0

    @staticmethod
    def graph_distance_to_adversarial(
        wallet: str,
        funding_ancestors: List[str],
        known_adversarial: Optional[Set[str]] = None,
    ) -> int:
        """
        Hops from the wallet to a known-adversarial wallet via funding ancestors.
        Returns 0 if the wallet itself is adversarial, 999 if no connection found.
        """
        adversarial = known_adversarial if known_adversarial is not None else KNOWN_ADVERSARIAL_WALLETS
        if not adversarial:
            return 999
        if wallet.lower() in {a.lower() for a in adversarial}:
            return 0
        for depth, ancestor in enumerate(funding_ancestors, start=1):
            if ancestor.lower() in {a.lower() for a in adversarial}:
                return depth
        return 999

    @staticmethod
    def cross_token_alpha_variance(token_pnls: List[float]) -> float:
        """
        Variance of PnL across distinct tokens traded by the wallet.
        Genuine alpha wallets have varied outcomes; farm bots cluster around
        a narrow (often engineered) return band.
        """
        if len(token_pnls) < 2:
            return 0.0
        return statistics.pvariance(token_pnls)

    @staticmethod
    def funding_ancestor_depth(funding_chain: List[str]) -> int:
        """Length of the funding chain back to a CEX hot wallet or null source."""
        return len(funding_chain)

    @classmethod
    def extract_wallet_features(
        cls,
        transactions: List[Dict],
        funding_ancestors: Optional[List[str]] = None,
        token_pnls: Optional[List[float]] = None,
        co_buyers: Optional[List[List[str]]] = None,
        wallet_address: str = "",
    ) -> Dict:
        """Compute the full feature bundle for a wallet."""
        funding_ancestors = funding_ancestors or []
        token_pnls = token_pnls or []
        co_buyers = co_buyers or []

        timestamps = [int(tx["timeStamp"]) for tx in transactions if tx.get("timeStamp")]

        max_jaccard = 0.0
        for i in range(len(co_buyers)):
            for j in range(i + 1, len(co_buyers)):
                max_jaccard = max(
                    max_jaccard,
                    cls.calculate_co_buyer_jaccard(co_buyers[i], co_buyers[j]),
                )

        return {
            "tx_count": len(transactions),
            "bundle_coefficient": cls.calculate_bundle_coefficient(transactions),
            "timing_entropy": cls.calculate_timing_entropy(timestamps),
            "max_co_buyer_jaccard": max_jaccard,
            "graph_distance_to_adversarial": cls.graph_distance_to_adversarial(
                wallet_address, funding_ancestors
            ),
            "cross_token_alpha_variance": cls.cross_token_alpha_variance(token_pnls),
            "funding_ancestor_depth": cls.funding_ancestor_depth(funding_ancestors),
        }
