"use client";

import { useTheme } from "@/app/theme-context";

/**
 * Horizontal tier ladder: a dot per tier with its threshold underneath,
 * fill proportional to qualifying progress. Thresholds are illustrative
 * (title tooltip says so).
 */
export function TierProgress({ progress }: { progress: number }) {
  const theme = useTheme();
  const max = theme.tiers[theme.tiers.length - 1].threshold;
  const pct = Math.min((progress / max) * 100, 100);

  return (
    <div
      title={`Illustrative ${theme.qualifyingLabel} thresholds — not actual ${theme.programName} values`}
      aria-label={`Tier progress: ${progress.toLocaleString()} ${theme.qualifyingLabel}`}
    >
      <div className="relative mt-1 h-1.5 rounded-full bg-black/10">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, background: "var(--accent)" }}
        />
        {theme.tiers.map((t) => {
          const left = (t.threshold / max) * 100;
          const reached = progress >= t.threshold;
          return (
            <span
              key={t.name}
              className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 ${
                reached ? "border-transparent" : "border-white bg-black/20"
              }`}
              style={{
                left: `calc(${left}% - 6px)`,
                background: reached ? "var(--accent)" : undefined,
              }}
              aria-hidden
            />
          );
        })}
      </div>
      <div className="relative mt-2 h-7 text-[9px] leading-tight opacity-80">
        {theme.tiers.map((t, i) => {
          const left = (t.threshold / max) * 100;
          return (
            <span
              key={t.name}
              className="absolute w-14 text-center"
              style={{
                left: `calc(${left}% - 28px)`,
                textAlign: i === 0 ? "left" : i === theme.tiers.length - 1 ? "right" : "center",
                ...(i === 0 ? { left: 0 } : {}),
                ...(i === theme.tiers.length - 1 ? { left: "auto", right: 0 } : {}),
              }}
            >
              {t.name}
              <br />
              {t.threshold.toLocaleString()}
            </span>
          );
        })}
      </div>
    </div>
  );
}
