"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useApi } from "@/lib/api-client";
import { usePersona } from "@/lib/use-persona";
import { useTheme } from "@/app/theme-context";
import { tierForProgress, tierNudge } from "@/lib/theme";
import { LoyaltyCard } from "@/components/LoyaltyCard";
import { MilesPill } from "@/components/MilesPill";
import { PrototypeNotes } from "@/components/PrototypeNotes";
import { CardSkeleton } from "@/components/Skeleton";
import { ErrorRetry } from "@/components/ErrorRetry";
import type { Loan } from "@/lib/types";

const STATUS_LABEL: Record<Loan["status"], { text: string; cls: string }> = {
  active: { text: "On track", cls: "text-emerald-700 bg-emerald-50 border-emerald-300" },
  paid_off: { text: "Paid off", cls: "text-slate-600 bg-slate-100 border-slate-300" },
  cancelled: { text: "Cancelled", cls: "text-slate-600 bg-slate-100 border-slate-300" },
  delinquent: { text: "Payment overdue", cls: "text-red-700 bg-red-50 border-red-300" },
};

export default function AccountPage() {
  const persona = usePersona();
  const theme = useTheme();
  const { data, loading, error, retry } = useApi<{ loans: Loan[] }>("/api/loans");

  return (
    <div className="flex min-h-full flex-col">
      <h1 className="mb-3 text-base font-bold">My trips &amp; payments</h1>

      <div className="mb-4">
        <LoyaltyCard
          variant="full"
          tierName={tierForProgress(theme, persona.tierProgress).name}
          balance={persona.milesBalance}
          progress={persona.tierProgress}
          nudge={tierNudge(theme, persona.tierProgress)}
          pendingLine={`1,860 ${theme.unit} pending — post after travel on Oct 12`}
          ctaLabel="Redeem"
        />
      </div>

      {/* Scenario guide so the servicing edge cases are discoverable. */}
      <div className="mb-3 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Prototype: servicing scenarios
        </p>
        <ul className="mt-1 space-y-0.5 text-[11px] text-slate-500">
          <li>
            · <Link href="/account/LN-1001" className="underline" style={{ color: "var(--brand)" }}>On-track loan</Link>{" "}
            — healthy schedule, bonus pending until the plan completes
          </li>
          <li>
            · <Link href="/account/LN-1002" className="underline" style={{ color: "var(--brand)" }}>Cancelled &amp; refunded</Link>{" "}
            — refund to original method, miles reversed
          </li>
          <li>
            · <Link href="/account/LN-1003" className="underline" style={{ color: "var(--brand)" }}>Delinquent (32 DPD)</Link>{" "}
            — late fee, bonus held; base untouched
          </li>
          <li className="text-slate-400">
            Every loan page has a simulator: cancellation, partial refund,
            redeemed-then-cancelled, missed payments, reward failure.
          </li>
        </ul>
      </div>

      {error ? (
        <ErrorRetry message={error} onRetry={retry} />
      ) : loading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : !data || data.loans.length === 0 ? (
        <p className="card text-xs text-slate-500">
          No financed trips for {persona.name} yet. Book one from the home
          screen, or switch persona in the toolbar.
        </p>
      ) : (
        <ul className="space-y-3">
          {data.loans.map((loan) => {
            const st = STATUS_LABEL[loan.status];
            const nextDue = loan.schedule.find(
              (s) => s.status === "due" || s.status === "late"
            );
            const bonus = loan.ledger.find((e) => e.type === "bonus_earn");
            return (
              <li key={loan.id}>
                <Link href={`/account/${loan.id}`} className="card flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold">
                        {loan.trip.origin} → {loan.trip.destination}
                      </p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${st.cls}`}>
                        {st.text}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {loan.pnr} · {loan.plan.label}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {loan.status === "cancelled"
                        ? `Refunded $${(loan.refundedToOriginalMethod ?? 0).toFixed(2)} to original method`
                        : nextDue
                          ? `Next: $${nextDue.amount.toFixed(2)} on ${nextDue.dueDate}`
                          : "Nothing due"}
                    </p>
                    {bonus && (
                      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                        Bonus {theme.unit}: <MilesPill status={bonus.status} />
                      </p>
                    )}
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-slate-400" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <PrototypeNotes screen="account" />
    </div>
  );
}
