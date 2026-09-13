import type { CreditProfile, Instalment, Plan } from "../types";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Payment for an amortised loan. APR 0 → straight division.
 * intervalDays 30 treated as monthly for rate purposes; shorter
 * intervals use a per-period rate scaled from the APR.
 */
export function installmentAmount(
  principal: number,
  apr: number,
  installments: number,
  intervalDays: number
): number {
  if (apr === 0) return round2(principal / installments);
  const periodsPerYear = 365 / intervalDays;
  const r = apr / 100 / periodsPerYear;
  const pmt = (principal * r) / (1 - Math.pow(1 + r, -installments));
  return round2(pmt);
}

export interface PlanTemplate {
  id: string;
  label: string;
  installments: number;
  intervalDays: number;
  apr: number;
}

/** Illustrative plan ladder by credit profile. */
export function planTemplates(profile: CreditProfile): PlanTemplate[] {
  if (profile === "near-prime") {
    // Shorter terms only, higher APR, shown clearly.
    return [
      { id: "6wk", label: "4 payments / 6 weeks", installments: 4, intervalDays: 14, apr: 0 },
      { id: "12mo", label: "12 monthly payments", installments: 12, intervalDays: 30, apr: 24.99 },
    ];
  }
  return [
    { id: "6wk", label: "4 payments / 6 weeks", installments: 4, intervalDays: 14, apr: 0 },
    { id: "12mo", label: "12 monthly payments", installments: 12, intervalDays: 30, apr: 14.99 },
    { id: "24mo", label: "24 monthly payments", installments: 24, intervalDays: 30, apr: 17.99 },
  ];
}

export function buildPlans(amount: number, profile: CreditProfile): Plan[] {
  return planTemplates(profile).map((t) => {
    const per = installmentAmount(amount, t.apr, t.installments, t.intervalDays);
    return {
      ...t,
      installmentAmount: per,
      totalCost: round2(per * t.installments),
    };
  });
}

/** The "or from $XX/mo" figure — cheapest monthly payment offered to prime. */
export function estimateMonthly(amount: number): number {
  const plans = buildPlans(amount, "prime");
  const monthly = plans.filter((p) => p.intervalDays === 30);
  return Math.min(...monthly.map((p) => p.installmentAmount));
}

export function buildSchedule(plan: Plan, startDate: Date): Instalment[] {
  const schedule: Instalment[] = [];
  for (let i = 0; i < plan.installments; i++) {
    const due = new Date(startDate);
    due.setDate(due.getDate() + plan.intervalDays * (i + 1));
    schedule.push({
      idx: i,
      dueDate: due.toISOString().slice(0, 10),
      amount: plan.installmentAmount,
      status: "due",
    });
  }
  return schedule;
}

/**
 * Re-amortise a schedule after a partial refund: unpaid instalments are
 * recalculated over the remaining count so total repaid = new principal.
 * Paid instalments are untouched (already settled).
 */
export function reamortise(
  schedule: Instalment[],
  newPrincipalOutstanding: number
): Instalment[] {
  const unpaid = schedule.filter((s) => s.status === "due" || s.status === "late");
  if (unpaid.length === 0) return schedule;
  const per = round2(newPrincipalOutstanding / unpaid.length);
  let remaining = round2(newPrincipalOutstanding);
  return schedule.map((s) => {
    if (s.status !== "due" && s.status !== "late") return s;
    const isLastUnpaid = s.idx === unpaid[unpaid.length - 1].idx;
    const amount = isLastUnpaid ? round2(remaining) : per;
    remaining = round2(remaining - amount);
    return { ...s, amount };
  });
}
