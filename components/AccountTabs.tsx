"use client";

import Link from "next/link";
import { useTheme } from "@/app/theme-context";

/** Segmented nav between the trips list and the miles hub. */
export function AccountTabs({ active }: { active: "trips" | "miles" }) {
  const theme = useTheme();
  const tab = (href: string, key: "trips" | "miles", label: string) => (
    <Link
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={`flex-1 rounded-lg py-1.5 text-center text-xs font-semibold transition ${
        active === key ? "text-white shadow-sm" : "text-slate-600"
      }`}
      style={active === key ? { background: "var(--brand)" } : undefined}
    >
      {label}
    </Link>
  );
  return (
    <div className="mb-3 flex gap-1 rounded-xl bg-slate-200/70 p-1">
      {tab("/account", "trips", "My trips")}
      {tab("/account/miles", "miles", `My ${theme.unit}`)}
    </div>
  );
}
