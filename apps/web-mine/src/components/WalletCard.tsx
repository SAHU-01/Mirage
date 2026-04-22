import type { WalletVerdict } from "@/lib/api";
import { bscscanAddress } from "@/lib/api";
import { WALLET_GLOSSARY } from "@/lib/glossary";
import { FeatureGrid } from "./FeatureGrid";
import { ReasoningDrawer } from "./ReasoningDrawer";
import { SubscribeBox } from "./SubscribeBox";
import { VerdictBadge } from "./VerdictBadge";

export function WalletCard({ v }: { v: WalletVerdict }) {
  return (
    <div className="space-y-6 rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-neutral-500">
            Wallet
          </div>
          <a
            href={bscscanAddress(v.wallet_address)}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block font-mono text-sm text-neutral-300 hover:text-neutral-100"
          >
            {v.wallet_address} ↗
          </a>
        </div>
        <VerdictBadge verdict={v.verdict} score={v.trust_score} />
      </div>

      <div>
        <div className="mb-3 text-xs uppercase tracking-wider text-neutral-500">
          Extracted features (each explained)
        </div>
        <FeatureGrid features={v.features} glossary={WALLET_GLOSSARY} />
      </div>

      <div>
        <div className="mb-3 text-xs uppercase tracking-wider text-neutral-500">
          Agent scores
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {v.reasoning_trace.map((t) => (
            <div
              key={t.agent}
              className="rounded-lg border border-neutral-800 bg-neutral-950 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-neutral-500">
                  {t.agent}
                </span>
                <span className="font-mono text-base font-semibold text-neutral-100">
                  {t.score}/100
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-400 line-clamp-2">
                {t.findings[0] || "—"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {v.counter_argument && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
          <div className="mb-1 text-xs uppercase tracking-wider text-neutral-500">
            ⊘ Counter-argument
          </div>
          <div className="text-sm text-neutral-300">{v.counter_argument}</div>
        </div>
      )}

      <SubscribeBox wallet={v.wallet_address} />

      <ReasoningDrawer trace={v.reasoning_trace} />
    </div>
  );
}
