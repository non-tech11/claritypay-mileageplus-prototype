"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, Lock } from "lucide-react";
import { loadDraft, saveDraft, type BookingDraft } from "@/lib/booking";
import { postJson, useApi } from "@/lib/api-client";
import { STATEMENT_FOOTER } from "@/lib/copy";
import { ClarityPayMark } from "@/components/ClarityPayMark";
import { PrototypeNotes } from "@/components/PrototypeNotes";
import { ErrorRetry } from "@/components/ErrorRetry";
import { CardSkeleton } from "@/components/Skeleton";
import type { Loan } from "@/lib/types";

/**
 * Down-payment step for a pay-in-4 plan. The loan already exists (terms
 * were accepted on the offer screen) but nothing has been charged: this
 * screen confirms the card, and signing is what actually collects.
 */
export default function PayPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = loadDraft();
    if (!d.loanId) {
      router.replace("/checkout");
      return;
    }
    setDraft(d);
  }, [router]);

  const loanReq = useApi<Loan>(draft?.loanId ? `/api/loans/${draft.loanId}` : null);
  const loan = loanReq.data;

  // A zero-down plan has nothing to collect here.
  useEffect(() => {
    if (loan && !loan.plan.dueAtSigning) router.replace("/confirmation");
  }, [loan, router]);

  const payAndBook = async () => {
    if (!draft?.loanId) return;
    setPaying(true);
    setError(null);
    try {
      const signed = await postJson<{ pnr: string }>("/api/checkout/sign", {
        loanId: draft.loanId,
      });
      saveDraft({ pnr: signed.pnr });
      router.push("/confirmation");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPaying(false);
    }
  };

  if (!draft) return null;
  if (loanReq.error) {
    return (
      <div className="flex min-h-full flex-col">
        <ErrorRetry message={loanReq.error} onRetry={loanReq.retry} />
      </div>
    );
  }
  if (!loan) {
    return (
      <div className="flex min-h-full flex-col">
        <CardSkeleton />
      </div>
    );
  }

  const dueToday = loan.schedule[0]?.amount ?? 0;
  const remaining = loan.schedule.slice(1);

  return (
    <div className="flex min-h-full flex-col" data-spec="PayPage|app/(customer)/checkout/pay/page.tsx|Down-payment step: pay-in-4 only. Loan exists, nothing charged until sign.">
      <h1 className="mb-1 text-base font-bold">Confirm your payment</h1>
      <p className="mb-3 text-xs text-slate-500">
        {loan.plan.label} · {loan.trip.origin} → {loan.trip.destination}
      </p>

      <section
        className="mb-3 rounded-2xl p-4 text-white"
        style={{ background: "var(--brand)" }}
        data-spec="Due-today summary|app/(customer)/checkout/pay/page.tsx|Amount collected now, read from schedule[0]."
      >
        <p className="text-[11px] uppercase tracking-wider opacity-80">Due today</p>
        <p className="text-3xl font-black">${dueToday.toFixed(2)}</p>
        <p className="mt-0.5 text-[11px] opacity-90">
          {remaining.length} further payments of $
          {remaining[0]?.amount.toFixed(2)} every 2 weeks
        </p>
      </section>

      <section
        className="card mb-3"
        data-spec="Payment method|app/(customer)/checkout/pay/page.tsx|Card on file. Real build: tokenised PAN via processor iframe — never touches this app."
      >
        <h2 className="text-sm font-bold">Pay with</h2>
        <div
          className="mt-2 flex items-center gap-3 rounded-xl border-2 px-3 py-3"
          style={{ borderColor: "var(--brand)" }}
        >
          <CreditCard size={18} aria-hidden />
          <span className="flex-1 text-sm font-medium">
            Card ending 4482
            <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
              Visa · expires 04/29
            </span>
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
            style={{ background: "var(--brand)" }}
          >
            Selected
          </span>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
          <Lock size={11} aria-hidden />
          This card is charged today and for each remaining payment.
        </p>
      </section>

      <section
        className="card mb-3"
        data-spec="Schedule preview|app/(customer)/checkout/pay/page.tsx|Remaining instalments from the loan schedule, dated from booking."
      >
        <h2 className="mb-2 text-sm font-bold">Your payments</h2>
        <ol className="space-y-1.5">
          <li className="flex justify-between text-xs">
            <span className="font-semibold">Today</span>
            <span className="font-semibold">${dueToday.toFixed(2)}</span>
          </li>
          {remaining.map((s) => (
            <li key={s.idx} className="flex justify-between text-xs text-slate-500">
              <span>{s.dueDate}</span>
              <span>${s.amount.toFixed(2)}</span>
            </li>
          ))}
        </ol>
      </section>

      {error && (
        <div className="mb-3">
          <ErrorRetry message={error} onRetry={payAndBook} />
        </div>
      )}

      <button
        className="btn-primary flex items-center justify-center gap-2"
        onClick={payAndBook}
        disabled={paying}
        data-spec="Collect CTA|app/(customer)/checkout/pay/page.tsx|POST /api/checkout/sign — the only point money moves."
      >
        {paying && <Loader2 size={14} className="animate-spin" aria-hidden />}
        {paying ? "Processing…" : `Pay $${dueToday.toFixed(2)} and book`}
      </button>
      <p className="mt-2 text-center text-[10px] text-slate-400">
        <ClarityPayMark muted /> {STATEMENT_FOOTER}
      </p>
      <PrototypeNotes screen="pay" />
    </div>
  );
}
