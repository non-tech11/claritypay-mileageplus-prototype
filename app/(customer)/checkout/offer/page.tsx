"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { loadDraft, saveDraft, type BookingDraft } from "@/lib/booking";
import { postJson, useApi } from "@/lib/api-client";
import { useTheme } from "@/app/theme-context";
import { usePersona } from "@/lib/use-persona";
import { tierForProgress } from "@/lib/theme";
import {
  MILES_TIMING_BASE,
  MILES_TIMING_BONUS,
  MILES_TIMING_REVERSAL,
} from "@/lib/copy";
import { LoyaltyCard } from "@/components/LoyaltyCard";
import { PrototypeNotes } from "@/components/PrototypeNotes";
import { ErrorRetry } from "@/components/ErrorRetry";

interface PlanMilesLine {
  planId: string;
  apr: number;
  recommended: boolean;
  bonus: number;
  financingTotal: number;
}
interface PreviewResponse {
  totalBase: number;
  perPlan: PlanMilesLine[];
}

export default function OfferPage() {
  const router = useRouter();
  const theme = useTheme();
  const persona = usePersona();
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [planId, setPlanId] = useState<string>("");
  const [autopay, setAutopay] = useState(true);
  const [timingOpen, setTimingOpen] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = loadDraft();
    if (!d.offerId || !d.fare) {
      router.replace("/checkout");
      return;
    }
    setDraft(d);
    // Carry the plan picked in the cart sheet, but only if the approved
    // offer actually includes it (near-prime ladders are shorter).
    const carried = d.plans.some((p) => p.id === d.selectedPlanId)
      ? d.selectedPlanId
      : null;
    setPlanId(
      carried ??
        d.plans.find((p) => p.recommended)?.id ??
        d.plans[0]?.id ??
        ""
    );
  }, [router]);

  const multiplier = draft && draft.travellers.length > 1 ? 2 : 1;
  const total = draft?.fare ? Number((draft.fare.total * multiplier).toFixed(2)) : 0;
  const preview = useApi<PreviewResponse>(
    draft?.fare
      ? `/api/loyalty/preview?amount=${total}&fare=${draft.fare.fare * multiplier}&travellers=${multiplier}&fareTier=${draft.fare.id}`
      : null
  );

  if (!draft?.fare) return null;
  const nearPrime = persona.creditProfile === "near-prime";

  const signAndBook = async () => {
    setSigning(true);
    setError(null);
    try {
      const sel = await postJson<{ loanId: string }>("/api/checkout/select-plan", {
        offerId: draft.offerId,
        planId,
        autopay,
      });
      const signed = await postJson<{ pnr: string }>("/api/checkout/sign", {
        loanId: sel.loanId,
      });
      saveDraft({ loanId: sel.loanId, pnr: signed.pnr, selectedPlanId: planId, autopay });
      router.push("/confirmation");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSigning(false);
    }
  };

  const base = preview.data?.totalBase ?? 0;
  const chosenMiles = preview.data?.perPlan.find((x) => x.planId === planId);
  const bonus = chosenMiles?.bonus ?? 0;

  return (
    <div className="flex min-h-full flex-col">
      <section
        aria-label="Approval"
        className="mb-4 overflow-hidden rounded-2xl p-4 text-center text-white shadow-md"
        style={{
          background:
            "linear-gradient(135deg, #047857 0%, #059669 55%, #10b981 100%)",
        }}
      >
        <span className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
          <BadgeCheck size={28} aria-hidden />
        </span>
        <h1 className="text-lg font-black tracking-tight">
          You&apos;re approved, {persona.name}!
        </h1>
        <p className="mt-0.5 text-2xl font-black">${total.toFixed(2)}</p>
        <p className="text-[11px] opacity-90">
          available for this trip · soft check only, your credit score is untouched
        </p>
      </section>
      <h2 className="mb-3 text-base font-bold">Choose your plan</h2>
      {nearPrime && (
        <p className="mb-2 rounded-lg bg-slate-100 px-3 py-2 text-[11px] text-slate-600">
          Based on your profile, shorter terms are available. APRs shown are
          exact — no surprises at signing.
        </p>
      )}

      <div className="space-y-2" role="radiogroup" aria-label="Payment plans">
        {draft.plans.map((p) => {
          const miles = preview.data?.perPlan.find((x) => x.planId === p.id);
          return (
            <button
              key={p.id}
              role="radio"
              aria-checked={planId === p.id}
              onClick={() => setPlanId(p.id)}
              className={`relative flex w-full items-center justify-between rounded-xl border bg-white px-3 py-3 text-left transition ${
                planId === p.id ? "border-2" : "border-slate-200"
              } ${p.recommended ? "mt-2" : ""}`}
              style={planId === p.id ? { borderColor: "var(--brand)" } : undefined}
            >
              {p.recommended && (
                <span
                  className="absolute -top-2 left-3 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-900"
                  style={{ background: "var(--accent)" }}
                >
                  Recommended
                </span>
              )}
              <div>
                <p className="text-sm font-bold">
                  ${p.installmentAmount.toFixed(2)}
                  <span className="font-normal text-slate-500">
                    {p.intervalDays === 14 ? " / 2 wks" : " / mo"}
                  </span>
                </p>
                <p className="text-[11px] text-slate-500">
                  {p.label} · {p.apr}% APR · ${p.totalCost.toFixed(2)} total
                </p>
              </div>
              <span className="flex flex-col items-end gap-1">
                {miles && (
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: miles.financingTotal > 0 ? "var(--brand)" : "#94a3b8" }}
                  >
                    {miles.financingTotal > 0
                      ? `+${miles.financingTotal.toLocaleString()} ${theme.unit}`
                      : `no extra ${theme.unit}`}
                  </span>
                )}
                {planId === p.id && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                    style={{ background: "var(--brand)" }}
                  >
                    Selected
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3">
        {preview.error ? (
          <ErrorRetry message={preview.error} onRetry={preview.retry} />
        ) : (
          <LoyaltyCard
            variant="compact"
            tierName={tierForProgress(theme, persona.tierProgress).name}
            balance={persona.milesBalance}
            pendingLine={
              preview.data
                ? bonus > 0
                  ? `You'll earn ${base.toLocaleString()} base + ${bonus.toLocaleString()} bonus = ${(base + bonus).toLocaleString()} ${theme.unit}`
                  : `You'll earn ${base.toLocaleString()} base ${theme.unit} — this 0% plan adds no bonus`
                : "Calculating your earn…"
            }
          />
        )}
        <button
          className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold underline"
          style={{ color: "var(--brand)" }}
          onClick={() => setTimingOpen((o) => !o)}
          aria-expanded={timingOpen}
        >
          When do I get these?
          {timingOpen ? <ChevronUp size={12} aria-hidden /> : <ChevronDown size={12} aria-hidden />}
        </button>
        {timingOpen && (
          <ul className="mt-1 space-y-1 rounded-lg bg-slate-100 px-3 py-2 text-[11px] text-slate-600">
            <li>· {MILES_TIMING_BASE}</li>
            <li>· {MILES_TIMING_BONUS}</li>
            <li>· {MILES_TIMING_REVERSAL}</li>
          </ul>
        )}
      </div>

      <label className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3">
        <span className="text-sm font-medium">
          Autopay
          <span className="block text-[11px] font-normal text-slate-500">
            On-time payments protect your bonus {theme.unit}
          </span>
        </span>
        <input
          type="checkbox"
          checked={autopay}
          onChange={(e) => setAutopay(e.target.checked)}
          aria-label="Autopay"
        />
      </label>

      {error && (
        <div className="mt-3">
          <ErrorRetry message={error} onRetry={signAndBook} />
        </div>
      )}
      <button
        className="btn-primary mt-4 flex items-center justify-center gap-2"
        onClick={signAndBook}
        disabled={signing || !planId}
      >
        {signing && <Loader2 size={14} className="animate-spin" aria-hidden />}
        {signing ? "Booking…" : "Sign and book"}
      </button>
      <PrototypeNotes screen="offer" />
    </div>
  );
}
