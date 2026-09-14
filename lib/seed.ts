import type {
  FareOption,
  Loan,
  MerchantConfig,
  MerchantMetrics,
  OpsException,
  Persona,
} from "./types";
import { DEFAULT_CONFIG } from "./engine/loyalty";

export const PERSONAS: Persona[] = [
  {
    id: "priya",
    name: "Priya",
    tier: "Premier Silver",
    milesBalance: 41250,
    mileagePlusNumber: "MP4821937",
    creditProfile: "prime",
    tierProgress: 5240,
    description: "Premier Silver, prime credit — approved, all plans, bonus eligible",
  },
  {
    id: "marcus",
    name: "Marcus",
    tier: "Member",
    milesBalance: 8730,
    mileagePlusNumber: "MP7738201",
    creditProfile: "near-prime",
    tierProgress: 1120,
    description: "Member, near-prime — approved, shorter terms, higher APR",
  },
  {
    id: "dana",
    name: "Dana",
    tier: "Member",
    milesBalance: 2140,
    mileagePlusNumber: "MP1204587",
    creditProfile: "thin",
    tierProgress: 310,
    description: "Member, thin file — declined path",
  },
];

/** Second traveller for the multi-traveller scenario. Not a persona. */
export const SECOND_TRAVELLER = {
  id: "alex",
  name: "Alex",
  mileagePlusNumber: null as string | null,
};

export const FARES: FareOption[] = [
  {
    id: "basic",
    label: "Basic Economy",
    fare: 228,
    taxes: 34.6,
    total: 262.6,
    perks: ["1 personal item", "No seat selection", "No changes"],
  },
  {
    id: "economy",
    label: "Economy",
    fare: 298,
    taxes: 39.2,
    total: 337.2,
    perks: ["Carry-on included", "Seat selection", "Changes with fee"],
  },
  {
    id: "economy-plus",
    label: "Economy Plus",
    fare: 372,
    taxes: 44.8,
    total: 416.8,
    perks: ["Extra legroom", "Priority boarding", "Free changes"],
  },
];

export function seedConfig(): MerchantConfig {
  return { ...DEFAULT_CONFIG };
}

function seedLoans(): Loan[] {
  const healthy: Loan = {
    id: "LN-1001",
    personaId: "priya",
    pnr: "H8K2LQ",
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
    plan: {
      id: "12mo",
      label: "12 monthly payments",
      installments: 12,
      intervalDays: 30,
      apr: 14.99,
      installmentAmount: 37.62,
      totalCost: 451.44,
    },
    autopay: true,
    status: "active",
    dpd: 0,
    lateFee: 0,
    schedule: Array.from({ length: 12 }, (_, i) => ({
      idx: i,
      dueDate: new Date(Date.UTC(2026, 7 + Math.floor((14 + i * 30) / 30), ((14 + i * 30) % 30) + 1))
        .toISOString()
        .slice(0, 10),
      amount: 37.62,
      status: (i < 2 ? "paid" : "due") as "paid" | "due",
      paidAt: i < 2 ? `2026-0${8 + i}-15` : undefined,
    })),
    ledger: [
      {
        id: "ME-S1",
        loanId: "LN-1001",
        travellerId: "priya",
        travellerName: "Priya",
        type: "base_earn",
        amount: 372,
        status: "pending",
        reason: "Earned on this trip — posts after your flight on 2026-10-12",
        date: "2026-08-14",
      },
      {
        id: "ME-S2",
        loanId: "LN-1001",
        travellerId: "priya",
        travellerName: "Priya",
        type: "bonus_earn",
        amount: 208,
        status: "pending",
        reason: "Pay-over-time bonus — credits after your final payment (Aug 2027)",
        date: "2026-08-16",
      },
    ],
    travellers: [
      { id: "priya", name: "Priya", mileagePlusNumber: "MP4821937", isPayer: true },
    ],
    documents: [
      { id: "doc-agr-1", title: "Loan agreement", note: "Signed 2026-08-14" },
      { id: "doc-stm-1", title: "Statement — Aug 2026", note: "" },
      { id: "doc-stm-2", title: "Statement — Sep 2026", note: "" },
    ],
    createdAt: "2026-08-14",
  };

  const cancelled: Loan = {
    id: "LN-1002",
    personaId: "priya",
    pnr: "C3M9XT",
    trip: {
      origin: "SFO",
      destination: "ORD",
      travelDate: "2026-09-02",
      fareLabel: "Economy",
      fareId: "economy",
      fare: 298,
      taxes: 39.2,
    },
    principal: 337.2,
    plan: {
      id: "12mo",
      label: "12 monthly payments",
      installments: 12,
      intervalDays: 30,
      apr: 14.99,
      installmentAmount: 30.4,
      totalCost: 364.8,
      recommended: true,
    },
    autopay: true,
    status: "cancelled",
    dpd: 0,
    lateFee: 0,
    refundedToOriginalMethod: 30.4,
    schedule: Array.from({ length: 12 }, (_, i) => ({
      idx: i,
      dueDate: new Date(Date.UTC(2026, 6, 29 + i * 30)).toISOString().slice(0, 10),
      amount: 30.4,
      status: (i === 0 ? "refunded" : "cancelled") as "refunded" | "cancelled",
      paidAt: i === 0 ? "2026-07-29" : undefined,
    })),
    ledger: [
      {
        id: "ME-S3",
        loanId: "LN-1002",
        travellerId: "priya",
        travellerName: "Priya",
        type: "base_earn",
        amount: 298,
        status: "reversed",
        reason: "Booking cancelled before travel",
        date: "2026-07-15",
      },
      {
        id: "ME-S3B",
        loanId: "LN-1002",
        travellerId: "priya",
        travellerName: "Priya",
        type: "bonus_earn",
        amount: 168,
        status: "reversed",
        reason: "Booking cancelled before travel",
        date: "2026-07-15",
      },
    ],
    travellers: [
      { id: "priya", name: "Priya", mileagePlusNumber: "MP4821937", isPayer: true },
    ],
    documents: [
      { id: "doc-agr-2", title: "Loan agreement", note: "Signed 2026-07-15" },
      { id: "doc-ref-1", title: "Refund confirmation", note: "$30.40 to original method" },
    ],
    createdAt: "2026-07-15",
  };

  const delinquent: Loan = {
    id: "LN-1003",
    personaId: "priya",
    pnr: "D7R4VN",
    trip: {
      origin: "SFO",
      destination: "IAH",
      travelDate: "2026-08-20",
      fareLabel: "Economy Plus",
      fareId: "economy-plus",
      fare: 264,
      taxes: 36.4,
    },
    principal: 300.4,
    plan: {
      id: "12mo",
      label: "12 monthly payments",
      installments: 12,
      intervalDays: 30,
      apr: 14.99,
      installmentAmount: 27.12,
      totalCost: 325.44,
    },
    autopay: false,
    status: "delinquent",
    dpd: 32,
    lateFee: 7,
    schedule: Array.from({ length: 12 }, (_, i) => ({
      idx: i,
      dueDate: new Date(Date.UTC(2026, 6, 10 + i * 30)).toISOString().slice(0, 10),
      amount: 27.12,
      status: (i === 0 ? "paid" : i === 1 ? "late" : "due") as
        | "paid"
        | "late"
        | "due",
      paidAt: i === 0 ? "2026-08-09" : undefined,
    })),
    ledger: [
      {
        id: "ME-S6",
        loanId: "LN-1003",
        travellerId: "priya",
        travellerName: "Priya",
        type: "base_earn",
        amount: 264,
        status: "posted",
        reason: "Earned on this trip — travel completed 2026-08-20",
        date: "2026-08-21",
      },
      {
        id: "ME-S7",
        loanId: "LN-1003",
        travellerId: "priya",
        travellerName: "Priya",
        type: "bonus_earn",
        amount: 150,
        status: "held",
        reason: "Bonus held at 30+ days past due",
        date: "2026-08-10",
      },
    ],
    travellers: [
      { id: "priya", name: "Priya", mileagePlusNumber: "MP4821937", isPayer: true },
    ],
    documents: [
      { id: "doc-agr-3", title: "Loan agreement", note: "Signed 2026-07-10" },
      { id: "doc-lat-1", title: "Late notice", note: "Payment 2 past due" },
    ],
    createdAt: "2026-07-10",
  };

  return [healthy, cancelled, delinquent];
}

