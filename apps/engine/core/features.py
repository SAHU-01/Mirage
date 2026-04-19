import math
from typing import List, Dict
from datetime import datetime

class FeatureExtractor:
    @staticmethod
    def calculate_bundle_coefficient(transactions: List[Dict]) -> float:
        """
        Detects if transactions happened in the same block or very close blocks.
        """
        if not transactions:
            return 0.0
        
        block_counts = {}
        for tx in transactions:
            block = tx.get("blockNumber")
            block_counts[block] = block_counts.get(block, 0) + 1
        
        # Simple heuristic: ratio of txs in blocks with more than 1 tx
        bundled_txs = sum(count for count in block_counts.values() if count > 1)
        return bundled_txs / len(transactions)

    @staticmethod
    def calculate_timing_entropy(timestamps: List[int]) -> float:
        """
        Measures the randomness of transaction timing.
        Low entropy suggests bot-like regularity.
        """
        if len(timestamps) < 2:
            return 1.0
        
        intervals = []
        for i in range(1, len(timestamps)):
            intervals.append(abs(timestamps[i] - timestamps[i-1]))
        
        # Calculate Shannon entropy on intervals
        if not intervals:
            return 1.0
            
        unique_intervals = set(intervals)
        entropy = 0.0
        for val in unique_intervals:
            p = intervals.count(val) / len(intervals)
            entropy -= p * math.log2(p)
            
        return entropy

    @staticmethod
    def calculate_co_buyer_jaccard(wallets_a: List[str], wallets_b: List[str]) -> float:
        """
        Measures the overlap between two sets of buyers.
        """
        set_a = set(wallets_a)
        set_b = set(wallets_b)
        
        intersection = len(set_a.intersection(set_b))
        union = len(set_a.union(set_b))
        
        if union == 0:
            return 0.0
        return intersection / union
