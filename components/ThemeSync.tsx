"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { THEMES } from "@/lib/theme";

/**
 * Reads ?theme= from the URL and persists it to a cookie so the
 * server-rendered layout re-skins on refresh. Proves the white-label
 * config: /?theme=demo-retailer swaps the whole experience.
 */
export function ThemeSync({ activeThemeId }: { activeThemeId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const requested = searchParams.get("theme");
    if (requested && THEMES[requested] && requested !== activeThemeId) {
      document.cookie = `cp_theme=${requested}; path=/; max-age=31536000`;
      router.refresh();
    }
  }, [searchParams, activeThemeId, router]);

  return null;
}
