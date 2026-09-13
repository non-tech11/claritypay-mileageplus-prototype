"use client";

import { X } from "lucide-react";
import { useTheme } from "@/app/theme-context";
import { useApi } from "@/lib/api-client";
import { CardSkeleton } from "./Skeleton";
import { ErrorRetry } from "./ErrorRetry";
import { buildPlans } from "@/lib/engine/loan";

interface PreviewResponse {
  totalBase: number;
  totalBonus: number;
  note: string;
}

/**
 * "Pay over time with MileagePlus" bottom sheet: three illustrative plans
 * with the SAME miles on each — we do not reward longer terms, and the
 * sheet says so explicitly.
 */
export function PlanSheet({
  amount,
  fare,
  travellers,
  onClose,
}: {
  amount: number;
  fare: number;
  travellers: number;
  onClose: () => void;
}) {
  const theme = useTheme();
  const preview = useApi<PreviewResponse>(
    `/api/loyalty/preview?amount=${amount}&fare=${fare}&travellers=${travellers}`
  );
  // Illustrative pre-eligibility plans (prime ladder); real terms come
  // from prequal at checkout.
  const plans = buildPlans(amount, "prime");
  const miles = preview.data
    ? preview.data.totalBase + preview.data.totalBonus
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label={`Pay over time with ${theme.programName}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] rounded-t-2xl bg-white p-4 pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">
            Pay over time with {theme.programName}
          </h2>
          <button aria-label="Close" onClick={onClose}>
            <X size={18} aria-hidden />
          </button>
        </div>
        {preview.error ? (
          <ErrorRetry message={preview.error} onRetry={preview.retry} />
        ) : preview.loading ? (
          <CardSkeleton lines={4} />
        ) : (
          <>
            <div className="space-y-2">
              {plans.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      ${p.installmentAmount.toFixed(2)}
                      <span className="font-normal text-slate-500">
                        {p.intervalDays === 14 ? " / 2 wks" : " / mo"}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {p.label} · {p.apr}% APR · ${p.totalCost.toFixed(2)} total
                    </p>
                  </div>
                  {miles !== null && (
                    <p
                      className="text-right text-[11px] font-semibold"
                      style={{ color: "var(--brand)" }}
                    >
                      {miles.toLocaleString()} {theme.unit}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-[11px] text-slate-600">
              {theme.unit.charAt(0).toUpperCase() + theme.unit.slice(1)} are the
              same on every plan — choosing a longer term never earns more.
            </p>
            <p className="mt-2 text-[10px] text-slate-400">
              Illustrative plans. Final terms shown after a soft eligibility
              check at payment.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
