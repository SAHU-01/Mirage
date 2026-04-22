export type Glossary = {
  label: string;
  explainer: string;
  good: string;
  bad: string;
  format: (v: number) => string;
};

const pct = (v: number) => `${v.toFixed(1)}%`;
const num = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2));
const dist = (v: number) => (v >= 999 ? "unlinked" : `${v} hop${v === 1 ? "" : "s"}`);

export const WALLET_GLOSSARY: Record<string, Glossary> = {
  tx_count: {
    label: "Transactions seen",
    explainer:
      "How many ERC-20 transfers Moralis returned for this wallet (capped at 100 per page on free tier).",
    good: "Many (healthy activity)",
    bad: "Zero / one (brand new or inactive)",
    format: num,
  },
  bundle_coefficient: {
    label: "Bundle coefficient",
    explainer:
      "Fraction of this wallet's transactions that share a block with another. High values mean coordinated, likely-bot buys.",
    good: "< 0.2 (organic)",
    bad: "> 0.6 (bundle-bot territory)",
    format: num,
  },
  timing_entropy: {
    label: "Timing entropy",
    explainer:
      "Shannon entropy of the gaps between this wallet's transactions. Low entropy = robotic regularity; high entropy = human-like irregular cadence.",
    good: "> 3.0 (human-like)",
    bad: "< 1.5 (bot-like)",
    format: num,
  },
  max_co_buyer_jaccard: {
    label: "Co-buyer overlap",
    explainer:
      "Largest overlap between this wallet's co-buyers across tokens. High = same cluster of wallets keeps buying together = farm.",
    good: "< 0.2",
    bad: "> 0.6",
    format: num,
  },
  graph_distance_to_adversarial: {
    label: "Hops to adversarial",
    explainer:
      "Shortest funding-graph distance to a wallet Mirage has already labeled adversarial. Needs a populated adversarial set (built over time).",
    good: "999 (unlinked)",
    bad: "≤ 2 hops",
    format: dist,
  },
  cross_token_alpha_variance: {
    label: "Cross-token PnL variance",
    explainer:
      "Variance of the wallet's returns across tokens. Genuine alpha wallets have varied outcomes; farms cluster around engineered returns.",
    good: "High",
    bad: "≈ 0 (engineered band)",
    format: num,
  },
  funding_ancestor_depth: {
    label: "Funding ancestors",
    explainer:
      "How many distinct wallets funded this address. Deeper chains are harder to trace and more common among laundering clusters.",
    good: "1–3 (CEX hot wallet)",
    bad: "Many (obfuscation)",
    format: num,
  },
  distinct_tokens_traded: {
    label: "Tokens touched",
    explainer:
      "How many distinct ERC-20 tokens appeared in this wallet's recent transfers.",
    good: "Varied",
    bad: "1–2 (farming one thing)",
    format: num,
  },
};

export const TOKEN_STATS_GLOSSARY: Record<string, Glossary> = {
  bundle_contamination_pct: {
    label: "Bundle contamination",
    explainer:
      "Share of early buyers that clustered in shared blocks. Each cluster typically = a single bundle bot buying from many wallets at once.",
    good: "< 20%",
    bad: "> 50%",
    format: pct,
  },
  graduation_probability: {
    label: "Graduation probability",
    explainer:
      "Model estimate of the token surviving long enough to graduate to a real liquidity pair. Combines trust of early buyers and bundle contamination.",
    good: "> 60%",
    bad: "< 20%",
    format: (v) => `${(v * 100).toFixed(0)}%`,
  },
};
