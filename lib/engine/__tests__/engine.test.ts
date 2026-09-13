import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  applyDelinquency,
  computeBonusMiles,
  previewMiles,
  reverseWithNetting,
} from "../loyalty";
import { buildPlans, buildSchedule, reamortise } from "../loan";
import { fullCancellation, partialRefund } from "../refund";
import type { Loan, MilesEntry, Traveller } from "../../types";

const TODAY = "2026-09-14";

const priya: Traveller = {
  id: "priya",
  name: "Priya",
  mileagePlusNumber: "MP4821937",
  isPayer: true,
};
const alex: Traveller = {
  id: "alex",
  name: "Alex",
  mileagePlusNumber: null,
  isPayer: false,
};

function makeLoan(overrides: Partial<Loan> = {}): Loan {
  const plan = buildPlans(416.8, "prime").find((p) => p.id === "12mo")!;
  return {
    id: "LN-T1",
    personaId: "priya",
    pnr: "TEST01",
    trip: {
      origin: "SFO",
      destination: "EWR",
      travelDate: "2026-10-12",
      fareLabel: "Economy Plus",
      fare: 372,
      taxes: 44.8,
    },
    principal: 416.8,
    plan,
    autopay: true,
    status: "active",
    dpd: 0,
    lateFee: 0,
    schedule: buildSchedule(plan, new Date("2026-08-14")),
    ledger: [],
    travellers: [priya],
    documents: [],
    createdAt: "2026-08-14",
    ...overrides,
  };
}

function baseEarn(travellerId: string, amount: number, status: MilesEntry["status"] = "pending"): MilesEntry {
  return {
    id: `T-${travellerId}-base`,
    loanId: "LN-T1",
    travellerId,
    travellerName: travellerId,
    type: "base_earn",
    amount,
    status,
    reason: "test",
    date: "2026-08-14",
  };
}

function bonusEarn(status: MilesEntry["status"] = "posted"): MilesEntry {
  return {
    id: "T-bonus",
    loanId: "LN-T1",
    travellerId: "priya",
    travellerName: "Priya",
    type: "bonus_earn",
    amount: 500,
    status,
    reason: "test",
    date: "2026-08-16",
  };
}

describe("bonus miles", () => {
  it("does not depend on the plan term chosen", () => {
    // Same booking amount → same bonus, whatever the term. The plan is
    // deliberately not an input to computeBonusMiles.
    const bonus = computeBonusMiles(416.8, DEFAULT_CONFIG);
    expect(bonus).toBe(500);
    const plans = buildPlans(416.8, "prime");
    expect(plans.length).toBeGreaterThan(1);
    // No per-plan bonus API exists; verify preview is term-agnostic too.
    const preview = previewMiles(372, 416.8, [priya], DEFAULT_CONFIG, true);
    expect(preview[0].bonusMiles).toBe(500);
  });

  it("is capped per booking", () => {
    const config = { ...DEFAULT_CONFIG, bonusPer100Financed: 100 };
    // 500 flat + 41 * 100 = 4600 raw → capped at 1000.
    expect(computeBonusMiles(4150, config)).toBe(1000);
  });

  it("goes to the payer only in multi-traveller bookings", () => {
    const preview = previewMiles(744, 833.6, [priya, alex], DEFAULT_CONFIG, true);
    const payer = preview.find((p) => p.travellerId === "priya")!;
    const other = preview.find((p) => p.travellerId === "alex")!;
    expect(payer.bonusMiles).toBe(500);
    expect(other.bonusMiles).toBe(0);
    // Base miles split across both travellers.
    expect(payer.baseMiles).toBe(other.baseMiles);
    expect(payer.baseMiles).toBe(Math.round((744 * 5) / 2));
  });
});

describe("decline path", () => {
  it("yields base miles only — no bonus when not financed", () => {
    const preview = previewMiles(372, 416.8, [priya], DEFAULT_CONFIG, false);
    expect(preview[0].baseMiles).toBe(1860);
    expect(preview[0].bonusMiles).toBe(0);
  });
});

describe("delinquency freeze / reverse", () => {
  it("holds bonus at 30 DPD, leaves base untouched", () => {
    const ledger = [baseEarn("priya", 1860, "posted"), bonusEarn("posted")];
    const out = applyDelinquency(ledger, 32, DEFAULT_CONFIG, false, TODAY);
    expect(out.find((e) => e.type === "bonus_earn")!.status).toBe("held");
    expect(out.find((e) => e.type === "base_earn")!.status).toBe("posted");
  });

  it("reverses bonus at 60 DPD with an audit line, base still untouched", () => {
    const ledger = [baseEarn("priya", 1860, "posted"), bonusEarn("held")];
    const out = applyDelinquency(ledger, 61, DEFAULT_CONFIG, false, TODAY);
    expect(out.find((e) => e.type === "bonus_earn")!.status).toBe("reversed");
    expect(out.find((e) => e.type === "base_earn")!.status).toBe("posted");
    const reversal = out.find((e) => e.type === "bonus_reversal");
    expect(reversal?.amount).toBe(-500);
  });

  it("never reverses bonus for a fully repaid loan", () => {
    const ledger = [bonusEarn("posted")];
    const out = applyDelinquency(ledger, 90, DEFAULT_CONFIG, true, TODAY);
    expect(out.find((e) => e.type === "bonus_earn")!.status).toBe("posted");
  });
});

