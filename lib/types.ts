// Shared types for the ClarityPay x MileagePlus prototype.

export type CreditProfile = "prime" | "near-prime" | "thin";

export interface Persona {
  id: string;
  name: string;
  tier: string;
  milesBalance: number;
  mileagePlusNumber: string | null;
  creditProfile: CreditProfile;
  /** Tier-qualifying progress used by the loyalty card nudge. */
  tierProgress: number;
  description: string;
}

export interface Traveller {
  id: string;
  name: string;
  mileagePlusNumber: string | null;
  /** True for the borrower on the loan (bonus miles recipient). */
  isPayer: boolean;
}

export interface FareOption {
  id: string;
  label: string;
  /** Fare portion, excludes taxes — base miles accrue on this. */
  fare: number;
  taxes: number;
  total: number;
  perks: string[];
}

export interface Plan {
  id: string;
  label: string;
  installments: number;
  /** Days between installments. */
  intervalDays: number;
  apr: number;
  installmentAmount: number;
  totalCost: number;
  /** One plan per ladder is surfaced as the recommended default. */
  recommended?: boolean;
  /** First instalment is collected at checkout (pay-in-4), not one interval out. */
  dueAtSigning?: boolean;
}

export type Decision = "approved" | "declined";

export interface Offer {
  id: string;
  personaId: string;
  amount: number;
  decision: Decision;
  plans: Plan[];
  createdAt: string;
}

export type InstalmentStatus = "paid" | "due" | "late" | "cancelled" | "refunded";

export interface Instalment {
  idx: number;
  dueDate: string;
  amount: number;
  status: InstalmentStatus;
  paidAt?: string;
}

export type MilesEntryType =
  | "base_earn"
  | "bonus_earn"
  | "miles_back_earn"
  | "base_reversal"
  | "bonus_reversal"
  | "miles_back_reversal"
  | "redemption"
  | "miles_owed"
  | "retro_credit";

export type MilesStatus =
  | "pending"
  | "posted"
  | "held"
  | "reversed"
  | "pending_retry";

export interface MilesEntry {
  id: string;
  loanId: string;
  travellerId: string;
  travellerName: string;
  type: MilesEntryType;
  /** Positive = credit, negative = debit/reversal. */
  amount: number;
  status: MilesStatus;
  reason: string;
  date: string;
}

export type LoanStatus =
  | "active"
  | "paid_off"
  | "cancelled"
  | "delinquent";

export interface LoanDocument {
  id: string;
  title: string;
  note: string;
}

export interface Trip {
  origin: string;
  destination: string;
  travelDate: string;
  fareLabel: string;
  /** Fare tier id (basic | economy | economy-plus) — drives miles-back rate. */
  fareId?: string;
  /** Fare portion excl. taxes (base miles accrue on this). */
  fare: number;
  taxes: number;
}

export interface Loan {
  id: string;
  personaId: string;
  pnr: string;
  trip: Trip;
  principal: number;
  plan: Plan;
  autopay: boolean;
  status: LoanStatus;
  /** Days past due on the oldest unpaid instalment; 0 when current. */
  dpd: number;
  lateFee: number;
  schedule: Instalment[];
  ledger: MilesEntry[];
  travellers: Traveller[];
  documents: LoanDocument[];
  createdAt: string;
  refundedToOriginalMethod?: number;
}

export interface MerchantConfig {
  /**
   * Bonus miles per $ financed — Economy Plus fares on APR-bearing plans only
   * (see the `financingMiles` guard in lib/engine/loyalty.ts; a 0% plan earns
   * nothing at all). Paid in full at `bonusReferenceTermMonths` and tapered
   * beyond it. Credits when the plan completes.
   */
  bonusMilesPerDollar: number;
  /**
   * Term that earns the full bonus rate. Longer plans earn in proportion
   * (24 months at a 12-month reference earns half), so the reward steers
   * toward shorter debt instead of sitting neutral between terms.
   */
  bonusReferenceTermMonths: number;
  /** Ceiling on the bonus per booking, whatever the amount. */
  bonusCapPerBooking: number;
  /** Days after the final instalment clears before the bonus credits. */
  bonusPostDelayDays: number;
  /** DPD at which bonus miles freeze. */
  dpdFreezeThreshold: number;
  /** DPD at which bonus miles reverse. */
  dpdReverseThreshold: number;
  /** Base earn: miles per $ of fare (excl. taxes), credited after the flight. */
  baseMilesPerDollar: number;
  /** Retro-credit window for travellers who add a loyalty # later. */
  retroCreditWindowDays: number;
}

export type ExceptionType =
  | "failed_reward_posting"
  | "refund_awaiting_reversal"
  | "negative_miles_balance"
  | "unmatched_loyalty_number";

export interface OpsException {
  id: string;
  type: ExceptionType;
  loanId: string;
  pnr: string;
  summary: string;
  status: "open" | "resolved";
  createdAt: string;
}

export interface MetricPoint {
  date: string;
  value: number;
}

export interface MerchantMetrics {
  financedGmv30d: number;
  takeRatePct: number;
  approvalRatePct: number;
  avgOrderFinanced: number;
  avgOrderCard: number;
  bonusMilesIssued: number;
  bonusMilesReversed: number;
  reversalRatePct: number;
  dpd30PlusPct: number;
  gmvSeries: MetricPoint[];
}

export interface TierStep {
  name: string;
  threshold: number;
}

export interface ThemeConfig {
  merchantId: string;
  airlineName: string;
  programName: string;
  /** Loyalty currency unit, e.g. "miles" or "points". */
  unit: string;
  logoText: string;
  colors: {
    brand: string;
    brandDark: string;
    accent: string;
  };
  tiers: TierStep[];
  /** Label for tier-qualifying activity in the nudge line. */
  qualifyingLabel: string;
}

export interface SimulateRequest {
  scenario:
    | "full_cancellation"
    | "partial_refund"
    | "miles_redeemed_then_cancel"
    | "missed_payment"
    | "reward_failed";
}
