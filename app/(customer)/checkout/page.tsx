"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, ShieldCheck, Wallet } from "lucide-react";
import { loadDraft, saveDraft, type BookingDraft } from "@/lib/booking";
import { postJson, useApi } from "@/lib/api-client";
import { useTheme } from "@/app/theme-context";
import { LENDER_DISCLOSURE_POINTS, SOFT_PULL_NOTE } from "@/lib/copy";
import { ClarityPayMark } from "@/components/ClarityPayMark";
import { buildPlans } from "@/lib/engine/loan";
import { PrototypeNotes } from "@/components/PrototypeNotes";
import { ErrorRetry } from "@/components/ErrorRetry";
import { useScopeToast } from "@/components/Toast";
import type { Plan } from "@/lib/types";

interface PrequalResponse {
  decision: "approved" | "declined";
  offerId: string | null;
  plans: Plan[];
}

interface PreviewResponse {
  totalBase: number;
  maxFinancingMiles: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const theme = useTheme();
  const scopeToast = useScopeToast();
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [selected, setSelected] = useState<string>("payovertime");
  const [phone, setPhone] = useState("415-555-0134");
  const [ssn, setSsn] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthly, setMonthly] = useState<number | null>(null);
  /** Approved prequal result held back so the walker picks the next screen. */
  const [approvedResult, setApprovedResult] = useState<PrequalResponse | null>(null);

  useEffect(() => {
    const d = loadDraft();
    if (!d.fare) {
      router.replace("/");
      return;
    }
    setDraft(d);
    const multiplier = d.travellers.length > 1 ? 2 : 1;
    fetch(`/api/offers/estimate?amount=${(d.fare.total * multiplier).toFixed(2)}`)
      .then((r) => r.json())
      .then((j: { monthlyFrom?: number }) => setMonthly(j.monthlyFrom ?? null))
      .catch(() => setMonthly(null));
  }, [router]);

  const multiplier = draft && draft.travellers.length > 1 ? 2 : 1;
  const total = draft?.fare ? Number((draft.fare.total * multiplier).toFixed(2)) : 0;
  // Miles are the wallet differentiator: fetch the earn for this booking so
  // the pay-over-time row can show it next to the other providers.
  const preview = useApi<PreviewResponse>(
    draft?.fare
      ? `/api/loyalty/preview?amount=${total}&fare=${draft.fare.fare * multiplier}&travellers=${multiplier}&fareTier=${draft.fare.id}`
      : null
  );

  if (!draft?.fare) return null;
  // Label for a plan picked in the cart sheet (illustrative prime ladder;
  // real terms confirmed by the prequal).
  const selectedPlanLabel = draft.selectedPlanId
    ? buildPlans(total, "prime").find((p) => p.id === draft.selectedPlanId)?.label ?? null
    : null;

  const submitPrequal = async () => {
    const fare = draft.fare;
    if (!fare) return;
    if (!ssn || ssn.length !== 4) {
      setError("Enter the last 4 digits of your SSN");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await postJson<PrequalResponse>("/api/checkout/prequal", {
        phone,
        ssnLast4: ssn,
        amount: total,
        travellers: draft.travellers,
        trip: {
          origin: "SFO",
          destination: "EWR",
          travelDate: "2026-10-12",
          fareLabel: fare.label,
          fareId: fare.id,
          fare: fare.fare * multiplier,
          taxes: fare.taxes * multiplier,
        },
      });
      if (res.decision === "approved" && res.offerId) {
        saveDraft({ offerId: res.offerId, plans: res.plans, declined: false });
        // Hold here: the outcome panel lets the walker pick the next screen.
        setApprovedResult(res);
      } else {
        saveDraft({ declined: true, offerId: null, plans: [] });
        router.push("/checkout/declined");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const walletOption = (
    id: string,
    label: React.ReactNode,
    icon: React.ReactNode,
    onClick?: () => void
  ) => (
    <button
      key={id}
      onClick={onClick ?? (() => setSelected(id))}
      aria-pressed={selected === id}
      className={`flex w-full items-center gap-3 rounded-xl border bg-white px-3 py-3 text-left text-sm font-medium transition ${
        selected === id ? "border-2" : "border-slate-200"
      }`}
      style={selected === id ? { borderColor: "var(--brand)" } : undefined}
    >
      {icon}
      <span className="flex-1">{label}</span>
    </button>
  );

  return (
    <div className="flex min-h-full flex-col">
      <h1 className="mb-1 text-base font-bold">Payment</h1>
      <p className="mb-3 text-xs text-slate-500">
        Total due: <strong>${total.toFixed(2)}</strong>
      </p>

      {(() => {
        const noMilesNote = (
          <span className="mt-0.5 block text-[10px] font-normal text-slate-400">
            No {theme.programName} {theme.unit}
          </span>
        );
        return (
          <div className="space-y-2">
            {walletOption(
              "card",
              <span>Credit / debit card{noMilesNote}</span>,
              <CreditCard size={18} aria-hidden />,
              () => {
                setSelected("card");
                scopeToast();
              }
            )}
            {walletOption(
              "applepay",
              <span>Apple Pay{noMilesNote}</span>,
              <Wallet size={18} aria-hidden />,
              () => {
                setSelected("applepay");
                scopeToast();
              }
            )}
            {walletOption(
              "payovertime",
              <span>
                Pay over time
                {monthly !== null && (
                  <span className="text-slate-500"> · from ${monthly.toFixed(0)}/mo</span>
                )}
                <span
                  className="mt-0.5 block text-[11px] font-semibold"
                  style={{ color: "var(--brand)" }}
                >
                  {preview.data
                    ? `Earn ${preview.data.totalBase.toLocaleString()} ${theme.programName} ${theme.unit}${
                        preview.data.maxFinancingMiles > 0
                          ? ` + ${preview.data.maxFinancingMiles.toLocaleString()} bonus`
                          : ""
                      }`
                    : `Earn ${theme.programName} ${theme.unit}`}
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-[10px] font-normal text-slate-400">
                  Powered by <ClarityPayMark muted />
                </span>
              </span>,
              <ShieldCheck size={18} aria-hidden />
            )}
            {walletOption(
              "paypal",
              <span>PayPal{noMilesNote}</span>,
              <Wallet size={18} aria-hidden />,
              () => {
                setSelected("paypal");
                scopeToast();
              }
            )}
          </div>
        );
      })()}

      {selected === "payovertime" && (
        <section
          aria-label="Eligibility check"
          className="card mt-3 border-slate-300"
        >
          <h2 className="text-sm font-bold">Quick eligibility check</h2>
          <p className="mt-0.5 text-[11px] text-emerald-700">{SOFT_PULL_NOTE}</p>
          {selectedPlanLabel && (
            <p className="mt-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] text-slate-600">
              Plan chosen: <strong>{selectedPlanLabel}</strong> — confirmed
              after the eligibility check.
            </p>
          )}
          <div className="mt-3 space-y-3">
            <div>
              <label className="label" htmlFor="phone">
                Mobile number
              </label>
              <input
                id="phone"
                className="input"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="ssn4">
                Last 4 of SSN
              </label>
              <input
                id="ssn4"
                className="input"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={ssn}
                onChange={(e) => setSsn(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </div>
          {error && (
            <div className="mt-3">
              <ErrorRetry message={error} onRetry={submitPrequal} />
            </div>
          )}
          <div className="mt-3">
            <ClarityPayMark muted />
            <ul className="mt-1.5 space-y-1 text-[9px] leading-relaxed">
              {LENDER_DISCLOSURE_POINTS.map((p) => (
                <li
                  key={p.text}
                  className={`flex gap-1.5 ${
                    p.emphasis
                      ? "text-[10px] font-semibold text-emerald-700"
                      : "text-slate-400"
                  }`}
                >
                  <span aria-hidden>{p.emphasis ? "✓" : "·"}</span>
                  <span>{p.text}</span>
                </li>
              ))}
            </ul>
          </div>
          {approvedResult ? (
            <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3">
              <p className="text-sm font-bold text-emerald-800">
                ✓ You&apos;re eligible
              </p>
              <p className="mt-0.5 text-[11px] text-emerald-900">
                {approvedResult.plans.length} plan
                {approvedResult.plans.length === 1 ? "" : "s"} available for $
                {total.toFixed(2)}.
              </p>
              <button
                className="btn-primary mt-2"
                onClick={() => router.push("/checkout/offer")}
              >
                See your offer
              </button>
              <button
                className="mt-1.5 w-full rounded-lg px-3 py-1.5 text-[11px] font-medium text-slate-500 underline hover:text-slate-700"
                onClick={() => router.push("/checkout/declined")}
              >
                Prototype: preview the decline screen instead
              </button>
            </div>
          ) : (
            <button
              className="btn-primary mt-3 flex items-center justify-center gap-2"
              onClick={submitPrequal}
              disabled={submitting}
            >
              {submitting && <Loader2 size={14} className="animate-spin" aria-hidden />}
              {submitting ? "Checking eligibility…" : "Continue and agree"}
            </button>
          )}
        </section>
      )}
      <PrototypeNotes screen={selected === "payovertime" ? "prequal" : "checkout"} />
    </div>
  );
}
