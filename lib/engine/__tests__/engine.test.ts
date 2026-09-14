import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  applyDelinquency,
  financingMiles,
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
      fareId: "economy-plus",
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

function entry(
  type: MilesEntry["type"],
  amount: number,
  status: MilesEntry["status"],
  travellerId = "priya"
): MilesEntry {
  return {
    id: `T-${travellerId}-${type}-${status}-${amount}`,
    loanId: "LN-T1",
    travellerId,
    travellerName: travellerId,
    type,
    amount,
    status,
    reason: "test",
    date: "2026-08-14",
  };
}

describe("financing bonus (0.5 mi/$ financed, uniform)", () => {
  it("earns 0.5 mi per $ financed, floored", () => {
    const funded = financingMiles(416.8, DEFAULT_CONFIG);
    expect(funded.bonus).toBe(208); // floor(416.80 x 0.5)
  });

  it("is identical on every plan — 0% included, term-independent", () => {
    // The bonus depends only on the amount financed, never on the plan:
    // buildPlans yields 0%, 12mo and 24mo, all with the same principal.
    const plans = buildPlans(416.8, "prime");
    expect(plans.length).toBeGreaterThanOrEqual(3);
    const bonuses = plans.map(() => financingMiles(416.8, DEFAULT_CONFIG).bonus);
    expect(new Set(bonuses).size).toBe(1);
    expect(bonuses[0]).toBe(208);
  });

  it("scales linearly with the amount financed below the cap", () => {
    expect(financingMiles(200, DEFAULT_CONFIG).bonus).toBe(100);
    expect(financingMiles(400, DEFAULT_CONFIG).bonus).toBe(200);
    expect(financingMiles(337.2, DEFAULT_CONFIG).bonus).toBe(168);
  });

  it("caps the bonus per booking", () => {
    const funded = financingMiles(4150, DEFAULT_CONFIG);
    // floor(4150 x 0.5) = 2075 raw → capped at 1000.
    expect(funded.bonus).toBe(1000);
  });

  it("routes the bonus to the payer only; base splits across travellers", () => {
    const preview = previewMiles(744, 833.6, [priya, alex], DEFAULT_CONFIG, true);
    const payer = preview.find((p) => p.travellerId === "priya")!;
    const other = preview.find((p) => p.travellerId === "alex")!;
    expect(payer.bonusMiles).toBe(416); // floor(833.60 x 0.5)
    expect(other.bonusMiles).toBe(0);
    expect(payer.baseMiles).toBe(other.baseMiles);
    expect(payer.baseMiles).toBe(Math.round((744 * 1) / 2));
  });
});

describe("decline path", () => {
  it("yields base miles only — no bonus when not financed", () => {
    const preview = previewMiles(372, 416.8, [priya], DEFAULT_CONFIG, false);
    expect(preview[0].baseMiles).toBe(372); // 1 mi/$ of fare
    expect(preview[0].bonusMiles).toBe(0);
  });
});

describe("delinquency freeze / reverse", () => {
  it("holds bonus and miles back at 30 DPD, leaves base untouched", () => {
    const ledger = [
      entry("base_earn", 1860, "posted"),
      entry("bonus_earn", 500, "posted"),
      entry("miles_back_earn", 800, "posted"),
    ];
    const out = applyDelinquency(ledger, 32, DEFAULT_CONFIG, false, TODAY);
    expect(out.find((e) => e.type === "bonus_earn")!.status).toBe("held");
    expect(out.find((e) => e.type === "miles_back_earn")!.status).toBe("held");
    expect(out.find((e) => e.type === "base_earn")!.status).toBe("posted");
  });

  it("reverses both financing types at 60 DPD with audit lines, base untouched", () => {
    const ledger = [
      entry("base_earn", 1860, "posted"),
      entry("bonus_earn", 500, "held"),
      entry("miles_back_earn", 800, "held"),
    ];
    const out = applyDelinquency(ledger, 61, DEFAULT_CONFIG, false, TODAY);
    expect(out.find((e) => e.type === "bonus_earn")!.status).toBe("reversed");
    expect(out.find((e) => e.type === "miles_back_earn")!.status).toBe("reversed");
    expect(out.find((e) => e.type === "base_earn")!.status).toBe("posted");
    expect(out.find((e) => e.type === "bonus_reversal")?.amount).toBe(-500);
    expect(out.find((e) => e.type === "miles_back_reversal")?.amount).toBe(-800);
  });

  it("never reverses financing miles for a fully repaid loan", () => {
    const ledger = [
      entry("bonus_earn", 500, "posted"),
      entry("miles_back_earn", 800, "posted"),
    ];
    const out = applyDelinquency(ledger, 90, DEFAULT_CONFIG, true, TODAY);
    expect(out.every((e) => e.status === "posted")).toBe(true);
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
    expect(owed.reason).toMatch(/never charged as cash/);
  });
});