function seedExceptions(): OpsException[] {
  return [
    {
      id: "EX-201",
      type: "failed_reward_posting",
      loanId: "LN-1001",
      pnr: "H8K2LQ",
      summary: "MileagePlus posting API timeout — bonus posting queued for retry",
      status: "open",
      createdAt: "2026-09-12",
    },
    {
      id: "EX-202",
      type: "refund_awaiting_reversal",
      loanId: "LN-1002",
      pnr: "C3M9XT",
      summary: "Refund settled; loyalty reversal confirmation pending from MileagePlus",
      status: "open",
      createdAt: "2026-09-10",
    },
    {
      id: "EX-203",
      type: "negative_miles_balance",
      loanId: "LN-1002",
      pnr: "C3M9XT",
      summary: "Member redeemed before cancellation — 340 miles owed, netting against future earn",
      status: "open",
      createdAt: "2026-09-08",
    },
    {
      id: "EX-204",
      type: "unmatched_loyalty_number",
      loanId: "LN-1001",
      pnr: "H8K2LQ",
      summary: "Traveller 2 (Alex) has no MileagePlus number — retro-credit window open until 2026-10-14",
      status: "open",
      createdAt: "2026-09-14",
    },
  ];
}

function seedMetrics(): MerchantMetrics {
  const gmvSeries = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 7, 16 + i));
    // Gentle upward trend with weekly seasonality — illustrative.
    const value = Math.round(
      42000 + i * 900 + Math.sin(i / 3.5) * 6000 + (i % 7 === 5 ? 4000 : 0)
    );
    return { date: d.toISOString().slice(0, 10), value };
  });
  return {
    financedGmv30d: 1682400,
    takeRatePct: 11.4,
    approvalRatePct: 68.2,
    avgOrderFinanced: 612,
    avgOrderCard: 418,
    bonusMilesIssued: 212400,
    bonusMilesReversed: 6300,
    reversalRatePct: 3.0,
    dpd30PlusPct: 2.1,
    gmvSeries,
  };
}

export function buildSeedState() {
  return {
    personas: PERSONAS.map((p) => ({ ...p })),
    loans: seedLoans(),
    exceptions: seedExceptions(),
    metrics: seedMetrics(),
    config: seedConfig(),
    /** Member miles balances mutable by simulations, keyed by traveller id. */
    balances: Object.fromEntries(
      PERSONAS.map((p) => [p.id, p.milesBalance])
    ) as Record<string, number>,
  };
}

export type SeedState = ReturnType<typeof buildSeedState>;
