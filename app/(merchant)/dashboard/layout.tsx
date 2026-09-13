"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Database,
  Gauge,
  Gift,
  Table2,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: Gauge },
  { href: "/dashboard/transactions", label: "Transactions", icon: Table2 },
  { href: "/dashboard/rewards", label: "Rewards & config", icon: Gift },
  { href: "/dashboard/exceptions", label: "Exceptions", icon: AlertTriangle },
  { href: "/dashboard/data", label: "Data map", icon: Database },
];

/**
 * United's internal ops/finance tool. Neutral grey — deliberately not
 * customer-branded. ClarityPay wordmark allowed here (B2B surface).
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-[calc(100vh-32px)] bg-slate-100">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-200 bg-white p-4 sm:flex">
        <p className="text-sm font-bold text-slate-800">United Loyalty Financing</p>
        <p className="mb-6 text-[10px] text-slate-400">
          Merchant portal · <span className="font-semibold">ClarityPay</span>
        </p>
        <nav className="space-y-1" aria-label="Dashboard">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                pathname === href
                  ? "bg-slate-900 font-semibold text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon size={15} aria-hidden /> {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        {/* Mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 sm:hidden" aria-label="Dashboard sections">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${
                pathname === href ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
