"use client";

import { useState } from "react";
import { Calculator, X } from "lucide-react";
import { useTheme } from "@/app/theme-context";
import { useApi } from "@/lib/api-client";
import { CardSkeleton } from "./Skeleton";
import { ErrorRetry } from "./ErrorRetry";
import { buildPlans } from "@/lib/engine/loan";
import { BONUS_FARE_TIER } from "@/lib/engine/loyalty";

export interface PlanMilesLine {
  planId: string;
  label: string;
  apr: number;
  recommended: boolean;
  bonus: number;
  financingTotal: number;
}

interface PreviewResponse {
  totalBase: number;
  perPlan: PlanMilesLine[];
  note: string;
}

/** Illustrative value of one mile/point, for the benefit calculator. */
const MILE_VALUE_CENTS = 1.3;

/**
 * "Pay over time" bottom sheet: plans with per-plan financing miles.
 * 0% APR earns none (the subsidy is the incentive); APR plans earn miles
 * back by fare tier; Economy Plus adds the flat bonus. One plan is
 * recommended. A calculator at the bottom shows cost vs miles value.
 */
export function PlanSheet({
  amount,
  fare,
  fareId,
  travellers,
  onClose,
  selectedPlanId,
  onSelect,
}: {
  amount: number;
  fare: number;
  fareId: string;
  travellers: number;
  onClose: () => void;
  selectedPlanId?: string | null;
  onSelect?: (planId: string) => void;
}) {
  const theme = useTheme();
  const preview = useApi<PreviewResponse>(
    `/api/loyalty/preview?amount=${amount}&fare=${fare}&travellers=${travellers}&fareTier=${fareId}`
  );
  const plans = buildPlans(amount, "prime");
  const [picked, setPicked] = useState<string | null>(
    selectedPlanId ?? plans.find((p) => p.recommended)?.id ?? null
  );

  const perPlan = (id: string) =>
    preview.data?.perPlan.find((p) => p.planId === id) ?? null;
  const pickedPlan = picked ? plans.find((p) => p.id === picked) : null;
  const pickedMiles = picked ? perPlan(picked) : null;
  // Bonus labels only on the fare that actually bonuses — on other fares
  // every row would read the same and just add noise.
  const bonusFare = fareId === BONUS_FARE_TIER;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label={`Pay over time with ${theme.programName}`}
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-[430px] overflow-y-auto rounded-t-2xl bg-white p-4 pb-6"
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
        ) : preview.loading || !preview.data ? (
          <CardSkeleton lines={4} />
        ) : (
          <>
            <div className="space-y-2" role="radiogroup" aria-label="Payment plans">
              {plans.map((p) => {
                const isSelected = picked === p.id;
                const miles = perPlan(p.id);
                return (
                  <button
                    key={p.id}
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setPicked(p.id)}
                    className={`relative flex w-full items-center justify-between rounded-xl border bg-white px-3 py-2.5 text-left transition ${
                      isSelected ? "border-2" : "border-slate-200"
                    } ${p.recommended ? "mt-2" : ""}`}
                    style={isSelected ? { borderColor: "var(--brand)" } : undefined}
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
                    <span className="flex flex-col items-end gap-1">
                      {miles && bonusFare && (
                        <span
                          className="text-right text-[11px] font-semibold"
                          style={{ color: miles.financingTotal > 0 ? "var(--brand)" : "#94a3b8" }}
                          title={
                            miles.financingTotal > 0
                              ? undefined
                              : `Bonus ${theme.unit} come with monthly plans — you still earn ${(preview.data?.totalBase ?? 0).toLocaleString()} ${theme.unit}`
                          }
                        >
                          {miles.financingTotal > 0
                            ? `+${miles.financingTotal.toLocaleString()} bonus ${theme.unit}`
                            : `no bonus ${theme.unit}`}
                        </span>
                      )}
                      {isSelected && (
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
            {/* Compact benefit strip for the picked plan */}
            {pickedPlan && pickedMiles && (
              <section
                aria-label="Benefit calculator"
                className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5"
              >
                {(() => {
                  const cost = Math.max(pickedPlan.totalCost - amount, 0);
                  const totalMiles =
                    (preview.data?.totalBase ?? 0) + pickedMiles.financingTotal;
                  const value = (totalMiles * MILE_VALUE_CENTS) / 100;
                  const max = Math.max(cost, value, 1);
                  const bar = (v: number) => `${Math.max((v / max) * 100, 2)}%`;
                  return (
                    <div className="text-[11px] text-slate-600">
                      <p className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <Calculator size={12} aria-hidden />
                        Costs ${cost.toFixed(2)} · earns{" "}
                        {totalMiles.toLocaleString()} {theme.unit}
                        <span style={{ color: "var(--brand)" }}>
                          ≈ ${value.toFixed(2)}
                        </span>
                      </p>
                      <div className="mt-1.5 space-y-1">
                        <div className="h-1.5 rounded-full bg-slate-200">
                          <div
                            className="h-1.5 rounded-full bg-slate-500"
                            style={{ width: bar(cost) }}
                          />
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-200">
                          <div
                            className="h-1.5 rounded-full"
                            style={{ width: bar(value), background: "var(--brand)" }}
                          />
                        </div>
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400">
                        At {MILE_VALUE_CENTS}¢/{theme.unit.replace(/s$/, "")},
                        illustrative.
                      </p>
                    </div>
                  );
                })()}
              </section>
            )}

            {onSelect && (
              <button
                className="btn-primary mt-3"
                disabled={!picked}
                onClick={() => picked && onSelect(picked)}
              >
                Continue with this plan
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
