"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Plane } from "lucide-react";
import { loadDraft, type BookingDraft } from "@/lib/booking";
import { useApi } from "@/lib/api-client";
import { useTheme } from "@/app/theme-context";
import { MilesPill } from "@/components/MilesPill";
import { PrototypeNotes } from "@/components/PrototypeNotes";
import { CardSkeleton } from "@/components/Skeleton";
import { ErrorRetry } from "@/components/ErrorRetry";
import type { Loan } from "@/lib/types";

function ConfirmationInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const theme = useTheme();
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const cardFallback = searchParams.get("method") === "card";

  useEffect(() => {
    const d = loadDraft();
    if (!d.fare || (!d.loanId && !cardFallback)) {
      router.replace("/");
      return;
    }
    setDraft(d);
  }, [router, cardFallback]);

  const loanReq = useApi<Loan>(
    draft?.loanId && !cardFallback ? `/api/loans/${draft.loanId}` : null
  );

  if (!draft?.fare) return null;
  const multiplier = draft.travellers.length > 1 ? 2 : 1;
  const total = Number((draft.fare.total * multiplier).toFixed(2));
  const loan = loanReq.data;
  const pnr = loan?.pnr ?? draft.pnr ?? "K4W7RD";
  const nextDue = loan?.schedule.find((s) => s.status === "due");
  const alexNeedsNumber = draft.travellers.some(
    (t) => !t.isPayer && !t.mileagePlusNumber
  );

  return (
    <div className="flex min-h-full flex-col">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
        <CheckCircle2 size={14} aria-hidden /> Booking confirmed
      </p>
      <h1 className="mb-3 text-base font-bold">
        Confirmation <span style={{ color: "var(--brand)" }}>{pnr}</span>
      </h1>

      <section className="card mb-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Plane size={14} aria-hidden /> SFO → EWR · {draft.fare.label}
        </p>
        <p className="text-[11px] text-slate-500">
          Tue, Oct 12, 2026 · UA 1523 ·{" "}
          {draft.travellers.map((t) => t.name).join(", ") || "1 traveller"}
        </p>
        <p className="mt-1 text-[11px] text-slate-500">Paid: ${total.toFixed(2)}</p>
      </section>

      {cardFallback ? (
        <section className="card mb-3">
          <h2 className="text-sm font-bold">Payment</h2>
          <p className="mt-1 text-xs text-slate-600">
            Card ending 4482 — paid in full.
          </p>
        </section>
      ) : loanReq.error ? (
        <div className="mb-3">
          <ErrorRetry message={loanReq.error} onRetry={loanReq.retry} />
        </div>
      ) : !loan ? (
        <div className="mb-3">
          <CardSkeleton />
        </div>
      ) : (
        <section className="card mb-3">
          <h2 className="text-sm font-bold">Payment plan</h2>
          <p className="mt-1 text-xs text-slate-600">{loan.plan.label}</p>
          {nextDue && (
            <p className="text-xs text-slate-600">
              Next payment: <strong>${nextDue.amount.toFixed(2)}</strong> on{" "}
              {nextDue.dueDate}
              {loan.autopay ? " (autopay)" : ""}
            </p>
          )}
        </section>
      )}

      <section className="card mb-3">
        <h2 className="mb-2 text-sm font-bold">
          Your {theme.programName} {theme.unit}
        </h2>
        {cardFallback ? (
          <p className="text-xs text-slate-500">
            No {theme.unit} on this booking — {theme.unit} come with a{" "}
            {theme.programName} payment plan.
          </p>
        ) : loan ? (
          <ul className="space-y-2">
            {loan.ledger.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 text-xs">
                <span>
                  {e.amount.toLocaleString()}{" "}
                  {e.type === "bonus_earn"
                    ? `bonus ${theme.unit}`
                    : e.type === "miles_back_earn"
                      ? `${theme.unit} back`
                      : theme.unit}{" "}
                  — {e.travellerName}
                </span>
                <MilesPill status={e.status} />
              </li>
            ))}
          </ul>
        ) : (
          <CardSkeleton lines={2} />
        )}
        {alexNeedsNumber && (
          <p className="mt-2 rounded-lg px-3 py-2 text-[11px]" style={{ background: "color-mix(in srgb, var(--accent) 18%, white)" }}>
            Alex: add a {theme.programName} number within 30 days to receive
            these {theme.unit} (retro-credit).
          </p>
        )}
      </section>

      {!cardFallback && draft.loanId && (
        <Link href={`/account/${draft.loanId}`} className="btn-primary">
          Manage trip &amp; payments
        </Link>
      )}
      <Link href="/account" className="btn-secondary mt-2">
        My trips &amp; payments
      </Link>
      <PrototypeNotes screen="confirmation" />
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmationInner />
    </Suspense>
  );
}
