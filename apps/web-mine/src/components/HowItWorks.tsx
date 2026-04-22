"use client";
import { useState } from "react";

export function HowItWorks() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-6 rounded-lg border border-neutral-800 bg-neutral-950">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-neutral-200"
      >
        <span>ℹ️ How does Mirage decide?</span>
        <span className="text-neutral-500">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-neutral-800 px-4 py-4 text-sm text-neutral-400">
          <p>
            Paste an address. Mirage auto-detects whether it&apos;s a token
            contract or a wallet, then runs three specialized AI agents:
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <span className="text-neutral-200">Coin agent</span> — reasons
              about token creator history, tokenomics, liquidity posture.
            </li>
            <li>
              <span className="text-neutral-200">Wallet agent</span> — looks
              at funding ancestors, cluster overlap, cross-token behavior.
            </li>
            <li>
              <span className="text-neutral-200">Timing agent</span> — checks
              transaction cadence for robotic regularity and same-block
              bundling.
            </li>
          </ul>
          <p>
            Each agent cites block numbers and transaction hashes from the
            actual on-chain history (hallucinated citations are rejected by a
            validator). An aggregator produces one of three verdicts:
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <span className="text-copy">✅ COPY</span> — signals look organic
              and alpha-consistent.
            </li>
            <li>
              <span className="text-uncertain">❓ UNCERTAIN</span> — mixed
              signals; not enough data or conflicting features.
            </li>
            <li>
              <span className="text-avoid">⚠️ AVOID</span> — adversarial
              signatures detected.
            </li>
          </ul>
          <p>
            Each verdict ships with a{" "}
            <span className="text-neutral-200">counter-argument</span> telling
            you what would need to be true to invalidate it — a check on the
            model&apos;s own confidence.
          </p>
          <p className="text-neutral-500">
            Data source: Moralis (BNB Chain). Reasoning: DeepSeek. Feature
            pipeline: bundle coefficient, timing entropy, co-buyer Jaccard,
            graph distance to adversarial set, cross-token alpha variance,
            funding ancestors.
          </p>
        </div>
      )}
    </div>
  );
}
