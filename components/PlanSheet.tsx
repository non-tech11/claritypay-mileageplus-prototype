"use client";

import { useState } from "react";
import { Calculator, X } from "lucide-react";
import { useTheme } from "@/app/theme-context";
import { useApi } from "@/lib/api-client";
import { CardSkeleton } from "./Skeleton";
import { ErrorRetry } from "./ErrorRetry";
import { buildPlans } from "@/lib/engine/loan";

export interface PlanMilesLine {
  planId: string;
  label: string;
  apr: number;
  recommended: boolean;
  milesBack: number;
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
                      {miles && (
                        <span
                          className="text-right text-[11px] font-semibold"
                          style={{ color: miles.financingTotal > 0 ? "var(--brand)" : "#94a3b8" }}
                        >
                          {miles.financingTotal > 0
                            ? `+${miles.financingTotal.toLocaleString()} ${theme.unit}`
                            : `no extra ${theme.unit}`}
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
            <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-[11px] text-slate-600">
              {preview.data.note}
            </p>

            {/* Benefit calculator for the picked plan */}
            {pickedPlan && pickedMiles && (
              <section
                aria-label="Benefit calculator"
                className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <h3 className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Calculator size={13} aria-hidden /> What this plan gives back
                </h3>
                {(() => {
                  const cost = Math.max(pickedPlan.totalCost - amount, 0);
                  const milesValue =
                    (pickedMiles.financingTotal * MILE_VALUE_CENTS) / 100;
                  const baseValue =
                    ((preview.data?.totalBase ?? 0) * MILE_VALUE_CENTS) / 100;
                  const max = Math.max(cost, milesValue + baseValue, 1);
                  const bar = (v: number) => `${Math.max((v / max) * 100, 2)}%`;
                  return (
                    <div className="mt-2 space-y-2 text-[11px] text-slate-600">
                      <div>
                        <div className="flex justify-between">
                          <span>Cost of financing ({pickedPlan.apr}% APR)</span>
                          <span className="font-semibold text-slate-800">
                            ${cost.toFixed(2)}
                          </span>
                        </div>
                        <div className="mt-0.5 h-2 rounded-full bg-slate-200">
                          <div
                            className="h-2 rounded-full bg-slate-500"
                            style={{ width: bar(cost) }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between">
                          <span>
                            {theme.unit.charAt(0).toUpperCase() + theme.unit.slice(1)} you
                            earn ({(
                              (preview.data?.totalBase ?? 0) + pickedMiles.financingTotal
                            ).toLocaleString()}{" "}
                            × {MILE_VALUE_CENTS}¢)
                          </span>
                          <span className="font-semibold" style={{ color: "var(--brand)" }}>
                            ≈ ${(milesValue + baseValue).toFixed(2)}
                          </span>
                        </div>
                        <div className="mt-0.5 h-2 rounded-full bg-slate-200">
                          <div
                            className="h-2 rounded-full"
                            style={{ width: bar(milesValue + baseValue), background: "var(--brand)" }}
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {pickedMiles.financingTotal > 0
                          ? `${pickedMiles.milesBack.toLocaleString()} ${theme.unit} back${
                              pickedMiles.bonus > 0
                                ? ` + ${pickedMiles.bonus.toLocaleString()} bonus`
                                : ""
                            } for paying over time, plus ${(preview.data?.totalBase ?? 0).toLocaleString()} from flying. `
                          : `This plan costs nothing extra and earns no extra ${theme.unit}. `}
                        {theme.unit === "miles" ? "Mile" : "Point"} value of{" "}
                        {MILE_VALUE_CENTS}¢ is illustrative.
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
