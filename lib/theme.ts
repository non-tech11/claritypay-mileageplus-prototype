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
