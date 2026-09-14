import type {
  MerchantConfig,
  MilesEntry,
  Traveller,
} from "../types";

export function nextEntryId(): string {
  // Random suffix, not a module counter — module state resets on dev
  // recompile, which produced colliding ids.
  return `ME-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const DEFAULT_CONFIG: MerchantConfig = {
  bonusFlatPerBooking: 500,
  bonusPer100Financed: 0,
  bonusCapPerBooking: 1000,
  milesBackPer100: { basic: 100, economy: 150, "economy-plus": 200 },
  bonusPostDelayDays: 1,
  dpdFreezeThreshold: 30,
  dpdReverseThreshold: 60,
  baseMilesPerDollar: 5,
  retroCreditWindowDays: 30,
};

/** Fare tier that qualifies for the flat pay-over-time bonus. */
export const BONUS_FARE_TIER = "economy-plus";

/** Ledger entry types funded by ClarityPay (vs the airline's base earn). */
export const FINANCING_EARN_TYPES = ["bonus_earn", "miles_back_earn"] as const;

export function reversalTypeFor(
  earnType: string
): "bonus_reversal" | "miles_back_reversal" | "base_reversal" {
  if (earnType === "miles_back_earn") return "miles_back_reversal";
  if (earnType === "base_earn") return "base_reversal";
  return "bonus_reversal";
}

/**
 * Financing-funded miles for a booking, per plan:
 * - 0% APR plans earn nothing — the subsidised rate is the incentive.
 * - APR plans earn miles back per $100 financed, rate differentiated by
 *   fare tier (config.milesBackPer100).
 * - The flat bonus applies only to the Economy Plus tier, capped.
 * Same for every APR-bearing term: longer debt earns no more.
 */
export function financingMiles(
  amountFinanced: number,
  fareId: string,
  apr: number,
  config: MerchantConfig
): { milesBack: number; bonus: number } {
  if (apr <= 0) return { milesBack: 0, bonus: 0 };
  const hundreds = Math.floor(amountFinanced / 100);
  const milesBack = hundreds * (config.milesBackPer100[fareId] ?? 0);
  const bonus =
    fareId === BONUS_FARE_TIER
      ? Math.min(
          config.bonusFlatPerBooking + hundreds * config.bonusPer100Financed,
          config.bonusCapPerBooking
        )
      : 0;
  return { milesBack, bonus };
}

/**
 * Base miles per traveller: airline earn on the fare portion (excl. taxes),
 * split evenly across travellers. Only travellers with a loyalty number earn
 * immediately; others get a retro-credit window.
 */
export function computeBaseMilesPerTraveller(
  fareExclTaxes: number,
  travellerCount: number,
  config: MerchantConfig
): number {
  return Math.round((fareExclTaxes * config.baseMilesPerDollar) / travellerCount);
}

export interface MilesPreviewLine {
  travellerId: string;
  travellerName: string;
  baseMiles: number;
  /** Single customer-facing bonus: tier rate + Economy Plus extra, merged. */
  bonusMiles: number;
  hasLoyaltyNumber: boolean;
}

/**
 * Full preview: base to each traveller; the bonus (one number — tier-rate
 * earn plus the Economy Plus extra) to the payer only, per the chosen
 * plan's APR and fare tier. Customers see exactly two reward types.
 */
export function previewMiles(
  fareExclTaxes: number,
  amountFinanced: number,
  travellers: Traveller[],
  config: MerchantConfig,
  financed: boolean,
  fareId: string = BONUS_FARE_TIER,
  apr: number = 0
): MilesPreviewLine[] {
  const basePer = computeBaseMilesPerTraveller(
    fareExclTaxes,
    travellers.length,
    config
  );
  const funded = financed
    ? financingMiles(amountFinanced, fareId, apr, config)
    : { milesBack: 0, bonus: 0 };
  return travellers.map((t) => ({
    travellerId: t.id,
    travellerName: t.name,
    baseMiles: basePer,
    bonusMiles: t.isPayer ? funded.bonus + funded.milesBack : 0,
    hasLoyaltyNumber: !!t.mileagePlusNumber,
  }));
}

/**
 * Delinquency effect on the ledger. Bonus miles: held at the freeze
 * threshold, reversed at the reverse threshold. Base miles untouched —
 * they were earned by flying and belong to the airline's relationship.
 * A fully repaid loan is exempt (never claw back from a customer who paid).
 */
export function applyDelinquency(
  ledger: MilesEntry[],
  dpd: number,
  config: MerchantConfig,
  fullyRepaid: boolean,
  today: string
): MilesEntry[] {
  if (fullyRepaid || dpd < config.dpdFreezeThreshold) return ledger;

  const isFunded = (t: string) =>
    (FINANCING_EARN_TYPES as readonly string[]).includes(t);

  const updated = ledger.map((e) => {
    if (!isFunded(e.type) || e.status === "reversed") return e;
    const label = e.type === "bonus_earn" ? "Bonus" : "Miles back";
    if (dpd >= config.dpdReverseThreshold) {
      return {
        ...e,
        status: "reversed" as const,
        reason: `${label} reversed at ${config.dpdReverseThreshold}+ days past due`,
      };
    }
    return {
      ...e,
      status: "held" as const,
      reason: `${label} held at ${config.dpdFreezeThreshold}+ days past due`,
    };
  });

  // At the reverse threshold, add an explicit reversal line for audit.
  if (dpd >= config.dpdReverseThreshold) {
    const reversedEarn = ledger.filter(
      (e) => isFunded(e.type) && e.status !== "reversed"
    );
    for (const e of reversedEarn) {
      updated.push({
        id: nextEntryId(),
        loanId: e.loanId,
        travellerId: e.travellerId,
        travellerName: e.travellerName,
        type: reversalTypeFor(e.type),
        amount: -e.amount,
        status: "posted",
        reason: `Delinquency reversal (${config.dpdReverseThreshold}+ DPD)`,
        date: today,
      });
    }
  }
  return updated;
}

/**
 * Reverse miles on cancellation, netting against what the member still has.
 * If miles were already redeemed and the balance can't cover the reversal,
 * the shortfall becomes a "miles owed" entry that nets against future
 * earning. Never converted to a cash charge.
 */
export function reverseWithNetting(params: {
  loanId: string;
  travellerId: string;
  travellerName: string;
  milesToReverse: number;
  availableBalance: number;
  type: "base_reversal" | "bonus_reversal" | "miles_back_reversal";
  reason: string;
  today: string;
}): { entries: MilesEntry[]; balanceDebit: number; milesOwed: number } {
  const {
    loanId,
    travellerId,
    travellerName,
    milesToReverse,
    availableBalance,
    type,
    reason,
    today,
  } = params;

  const fromBalance = Math.min(milesToReverse, Math.max(availableBalance, 0));
  const shortfall = milesToReverse - fromBalance;
  const entries: MilesEntry[] = [];

  if (fromBalance > 0) {
    entries.push({
      id: nextEntryId(),
      loanId,
      travellerId,
      travellerName,
      type,
      amount: -fromBalance,
      status: "posted",
      reason,
      date: today,
    });
  }
  if (shortfall > 0) {
    entries.push({
      id: nextEntryId(),
      loanId,
      travellerId,
      travellerName,
      type: "miles_owed",
      amount: -shortfall,
      status: "posted",
      reason: `${reason} — balance insufficient; nets against future earning (never charged as cash)`,
      date: today,
    });
  }
  return { entries, balanceDebit: fromBalance, milesOwed: shortfall };
}