describe("full cancellation", () => {
  it("refunds paid instalments, cancels the rest, reverses all earn types", () => {
    const loan = makeLoan({
      ledger: [
        entry("base_earn", 1860, "pending"),
        entry("bonus_earn", 500, "posted"),
        entry("miles_back_earn", 800, "posted"),
      ],
    });
    loan.schedule[0] = { ...loan.schedule[0], status: "paid", paidAt: "2026-08-15" };
    const res = fullCancellation(loan, { priya: 41250 }, TODAY);
    expect(res.loan.status).toBe("cancelled");
    expect(res.refundToOriginalMethod).toBeCloseTo(loan.plan.installmentAmount, 2);
    expect(res.loan.schedule[0].status).toBe("refunded");
    expect(res.loan.schedule.slice(1).every((s) => s.status === "cancelled")).toBe(true);
    expect(res.loan.ledger.find((e) => e.type === "base_earn")!.status).toBe("reversed");
    expect(res.loan.ledger.find((e) => e.type === "bonus_earn")!.status).toBe("reversed");
    expect(res.loan.ledger.find((e) => e.type === "miles_back_earn")!.status).toBe("reversed");
    expect(res.loan.ledger.some((e) => e.type === "miles_back_reversal")).toBe(true);
    expect(res.milesOwed).toBe(0);
  });
});

describe("partial refund", () => {
  it("pro-rates the refund, re-amortises, reverses only the cancelled traveller's base miles", () => {
    const loan = makeLoan({
      principal: 833.6,
      travellers: [priya, alex],
      ledger: [
        entry("base_earn", 1860, "pending"),
        entry("base_earn", 1860, "pending", "alex"),
        entry("bonus_earn", 500, "pending"),
        entry("miles_back_earn", 1600, "pending"),
      ],
    });
    const res = partialRefund(loan, ["alex"], DEFAULT_CONFIG, TODAY);
    expect(res.refundAmount).toBeCloseTo(416.8, 2);
    expect(res.loan.principal).toBeCloseTo(416.8, 2);
    expect(res.loan.travellers.map((t) => t.id)).toEqual(["priya"]);
    expect(
      res.loan.ledger.find((e) => e.type === "base_earn" && e.travellerId === "alex")!.status
    ).toBe("reversed");
    expect(
      res.loan.ledger.find((e) => e.type === "base_earn" && e.travellerId === "priya")!.status
    ).toBe("pending");
    expect(res.loan.ledger.find((e) => e.type === "bonus_earn")!.status).toBe("pending");
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
  it("near-prime sees shorter terms and higher APR; each ladder has one recommended plan", () => {
    const prime = buildPlans(416.8, "prime");
    const nearPrime = buildPlans(416.8, "near-prime");
    expect(prime.map((p) => p.id)).toContain("24mo");
    expect(nearPrime.map((p) => p.id)).not.toContain("24mo");
    const prime12 = prime.find((p) => p.id === "12mo")!;
    const np12 = nearPrime.find((p) => p.id === "12mo")!;
    expect(np12.apr).toBeGreaterThan(prime12.apr);
    expect(prime.filter((p) => p.recommended)).toHaveLength(1);
    expect(nearPrime.filter((p) => p.recommended)).toHaveLength(1);
    expect(prime.find((p) => p.recommended)!.id).toBe("12mo");
  });
});
