import type { Glossary } from "@/lib/glossary";

type Props = {
  features: Record<string, number>;
  glossary: Record<string, Glossary>;
};

export function FeatureGrid({ features, glossary }: Props) {
  const rows = Object.entries(glossary).filter(([k]) => k in features);
  if (!rows.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map(([key, g]) => {
        const raw = features[key];
        return (
          <div
            key={key}
            className="rounded-lg border border-neutral-800 bg-neutral-950 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-neutral-500">
                {g.label}
              </span>
              <span className="font-mono text-base font-semibold text-neutral-100">
                {g.format(raw)}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-neutral-400">
              {g.explainer}
            </p>
            <div className="mt-2 flex gap-3 text-[10px] uppercase tracking-wider">
              <span className="text-copy">✓ {g.good}</span>
              <span className="text-avoid">✕ {g.bad}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
