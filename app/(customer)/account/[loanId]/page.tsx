"use client";

import { use, useState } from "react";
import { CalendarClock, FileText, FlaskConical, Loader2 } from "lucide-react";
import { postJson, useApi } from "@/lib/api-client";
import { useTheme } from "@/app/theme-context";
import { LATE_FEE_DISCLOSURE, STATEMENT_FOOTER } from "@/lib/copy";
import { MilesPill } from "@/components/MilesPill";
import { ClarityPayMark } from "@/components/ClarityPayMark";
import { PrototypeNotes } from "@/components/PrototypeNotes";
import { CardSkeleton } from "@/components/Skeleton";
import { ErrorRetry } from "@/components/ErrorRetry";
import { useScopeToast, useToast } from "@/components/Toast";
import type { Loan } from "@/lib/types";

const INSTALMENT_STYLE: Record<string, string> = {
  paid: "text-emerald-700",
  due: "text-slate-600",
  late: "text-red-700 font-semibold",
  cancelled: "text-slate-400 line-through",
  refunded: "text-blue-700",
};

const SCENARIOS: { id: string; label: string }[] = [
  { id: "full_cancellation", label: "Full cancellation before travel" },
  { id: "partial_refund", label: "Partial refund (1 of 2 travellers)" },
  { id: "miles_redeemed_then_cancel", label: "Miles redeemed, then cancel" },
  { id: "missed_payment", label: "Missed instalment (30 → 60 DPD)" },
  { id: "reward_failed", label: "Reward posting failed" },
];

export default function LoanDetailPage({
  params,
}: {
  params: Promise<{ loanId: string }>;
}) {
  const { loanId } = use(params);
  const theme = useTheme();
  const toast = useToast();
  const scopeToast = useScopeToast();
  const { data: loan, loading, error, retry } = useApi<Loan>(`/api/loans/${loanId}`);
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (key: string, fn: () => Promise<{ message?: string } | unknown>) => {
    setBusy(key);
    try {
      const res = (await fn()) as { message?: string };
      toast(res.message ?? "Done");
      retry();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (error) return <ErrorRetry message={error} onRetry={retry} />;
  if (loading || !loan)
    return (
      <div className="space-y-3">
        <CardSkeleton />
        <CardSkeleton lines={5} />
      </div>
    );

  const openInstalment = loan.schedule.find(
    (s) => s.status === "late" || s.status === "due"
  );

  return (
    <div className="flex min-h-full flex-col">
      <h1 className="text-base font-bold">
        {loan.trip.origin} → {loan.trip.destination}
        <span className="ml-2 text-xs font-normal text-slate-500">{loan.pnr}</span>
      </h1>
      <p className="mb-3 text-[11px] text-slate-500">
        {loan.plan.label} · ${loan.principal.toFixed(2)} financed ·{" "}
        {loan.status === "delinquent"
          ? `${loan.dpd} days past due`
          : loan.status.replace("_", " ")}
      </p>

      {loan.status === "delinquent" && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800">
          A payment is overdue{loan.lateFee > 0 ? ` — late fee $${loan.lateFee.toFixed(2)} applied` : ""}.{" "}
          {LATE_FEE_DISCLOSURE}
        </p>
      )}

      {/* Actions */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <button
          className="btn-primary !px-2 !py-2 text-xs"
          disabled={!openInstalment || busy !== null}
          onClick={() =>
            act("pay", () => postJson(`/api/loans/${loan.id}/pay`, {}))
          }
        >
          {busy === "pay" ? <Loader2 size={13} className="mx-auto animate-spin" aria-hidden /> : "Pay now"}
        </button>
        <button className="btn-secondary !px-2 !py-2 text-xs" onClick={scopeToast}>
          Change date
        </button>
        <button
          className="btn-secondary !px-2 !py-2 text-xs"
          disabled={loan.status === "cancelled" || busy !== null}
          onClick={() =>
            act("cancel", () =>
              postJson(`/api/loans/${loan.id}/cancel`, { scope: "full", travellerIds: [] })
            )
          }
        >
          Cancel trip
        </button>
      </div>

      {/* Schedule */}
      <section className="card mb-3">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold">
          <CalendarClock size={14} aria-hidden /> Payment schedule
        </h2>
        <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
          {loan.schedule.map((s) => (
            <li key={s.idx} className="flex justify-between">
              <span className={INSTALMENT_STYLE[s.status]}>
                {s.dueDate} — ${s.amount.toFixed(2)}
              </span>
              <span className={INSTALMENT_STYLE[s.status]}>{s.status}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Miles ledger */}
      <section className="card mb-3">
        <h2 className="mb-2 text-sm font-bold">
          {theme.programName} {theme.unit} ledger
        </h2>
        <ul className="space-y-2">
          {loan.ledger.map((e) => (
            <li key={e.id} className="text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className={e.amount < 0 ? "font-semibold text-red-700" : "font-semibold"}>
                  {e.amount > 0 ? "+" : ""}
                  {e.amount.toLocaleString()} {theme.unit}
                  <span className="ml-1 font-normal text-slate-500">
                    · {e.type.replace(/_/g, " ")} · {e.travellerName}
                  </span>
                </span>
                <MilesPill status={e.status} />
              </div>
              <p className="mt-0.5 text-[10px] text-slate-400">{e.reason}</p>
            </li>
          ))}
          {loan.ledger.length === 0 && (
            <li className="text-xs text-slate-400">No miles activity yet.</li>
          )}
        </ul>
      </section>

      {/* Documents */}
      <section className="card mb-4">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold">
          <FileText size={14} aria-hidden /> Documents
        </h2>
        <ul className="space-y-1.5 text-xs">
          {loan.documents.map((d) => (
            <li key={d.id}>
              <button className="underline" style={{ color: "var(--brand)" }} onClick={scopeToast}>
                {d.title}
              </button>
              {d.note && <span className="ml-1 text-slate-400">— {d.note}</span>}
            </li>
          ))}
        </ul>
        <p className="mt-2 flex items-center gap-1 text-[9px] text-slate-400">
          {STATEMENT_FOOTER} <ClarityPayMark muted />
        </p>
      </section>

      {/* Edge-case simulator */}
      <section className="card border-dashed border-slate-400 bg-slate-50">
        <h2 className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
          <FlaskConical size={13} aria-hidden /> Prototype: simulate scenario
        </h2>
        <p className="mb-2 text-[10px] text-slate-400">
          Not part of the customer product — exercises the servicing edge
          cases. Effects appear above and in the United dashboard.
        </p>
        <div className="grid grid-cols-1 gap-1.5">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-[11px] font-medium hover:bg-slate-100 disabled:opacity-40"
              disabled={busy !== null}
              onClick={() =>
                act(s.id, () =>
                  postJson(`/api/loans/${loan.id}/simulate`, { scenario: s.id })
                )
              }
            >
              {busy === s.id ? "Running…" : s.label}
            </button>
          ))}
          <button
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-[11px] font-medium hover:bg-slate-100 disabled:opacity-40"
            disabled={busy !== null}
            onClick={() => act("reset", () => postJson("/api/reset"))}
          >
            Reset to seed
          </button>
        </div>
      </section>
      <PrototypeNotes screen="loan" />
    </div>
  );
}
