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
  bonusMilesPerDollar: 0.5,
  bonusCapPerBooking: 1000,
  bonusPostDelayDays: 1,
  dpdFreezeThreshold: 30,
  dpdReverseThreshold: 60,
  baseMilesPerDollar: 1,
  retroCreditWindowDays: 30,
};

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
 * Pay-over-time bonus for a booking: 0.5 mi/$ financed (config), capped.
 * Every plan earns it — 0% included — and every fare tier: paying with a
 * plan is the qualifying act, and the same amount financed earns the same
 * bonus on every term (longer debt earns no more).
 */
export function financingMiles(
  amountFinanced: number,
  config: MerchantConfig
): { bonus: number } {
  const bonus = Math.min(
    Math.floor(amountFinanced * config.bonusMilesPerDollar),
    config.bonusCapPerBooking
  );
  return { bonus };
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
  /** Customer-facing bonus: 0.5 mi/$ financed, payer only, capped. */
  bonusMiles: number;
  hasLoyaltyNumber: boolean;
}

/**
 * Full preview: base to each traveller; the bonus to the payer only.
 * Customers see exactly two reward types.
 */
export function previewMiles(
  fareExclTaxes: number,
  amountFinanced: number,
  travellers: Traveller[],
  config: MerchantConfig,
  financed: boolean
): MilesPreviewLine[] {
  const basePer = computeBaseMilesPerTraveller(
    fareExclTaxes,
    travellers.length,
    config
  );
  const funded = financed
    ? financingMiles(amountFinanced, config)
    : { bonus: 0 };
  return travellers.map((t) => ({
    travellerId: t.id,
    travellerName: t.name,
    baseMiles: basePer,
    bonusMiles: t.isPayer ? funded.bonus : 0,
    hasLoyaltyNumber: !!t.mileagePlusNumber,
  }));
}

/**
 * Delinquency effect on the ledger. Bonus miles: held at the freeze
 * threshold, reversed at the reverse threshold. Base miles untouched —
 * they credit after the flight regardless of repayment state; only the
 * bonus is at risk in delinquency.
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
