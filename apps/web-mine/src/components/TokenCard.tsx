import type { TokenVerdict } from "@/lib/api";
import { bscscanAddress } from "@/lib/api";
import { TOKEN_STATS_GLOSSARY } from "@/lib/glossary";
import { VerdictBadge } from "./VerdictBadge";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function fmtTs(ts?: number | null) {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString();
}

export function TokenCard({ v }: { v: TokenVerdict }) {
  const name = v.metadata?.name || "Unknown token";
  const symbol = v.metadata?.symbol ? `$${v.metadata.symbol}` : "";
  const bundleStat = TOKEN_STATS_GLOSSARY.bundle_contamination_pct;
  const gradStat = TOKEN_STATS_GLOSSARY.graduation_probability;

  return (
    <div className="space-y-6 rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-neutral-500">
            Token
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className="text-xl font-semibold text-neutral-100">
              {name}
            </span>
            {symbol && (
              <span className="text-sm text-neutral-400">{symbol}</span>
            )}
            {v.metadata?.decimals != null && (
              <span className="rounded bg-neutral-800 px-2 py-0.5 text-[10px] uppercase tracking-wider text-neutral-400">
                {v.metadata.decimals} dec
              </span>
            )}
          </div>
          <a
            href={bscscanAddress(v.token_address)}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block font-mono text-xs text-neutral-500 hover:text-neutral-300"
          >
            {v.token_address} ↗
          </a>
        </div>
        <VerdictBadge verdict={v.verdict} score={v.trust_score} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ExplainedStat
          label={bundleStat.label}
          value={bundleStat.format(v.bundle_contamination_pct)}
          explainer={bundleStat.explainer}
          good={bundleStat.good}
          bad={bundleStat.bad}
        />
        <ExplainedStat
          label={gradStat.label}
          value={gradStat.format(v.graduation_probability)}
          explainer={gradStat.explainer}
          good={gradStat.good}
          bad={gradStat.bad}
        />
        <ExplainedStat
          label="Early buyers in window"
          value={`${v.total_early_buyers}`}
          explainer={`Distinct wallets that received this token within the first ${v.window_minutes} minute(s) after launch.`}
          good="Broad distribution"
          bad="< 10 wallets"
        />
        <ExplainedStat
          label="Launch window"
          value={fmtTs(v.first_tx_ts)}
          explainer="Timestamp of the earliest on-chain transfer Moralis has indexed for this contract."
          good="Recent (fresh launch)"
          bad="—"
        />
      </div>

      <div>
        <div className="mb-2 text-xs uppercase tracking-wider text-neutral-500">
          Ranked early buyers
        </div>
        <div className="overflow-hidden rounded-lg border border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 text-xs uppercase tracking-wider text-neutral-400">
              <tr>
                <th className="px-3 py-2 text-left">Wallet</th>
                <th className="px-3 py-2 text-left">Trust</th>
                <th className="px-3 py-2 text-left">Verdict</th>
                <th className="px-3 py-2 text-right">Explorer</th>
              </tr>
            </thead>
            <tbody>
              {v.ranked_buyers.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-4 text-center text-neutral-500"
                  >
                    No early buyers in this window.
                  </td>
                </tr>
              ) : (
                v.ranked_buyers.map((b) => (
                  <tr
                    key={b.wallet_address}
                    className="border-t border-neutral-800"
                  >
                    <td className="px-3 py-2 font-mono text-neutral-300">
                      {shortAddr(b.wallet_address)}
                    </td>
                    <td className="px-3 py-2 text-neutral-300">
                      {b.trust_score}/100
                    </td>
                    <td className="px-3 py-2">
                      <VerdictBadge
                        verdict={b.verdict}
                        score={b.trust_score}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <a
                        href={bscscanAddress(b.wallet_address)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-neutral-500 hover:text-neutral-200"
                      >
                        bscscan ↗
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
    </div>
  );
}

function ExplainedStat({
  label,
  value,
  explainer,
  good,
  bad,
}: {
  label: string;
  value: string;
  explainer: string;
  good: string;
  bad: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-neutral-500">
          {label}
        </span>
        <span className="font-mono text-base font-semibold text-neutral-100">
          {value}
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-neutral-400">
        {explainer}
      </p>
      <div className="mt-2 flex gap-3 text-[10px] uppercase tracking-wider">
        <span className="text-copy">✓ {good}</span>
        <span className="text-avoid">✕ {bad}</span>
      </div>
    </div>
  );
}
