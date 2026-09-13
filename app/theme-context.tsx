"use client";

import { createContext, useContext } from "react";
import { THEMES } from "@/lib/theme";
import type { ThemeConfig } from "@/lib/types";

const ThemeContext = createContext<ThemeConfig>(THEMES.united);

export function ThemeProvider({
  theme,
  children,
}: {
  theme: ThemeConfig;
  children: React.ReactNode;
}) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeConfig {
  return useContext(ThemeContext);
}
