"use client";

import { ChevronRight, Clock } from "lucide-react";
import { useTheme } from "@/app/theme-context";
import { TierProgress } from "./TierProgress";
import { useScopeToast } from "./Toast";

export type LoyaltyCardVariant = "full" | "compact" | "chip";

export interface LoyaltyCardProps {
  variant: LoyaltyCardVariant;
  tierName: string;
  balance: number;
  /** Qualifying progress toward the next tier (for the bar + nudge). */
  progress?: number;
  /** e.g. "372 miles pending — post after travel on Oct 12". */
  pendingLine?: string | null;
  /** Nudge under the top row; falls back to a keep-tier line. */
  nudge?: string | null;
  ctaLabel?: string;
  onCta?: () => void;
  /** Chip-only inline text override. */
  chipText?: string;
}

/**
 * The loyalty widget — one component, entirely theme-driven, rendered at
 * three sizes across the journey (brief requirement). Swap the theme
 * config and the same component re-skins for another merchant.
 */
export function LoyaltyCard(props: LoyaltyCardProps) {
  const theme = useTheme();
  const scopeToast = useScopeToast();
  const {
    variant,
    tierName,
    balance,
    progress = 0,
    pendingLine,
    nudge,
    ctaLabel,
    onCta,
    chipText,
  } = props;

  if (variant === "chip") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
        style={{ background: "var(--brand)" }}
      >
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--accent)" }}
          aria-hidden
        />
        {chipText ?? `${tierName} · ${balance.toLocaleString()} ${theme.unit}`}
      </span>
    );
  }

  const topRow = (
    <div className="flex items-center justify-between gap-2">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest opacity-70">
          {theme.programName}
        </p>
        <p className="text-sm font-bold">
          {tierName}
          <span className="mx-1.5 font-normal opacity-50">|</span>
          {balance.toLocaleString()} {theme.unit}
        </p>
      </div>
      <ChevronRight size={16} className="opacity-60" aria-hidden />
    </div>
  );

  if (variant === "compact") {
    return (
      <div
        className="rounded-xl p-3 text-white shadow-sm"
        style={{ background: "var(--brand-dark)" }}
      >
        {topRow}
        {pendingLine && (
          <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px]">
            <Clock size={12} aria-hidden /> {pendingLine}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-4 text-white shadow-md"
      style={{
        background:
          "linear-gradient(135deg, var(--brand-dark) 0%, var(--brand) 100%)",
      }}
    >
      {topRow}
      <p className="mt-1 text-[11px] opacity-90">
        {nudge ??
          `Earn ${theme.qualifyingLabel} on every trip to keep ${tierName}`}
      </p>
      <div className="mt-3">
        <TierProgress progress={progress} />
      </div>
      {pendingLine && (
        <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px]">
          <Clock size={12} aria-hidden /> {pendingLine}
        </p>
      )}
      {ctaLabel && (
        <button
          onClick={onCta ?? scopeToast}
          className="mt-3 w-full rounded-lg py-2 text-xs font-bold text-slate-900 transition hover:opacity-90"
          style={{ background: "var(--accent)" }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
