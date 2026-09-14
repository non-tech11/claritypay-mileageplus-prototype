"use client";

import Link from "next/link";
import { Lock, LockOpen, MinusCircle } from "lucide-react";
import { useApi } from "@/lib/api-client";
import { usePersona } from "@/lib/use-persona";
import { useTheme } from "@/app/theme-context";
import { tierForProgress, tierNudge } from "@/lib/theme";
import { LoyaltyCard } from "@/components/LoyaltyCard";
import { MilesPill } from "@/components/MilesPill";
import { PrototypeNotes } from "@/components/PrototypeNotes";
import { CardSkeleton } from "@/components/Skeleton";
import { ErrorRetry } from "@/components/ErrorRetry";
import { AccountTabs } from "@/components/AccountTabs";
import type { Loan, MilesEntry } from "@/lib/types";

interface ActivityRow extends MilesEntry {
  pnr: string;
  route: string;
  travelDate: string;
  unlockHint: string;
}

function friendlyMonth(isoDate: string | undefined): string {
  if (!isoDate) return "";
  const d = new Date(`${isoDate}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function buildRows(loans: Loan[]): ActivityRow[] {
  return loans.flatMap((loan) => {
    // Concrete dates, not promises — the unlock can be months away.
    const finalPayment = loan.schedule[loan.schedule.length - 1]?.dueDate;
    return loan.ledger.map((e) => ({
      ...e,
      pnr: loan.pnr,
      route: `${loan.trip.origin} → ${loan.trip.destination}`,
      travelDate: loan.trip.travelDate,
      unlockHint:
        e.type === "base_earn"
          ? `arrives after your flight · ${friendlyMonth(loan.trip.travelDate)}`
          : e.type === "bonus_earn"
            ? `arrives after your final payment · ${friendlyMonth(finalPayment)}`
            : "",
    }));
  });
}

function Row({ row, unit }: { row: ActivityRow; unit: string }) {
  const negative = row.amount < 0;
  return (
    <li className="flex items-start justify-between gap-2 py-2">
      <div className="min-w-0">
        <p className={`text-xs font-semibold ${negative ? "text-red-700" : "text-slate-800"}`}>
          {row.amount > 0 ? "+" : ""}
          {row.amount.toLocaleString()} {unit}
          <span className="ml-1.5 font-normal text-slate-400">
            {row.route} · {row.pnr}
          </span>
        </p>
        <p className="mt-0.5 text-[10px] text-slate-400">{row.reason}</p>
      </div>
      <MilesPill status={row.status} customer />
    </li>
  );
}

/**
 * The member's miles hub — separated from trips on purpose. Trips carry
 * only an earn summary; the full ledger lives here, grouped by the
 * unlock metaphor: unlocked / unlocking soon / removed.
 */
export default function MilesPage() {
  const persona = usePersona();
  const theme = useTheme();
  const { data, loading, error, retry } = useApi<{ loans: Loan[] }>("/api/loans");

  const rows = data ? buildRows(data.loans) : [];
  const unlocked = rows.filter((r) => r.status === "posted" && r.amount > 0);
  const unlockingSoon = rows.filter(
    (r) =>
      (r.status === "pending" || r.status === "pending_retry" || r.status === "held") &&
      r.amount > 0
  );
  const removed = rows.filter((r) => r.status === "reversed" || r.amount < 0);
  const soonTotal = unlockingSoon.reduce((s, r) => s + r.amount, 0);

  const unitCap = theme.unit.charAt(0).toUpperCase() + theme.unit.slice(1);

  return (
    <div className="flex min-h-full flex-col">
      <h1 className="mb-3 text-base font-bold">
        My {theme.unit}
      </h1>
      <AccountTabs active="miles" />

      <div className="mb-4">
        <LoyaltyCard
          variant="full"
          tierName={tierForProgress(theme, persona.tierProgress).name}
          balance={persona.milesBalance}
          progress={persona.tierProgress}
          nudge={tierNudge(theme, persona.tierProgress)}
          pendingLine={
            soonTotal > 0
              ? `${soonTotal.toLocaleString()} ${theme.unit} on the way`
              : null
          }
          ctaLabel="Redeem"
        />
      </div>

      {error ? (
        <ErrorRetry message={error} onRetry={retry} />
      ) : loading || !data ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="space-y-3">
          <section className="card">
            <h2 className="flex items-center gap-1.5 text-sm font-bold">
              <Lock size={14} style={{ color: "var(--accent)" }} aria-hidden />
              On the way
              {soonTotal > 0 && (
                <span className="font-normal text-slate-400">
                  · {soonTotal.toLocaleString()} {theme.unit}
                </span>
              )}
            </h2>
            <ul className="mt-1 divide-y divide-slate-100">
              {unlockingSoon.map((r) => (
                <li key={r.id} className="py-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-800">
                      +{r.amount.toLocaleString()} {theme.unit}
                      <span className="ml-1.5 font-normal text-slate-400">
                        {r.route} · {r.pnr}
                      </span>
                    </p>
                    <MilesPill status={r.status} customer />
                  </div>
                  {r.unlockHint && (
                    <p className="mt-0.5 text-[10px] font-medium" style={{ color: "var(--brand)" }}>
                      {r.unlockHint}
                    </p>
                  )}
                </li>
              ))}
              {unlockingSoon.length === 0 && (
                <li className="py-2 text-xs text-slate-400">
                  Nothing in progress — book a trip to start earning.
                </li>
              )}
            </ul>
          </section>

          <section className="card">
            <h2 className="flex items-center gap-1.5 text-sm font-bold">
              <LockOpen size={14} className="text-emerald-600" aria-hidden />
              Unlocked
            </h2>
            <ul className="mt-1 divide-y divide-slate-100">
              {unlocked.map((r) => (
                <Row key={r.id} row={r} unit={theme.unit} />
              ))}
              {unlocked.length === 0 && (
                <li className="py-2 text-xs text-slate-400">
                  {unitCap} land here after your flight — bonus {theme.unit}{" "}
                  after your final payment.
                </li>
              )}
            </ul>
          </section>

          <section className="card">
            <h2 className="flex items-center gap-1.5 text-sm font-bold">
              <MinusCircle size={14} className="text-slate-400" aria-hidden />
              Adjustments
            </h2>
            <p className="mt-0.5 text-[10px] text-slate-400">
              Changes from cancellations, refunds and redemptions.
            </p>
            <ul className="mt-1 divide-y divide-slate-100">
              {removed.map((r) => (
                <Row key={r.id} row={r} unit={theme.unit} />
              ))}
              {removed.length === 0 && (
                <li className="py-2 text-xs text-slate-400">
                  No adjustments. Cancelling a booking takes back {theme.unit}{" "}
                  that were still on the way.
                </li>
              )}
            </ul>
          </section>

          <p className="text-[10px] text-slate-400">
            {unitCap} arrive after your flight; bonus {theme.unit} arrive
            after your final payment. Cancelling a booking takes back
            anything still on the way — never a cash charge.
          </p>
        </div>
      )}
      <Link href="/account" className="btn-secondary mt-4">
        Back to my trips
      </Link>
      <PrototypeNotes screen="miles" />
    </div>
  );
}
