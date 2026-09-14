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

describe("financing miles (miles back + bonus)", () => {
  it("earns nothing on a 0% APR plan — subsidy is the incentive", () => {
    const funded = financingMiles(416.8, "economy-plus", 0, DEFAULT_CONFIG);
    expect(funded.milesBack).toBe(0);
    expect(funded.bonus).toBe(0);
  });

  it("depends on APR presence, not term length: 12mo and 24mo earn the same", () => {
    const prime = buildPlans(416.8, "prime");
    const p12 = prime.find((p) => p.id === "12mo")!;
    const p24 = prime.find((p) => p.id === "24mo")!;
    const f12 = financingMiles(416.8, "economy-plus", p12.apr, DEFAULT_CONFIG);
    const f24 = financingMiles(416.8, "economy-plus", p24.apr, DEFAULT_CONFIG);
    expect(f12).toEqual(f24);
    expect(f12.milesBack).toBe(4 * 200); // 4 hundreds x Economy Plus rate
    expect(f12.bonus).toBe(500);
  });

  it("is strictly an Economy Plus benefit — other tiers earn nothing extra", () => {
    const economy = financingMiles(337.2, "economy", 14.99, DEFAULT_CONFIG);
    expect(economy.bonus + economy.milesBack).toBe(0);
    const basic = financingMiles(262.6, "basic", 14.99, DEFAULT_CONFIG);
    expect(basic.bonus + basic.milesBack).toBe(0);
    const plus = financingMiles(416.8, "economy-plus", 14.99, DEFAULT_CONFIG);
    // Per-$100 rate (4 x 200) + flat 500 = 1,300 total bonus.
    expect(plus.milesBack + plus.bonus).toBe(1300);
  });

  it("caps the Economy Plus bonus per booking", () => {
    const config = { ...DEFAULT_CONFIG, bonusPer100Financed: 100 };
    const funded = financingMiles(4150, "economy-plus", 14.99, config);
    // 500 flat + 41 x 100 = 4600 raw → capped at 1000.
    expect(funded.bonus).toBe(1000);
  });

  it("routes the bonus to the payer only; base splits across travellers", () => {
    const preview = previewMiles(
      744,
      833.6,
      [priya, alex],
      DEFAULT_CONFIG,
      true,
      "economy-plus",
      14.99
    );
    const payer = preview.find((p) => p.travellerId === "priya")!;
    const other = preview.find((p) => p.travellerId === "alex")!;
    // Customer-facing bonus is one number: tier rate + Economy Plus extra.
    expect(payer.bonusMiles).toBe(500 + 8 * 200);
    expect(other.bonusMiles).toBe(0);
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
