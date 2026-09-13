"use client";

import Link from "next/link";
import { CircleUserRound } from "lucide-react";
import { useTheme } from "@/app/theme-context";
import { useScopeToast } from "./Toast";

/** Merchant-branded header inside the phone frame. Says United, not ClarityPay. */
export function BrandHeader() {
  const theme = useTheme();
  const scopeToast = useScopeToast();
  return (
    <header
      className="flex items-center justify-between px-4 py-3 text-white"
      style={{ background: "var(--brand)" }}
    >
      <Link href="/" className="text-lg font-black tracking-tight">
        {theme.logoText}
        <span className="ml-1 align-super text-[8px] font-semibold opacity-70">
          {theme.merchantId === "united" ? "™" : ""}
        </span>
      </Link>
      <div className="flex items-center gap-3 text-xs">
        <Link href="/account" className="font-medium hover:underline">
          My trips
        </Link>
        <button aria-label="Account" onClick={scopeToast}>
          <CircleUserRound size={20} aria-hidden />
        </button>
      </div>
    </header>
  );
}