describe("redeemed then cancelled — netting", () => {
  it("reverses what the balance covers and books the shortfall as miles owed", () => {
    const res = reverseWithNetting({
      loanId: "LN-T1",
      travellerId: "priya",
      travellerName: "Priya",
      milesToReverse: 500,
      availableBalance: 160,
      type: "bonus_reversal",
      reason: "Booking cancelled",
      today: TODAY,
    });
    expect(res.balanceDebit).toBe(160);
    expect(res.milesOwed).toBe(340);
    const owed = res.entries.find((e) => e.type === "miles_owed")!;
    expect(owed.amount).toBe(-340);
    // Netting language, never a cash charge.
    expect(owed.reason).toMatch(/never charged as cash/);
  });
});

describe("full cancellation", () => {
  it("refunds paid instalments, cancels the rest, reverses pending miles", () => {
    const loan = makeLoan({
      ledger: [baseEarn("priya", 1860, "pending"), bonusEarn("posted")],
    });
    loan.schedule[0] = { ...loan.schedule[0], status: "paid", paidAt: "2026-08-15" };
    const res = fullCancellation(loan, { priya: 41250 }, TODAY);
    expect(res.loan.status).toBe("cancelled");
    expect(res.refundToOriginalMethod).toBeCloseTo(loan.plan.installmentAmount, 2);
    expect(res.loan.schedule[0].status).toBe("refunded");
    expect(res.loan.schedule.slice(1).every((s) => s.status === "cancelled")).toBe(true);
    expect(res.loan.ledger.find((e) => e.type === "base_earn")!.status).toBe("reversed");
    expect(res.loan.ledger.find((e) => e.type === "bonus_earn")!.status).toBe("reversed");
    expect(res.milesOwed).toBe(0);
  });
});

describe("partial refund", () => {
  it("pro-rates the refund, re-amortises, reverses only the cancelled traveller's base miles", () => {
    const loan = makeLoan({
      principal: 833.6,
      travellers: [priya, alex],
      ledger: [
        baseEarn("priya", 1860, "pending"),
        { ...baseEarn("alex", 1860, "pending"), id: "T-alex-base", travellerId: "alex", travellerName: "Alex" },
        bonusEarn("pending"),
      ],
    });
    const res = partialRefund(loan, ["alex"], DEFAULT_CONFIG, TODAY);
    expect(res.refundAmount).toBeCloseTo(416.8, 2);
    expect(res.loan.principal).toBeCloseTo(416.8, 2);
    expect(res.loan.travellers.map((t) => t.id)).toEqual(["priya"]);
    // Alex's base reversed; Priya's untouched; payer bonus kept.
    expect(
      res.loan.ledger.find((e) => e.type === "base_earn" && e.travellerId === "alex")!.status
    ).toBe("reversed");
    expect(
      res.loan.ledger.find((e) => e.type === "base_earn" && e.travellerId === "priya")!.status
    ).toBe("pending");
    expect(res.loan.ledger.find((e) => e.type === "bonus_earn")!.status).toBe("pending");
    // Re-amortised: unpaid instalments now sum to the new outstanding amount.
    const unpaidSum = res.loan.schedule
      .filter((s) => s.status === "due" || s.status === "late")
      .reduce((sum, s) => sum + s.amount, 0);
    expect(unpaidSum).toBeCloseTo(416.8, 1);
  });
});

describe("re-amortisation", () => {
  it("keeps paid instalments untouched and spreads the new balance over unpaid ones", () => {
    const plan = buildPlans(400, "prime").find((p) => p.id === "6wk")!;
    const schedule = buildSchedule(plan, new Date("2026-08-01"));
    schedule[0] = { ...schedule[0], status: "paid" };
    const out = reamortise(schedule, 150);
    expect(out[0].amount).toBe(schedule[0].amount);
    const unpaid = out.filter((s) => s.status === "due");
    expect(unpaid.reduce((sum, s) => sum + s.amount, 0)).toBeCloseTo(150, 2);
  });
});

describe("plan ladder", () => {
  it("near-prime sees shorter terms and higher APR", () => {
    const prime = buildPlans(416.8, "prime");
    const nearPrime = buildPlans(416.8, "near-prime");
    expect(prime.map((p) => p.id)).toContain("24mo");
    expect(nearPrime.map((p) => p.id)).not.toContain("24mo");
    const prime12 = prime.find((p) => p.id === "12mo")!;
    const np12 = nearPrime.find((p) => p.id === "12mo")!;
    expect(np12.apr).toBeGreaterThan(prime12.apr);
  });
});
