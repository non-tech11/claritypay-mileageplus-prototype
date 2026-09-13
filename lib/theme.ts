import type { ThemeConfig } from "./types";

export const THEMES: Record<string, ThemeConfig> = {
  united: {
    merchantId: "united",
    airlineName: "United Airlines",
    programName: "MileagePlus",
    unit: "miles",
    logoText: "UNITED",
    colors: {
      brand: "#0033A0",
      brandDark: "#002244",
      accent: "#B39B6D",
    },
    tiers: [
      { name: "Member", threshold: 0 },
      { name: "Premier Silver", threshold: 4000 },
      { name: "Premier Gold", threshold: 8000 },
      { name: "Premier Platinum", threshold: 12000 },
      { name: "Premier 1K", threshold: 18000 },
    ],
    qualifyingLabel: "PQP",
  },
  "demo-retailer": {
    merchantId: "demo-retailer",
    airlineName: "Northline",
    programName: "Northline Rewards",
    unit: "points",
    logoText: "NORTHLINE",
    colors: {
      brand: "#0F766E",
      brandDark: "#134E4A",
      accent: "#D97706",
    },
    tiers: [
      { name: "Bronze", threshold: 0 },
      { name: "Silver", threshold: 2500 },
      { name: "Gold", threshold: 7500 },
    ],
    qualifyingLabel: "points",
  },
};

export function getTheme(merchant?: string | null): ThemeConfig {
  return THEMES[merchant ?? "united"] ?? THEMES.united;
}

/** Tier for a given qualifying progress, per the active theme's ladder. */
export function tierForProgress(theme: ThemeConfig, progress: number) {
  return (
    [...theme.tiers].reverse().find((t) => progress >= t.threshold) ??
    theme.tiers[0]
  );
}

/** Next tier above the given progress, or null at the top. */
export function nextTierFor(theme: ThemeConfig, progress: number) {
  return theme.tiers.find((t) => t.threshold > progress) ?? null;
}

/** One-line nudge under the loyalty card top row, theme-aware. */
export function tierNudge(theme: ThemeConfig, progress: number): string {
  const current = tierForProgress(theme, progress);
  const next = nextTierFor(theme, progress);
  if (theme.merchantId === "united") {
    return `Fly 3 more segments or earn $1,240 more ${theme.qualifyingLabel} to keep ${current.name}`;
  }
  return next
    ? `Earn ${(next.threshold - progress).toLocaleString()} more ${theme.qualifyingLabel} to reach ${next.name}`
    : `You've reached ${current.name} — the top tier`;
}
