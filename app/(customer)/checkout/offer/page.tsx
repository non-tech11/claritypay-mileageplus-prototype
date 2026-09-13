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

interface PreviewResponse {
  totalBase: number;
  totalBonus: number;
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
    setPlanId(d.selectedPlanId ?? d.plans[Math.min(1, d.plans.length - 1)]?.id ?? d.plans[0]?.id ?? "");
  }, [router]);

  const multiplier = draft && draft.travellers.length > 1 ? 2 : 1;
  const total = draft?.fare ? Number((draft.fare.total * multiplier).toFixed(2)) : 0;
  const preview = useApi<PreviewResponse>(
    draft?.fare
      ? `/api/loyalty/preview?amount=${total}&fare=${draft.fare.fare * multiplier}&travellers=${multiplier}`
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
  const bonus = preview.data?.totalBonus ?? 0;

  return (
    <div className="flex min-h-full flex-col">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
        <BadgeCheck size={14} aria-hidden /> You&apos;re approved for ${total.toFixed(2)}
      </p>
      <h1 className="mb-3 text-base font-bold">Choose your plan</h1>
      {nearPrime && (
        <p className="mb-2 rounded-lg bg-slate-100 px-3 py-2 text-[11px] text-slate-600">
          Based on your profile, shorter terms are available. APRs shown are
          exact — no surprises at signing.
        </p>
      )}

      <div className="space-y-2" role="radiogroup" aria-label="Payment plans">
        {draft.plans.map((p) => (
          <button
            key={p.id}
            role="radio"
            aria-checked={planId === p.id}
            onClick={() => setPlanId(p.id)}
            className={`flex w-full items-center justify-between rounded-xl border bg-white px-3 py-3 text-left transition ${
              planId === p.id ? "border-2" : "border-slate-200"
            }`}
            style={planId === p.id ? { borderColor: "var(--brand)" } : undefined}
          >
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
            {planId === p.id && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                style={{ background: "var(--brand)" }}
              >
                Selected
              </span>
            )}
          </button>
        ))}
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
                ? `You'll earn ${base.toLocaleString()} base + ${bonus.toLocaleString()} pay-over-time bonus = ${(base + bonus).toLocaleString()} ${theme.unit}`
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
