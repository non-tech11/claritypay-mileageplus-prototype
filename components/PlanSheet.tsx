"use client";

import { useState } from "react";
import { Plane, X } from "lucide-react";
import { useTheme } from "@/app/theme-context";
import { useApi } from "@/lib/api-client";
import { usePersona } from "@/lib/use-persona";
import { CardSkeleton } from "./Skeleton";
import { ErrorRetry } from "./ErrorRetry";
import { buildPlans } from "@/lib/engine/loan";

export interface PlanMilesLine {
  planId: string;
  label: string;
  apr: number;
  recommended: boolean;
  bonus: number;
  financingTotal: number;
  baseTotal: number;
  totalMiles: number;
}

interface PreviewResponse {
  totalBase: number;
  perPlan: PlanMilesLine[];
  note: string;
}

/** Illustrative one-way saver award, to make the earn feel tangible. */
const AWARD_MILES = 12500;

/**
 * "Pay over time" bottom sheet. Monthly (APR) plans earn 1 mi/$ of fare,
 * plus 0.5 bonus mi/$ financed on Economy Plus; the 0% plan earns none —
 * the subsidised rate is the reward. One plan is recommended. A calculator
 * at the bottom shows cost vs miles value.
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
  const persona = usePersona();
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
      className="api-panel-offset fixed inset-0 z-50 flex items-end justify-center bg-black/40"
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
                    <div className="min-w-0">
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
                    <span className="flex shrink-0 flex-col items-end gap-0.5">
                      {miles && miles.totalMiles > 0 ? (
                        <>
                          <span
                            className="whitespace-nowrap text-right text-[11px] font-semibold"
                            style={{ color: "var(--brand)" }}
                          >
                            Earn {miles.totalMiles.toLocaleString()} {theme.unit}
                          </span>
                          {miles.financingTotal > 0 && (
                            <span className="whitespace-nowrap text-[10px] text-slate-400">
                              incl. {miles.financingTotal.toLocaleString()} bonus
                            </span>
                          )}
                        </>
                      ) : null}
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
            {/* Benefit strip: the earn as progress toward the next trip. */}
            {pickedPlan && pickedMiles && (
              <section
                aria-label="What you get"
                className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] text-slate-600"
              >
                {(() => {
                  const totalMiles = pickedMiles.totalMiles;
                  if (totalMiles === 0) {
                    return (
                      <p>
                        No extra cost — you pay exactly ${amount.toFixed(2)}.
                      </p>
                    );
                  }
                  const after = persona.milesBalance + totalMiles;
                  const goal =
                    theme.unit === "miles" ? "award flight" : "reward";
                  return (
                    <>
                      <p
                        className="flex items-center gap-1.5 text-xs font-bold"
                        style={{ color: "var(--brand)" }}
                      >
                        <Plane size={13} aria-hidden />
                        {totalMiles.toLocaleString()} {theme.unit} closer to
                        your next {goal}
                      </p>
                      <p className="mt-1">
                        Your balance grows{" "}
                        {persona.milesBalance.toLocaleString()} →{" "}
                        <strong>{after.toLocaleString()}</strong> {theme.unit}{" "}
                        — {goal}s start at {AWARD_MILES.toLocaleString()}.
                      </p>
                    </>
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
