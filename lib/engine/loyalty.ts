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
  bonusPostDelayDays: 1,
  dpdFreezeThreshold: 30,
  dpdReverseThreshold: 60,
  baseMilesPerDollar: 5,
  retroCreditWindowDays: 30,
};

/**
 * Bonus miles for a financed booking. Term-independent by design:
 * the plan chosen never appears in this calculation.
 */
export function computeBonusMiles(
  amountFinanced: number,
  config: MerchantConfig
): number {
  const raw =
    config.bonusFlatPerBooking +
    Math.floor(amountFinanced / 100) * config.bonusPer100Financed;
  return Math.min(raw, config.bonusCapPerBooking);
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
  bonusMiles: number;
  hasLoyaltyNumber: boolean;
}

/** Full preview: base to each traveller, bonus to the payer only. */
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
  const bonus = financed ? computeBonusMiles(amountFinanced, config) : 0;
  return travellers.map((t) => ({
    travellerId: t.id,
    travellerName: t.name,
    baseMiles: basePer,
    bonusMiles: t.isPayer ? bonus : 0,
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

  const updated = ledger.map((e) => {
    if (e.type !== "bonus_earn" || e.status === "reversed") return e;
    if (dpd >= config.dpdReverseThreshold) {
      return {
        ...e,
        status: "reversed" as const,
        reason: `Bonus reversed at ${config.dpdReverseThreshold}+ days past due`,
      };
    }
    return {
      ...e,
      status: "held" as const,
      reason: `Bonus held at ${config.dpdFreezeThreshold}+ days past due`,
    };
  });

  // At the reverse threshold, add an explicit reversal line for audit.
  if (dpd >= config.dpdReverseThreshold) {
    const reversedEarn = ledger.filter(
      (e) => e.type === "bonus_earn" && e.status !== "reversed"
    );
    for (const e of reversedEarn) {
      updated.push({
        id: nextEntryId(),
        loanId: e.loanId,
        travellerId: e.travellerId,
        travellerName: e.travellerName,
        type: "bonus_reversal",
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
  type: "base_reversal" | "bonus_reversal";
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
