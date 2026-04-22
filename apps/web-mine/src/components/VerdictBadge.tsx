type Verdict = "COPY" | "AVOID" | "UNCERTAIN";

const VERDICT_STYLE: Record<Verdict, string> = {
  COPY: "bg-copy/15 text-copy border-copy/40",
  AVOID: "bg-avoid/15 text-avoid border-avoid/40",
  UNCERTAIN: "bg-uncertain/15 text-uncertain border-uncertain/40",
};

const VERDICT_ICON: Record<Verdict, string> = {
  COPY: "✅",
  AVOID: "⚠️",
  UNCERTAIN: "❓",
};

export function VerdictBadge({
  verdict,
  score,
}: {
  verdict: Verdict;
  score: number;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${VERDICT_STYLE[verdict]}`}
    >
      <span>{VERDICT_ICON[verdict]}</span>
      <span>{verdict}</span>
      <span className="text-xs opacity-75">— {score}/100</span>
    </span>
  );
}
