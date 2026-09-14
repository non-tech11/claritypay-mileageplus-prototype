import type { Loan, MerchantConfig, MilesEntry } from "../types";
import {
  FINANCING_EARN_TYPES,
  nextEntryId,
  reversalTypeFor,
  reverseWithNetting,
} from "./loyalty";
import { reamortise } from "./loan";

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface CancellationResult {
  loan: Loan;
  refundToOriginalMethod: number;
  milesOwed: number;
  /** Debits to apply to member balances, keyed by travellerId. */
  balanceDebits: Record<string, number>;
}

/**
 * Full cancellation before travel:
 * - remaining instalments cancelled
 * - already-paid instalments refunded to original method
 * - unearned base miles reversed (they never posted — flight not flown)
 * - bonus miles reversed (cancellation within hold window)
 * If miles were already redeemed, net the shortfall as "miles owed".
 */
export function fullCancellation(
  loan: Loan,
  memberBalances: Record<string, number>,
  today: string
): CancellationResult {
  const paidAmount = round2(
    loan.schedule
      .filter((s) => s.status === "paid")
      .reduce((sum, s) => sum + s.amount, 0)
  );

  const schedule = loan.schedule.map((s) =>
    s.status === "paid"
      ? { ...s, status: "refunded" as const }
      : { ...s, status: "cancelled" as const }
  );

  let ledger: MilesEntry[] = [...loan.ledger];
  const balanceDebits: Record<string, number> = {};
  let totalOwed = 0;

  // Reverse pending base earn (never posted, so no netting needed).
  ledger = ledger.map((e) =>
    e.type === "base_earn" && e.status !== "reversed"
      ? { ...e, status: "reversed" as const, reason: "Booking cancelled before travel" }
      : e
  );
  for (const e of loan.ledger.filter(
    (x) => x.type === "base_earn" && x.status !== "reversed"
  )) {
    if (e.status === "posted") {
      // Posted base miles must come back out of the member balance.
      const res = reverseWithNetting({
        loanId: loan.id,
        travellerId: e.travellerId,
        travellerName: e.travellerName,
        milesToReverse: e.amount,
        availableBalance: memberBalances[e.travellerId] ?? 0,
        type: "base_reversal",
        reason: "Flight refunded — base miles reversed",
        today,
      });
      ledger.push(...res.entries);
      balanceDebits[e.travellerId] =
        (balanceDebits[e.travellerId] ?? 0) + res.balanceDebit;
      totalOwed += res.milesOwed;
    } else {
      ledger.push({
        id: nextEntryId(),
        loanId: loan.id,
        travellerId: e.travellerId,
        travellerName: e.travellerName,
        type: "base_reversal",
        amount: -e.amount,
        status: "posted",
        reason: "Booking cancelled before travel — pending base miles removed",
        date: today,
      });
    }
  }

  // Reverse financing-funded miles (bonus + miles back) on cancellation.
  for (const e of loan.ledger.filter(
    (x) =>
      (FINANCING_EARN_TYPES as readonly string[]).includes(x.type) &&
      x.status !== "reversed"
  )) {
    if (e.status === "posted" || e.status === "held") {
      const res = reverseWithNetting({
        loanId: loan.id,
        travellerId: e.travellerId,
        travellerName: e.travellerName,
        milesToReverse: e.amount,
        availableBalance:
          (memberBalances[e.travellerId] ?? 0) -
          (balanceDebits[e.travellerId] ?? 0),
        type: reversalTypeFor(e.type) as "bonus_reversal" | "miles_back_reversal",
        reason:
          e.type === "bonus_earn"
            ? "Booking cancelled — bonus miles reversed"
            : "Booking cancelled — miles back reversed",
        today,
      });
      ledger.push(...res.entries);
      balanceDebits[e.travellerId] =
        (balanceDebits[e.travellerId] ?? 0) + res.balanceDebit;
      totalOwed += res.milesOwed;
    }
    ledger = ledger.map((x) =>
      x.id === e.id
        ? { ...x, status: "reversed" as const, reason: "Booking cancelled" }
        : x
    );
  }

  return {
    loan: {
      ...loan,
      status: "cancelled",
      schedule,
      ledger,
      dpd: 0,
      refundedToOriginalMethod: paidAmount,
    },
    refundToOriginalMethod: paidAmount,
    milesOwed: totalOwed,
    balanceDebits,
  };
}

/**
 * Partial refund — one or more travellers cancel:
 * - loan principal reduced pro-rata, unpaid schedule re-amortised
 * - cancelled travellers' base miles reversed (pro-rated per traveller)
 * - bonus miles kept: the payer still financed a (smaller) booking.
 *   Bonus is per booking, not per traveller — noted in decisions.
 */
export function partialRefund(
  loan: Loan,
  cancelTravellerIds: string[],
  _config: MerchantConfig,
  today: string
): { loan: Loan; refundAmount: number } {
  const total = loan.travellers.length;
  const cancelled = loan.travellers.filter((t) =>
    cancelTravellerIds.includes(t.id)
  );
  if (cancelled.length === 0 || cancelled.length >= total) {
    throw new Error("partialRefund requires a strict subset of travellers");
  }

  const share = cancelled.length / total;
  const refundAmount = round2(loan.principal * share);
  const paidSoFar = round2(
    loan.schedule
      .filter((s) => s.status === "paid")
      .reduce((sum, s) => sum + s.amount, 0)
  );
  const newPrincipal = round2(loan.principal - refundAmount);
  const outstanding = Math.max(round2(newPrincipal - paidSoFar), 0);

  let ledger: MilesEntry[] = loan.ledger.map((e) => {
    if (
      e.type === "base_earn" &&
      cancelTravellerIds.includes(e.travellerId) &&
      e.status !== "reversed"
    ) {
      return {
        ...e,
        status: "reversed" as const,
        reason: "Traveller cancelled — base miles reversed pro-rata",
      };
    }
    return e;
  });
  for (const e of loan.ledger.filter(
    (x) =>
      x.type === "base_earn" &&
      cancelTravellerIds.includes(x.travellerId) &&
      x.status !== "reversed"
  )) {
    ledger.push({
      id: nextEntryId(),
      loanId: loan.id,
      travellerId: e.travellerId,
      travellerName: e.travellerName,
      type: "base_reversal",
      amount: -e.amount,
      status: "posted",
      reason: `Partial cancellation (${cancelled.map((c) => c.name).join(", ")})`,
      date: today,
    });
  }

  return {
    loan: {
      ...loan,
      principal: newPrincipal,
      travellers: loan.travellers.filter(
        (t) => !cancelTravellerIds.includes(t.id)
      ),
      trip: {
        ...loan.trip,
        fare: round2(loan.trip.fare * (1 - share)),
        taxes: round2(loan.trip.taxes * (1 - share)),
      },
      schedule: reamortise(loan.schedule, outstanding),
      ledger,
    },
    refundAmount,
  };
}
