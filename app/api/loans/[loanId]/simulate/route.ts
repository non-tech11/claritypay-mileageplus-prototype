import { NextRequest, NextResponse } from "next/server";
import { applyDelinquency, nextEntryId } from "@/lib/engine/loyalty";
import { fullCancellation, partialRefund } from "@/lib/engine/refund";
import { findLoan, getStore, replaceLoan } from "@/lib/store";
import type { Loan, SimulateRequest } from "@/lib/types";

/**
 * Prototype scenario simulator. Mutates the in-memory store so the
 * servicing view and the merchant dashboard both reflect the outcome.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ loanId: string }> }
) {
  const { loanId } = await params;
  const { scenario } = (await req.json().catch(() => ({}))) as SimulateRequest;
  const loan = findLoan(loanId);
  if (!loan) {
    return NextResponse.json({ error: "loan not found" }, { status: 404 });
  }
  const store = getStore();
  const today = new Date().toISOString().slice(0, 10);
  let message = "";

  switch (scenario) {
    case "missed_payment": {
      // First trigger: 32 DPD → bonus held. Trigger again: 61 DPD → reversed.
      const newDpd = loan.dpd >= store.config.dpdFreezeThreshold ? 61 : 32;
      const nextDue = loan.schedule.find((s) => s.status === "due");
      const schedule = nextDue
        ? loan.schedule.map((s) =>
            s.idx === nextDue.idx ? { ...s, status: "late" as const } : s
          )
        : loan.schedule;
      const fullyRepaid = loan.schedule.every(
        (s) => s.status === "paid" || s.status === "refunded"
      );
      const ledger = applyDelinquency(
        loan.ledger,
        newDpd,
        store.config,
        fullyRepaid,
        today
      );
      replaceLoan({
        ...loan,
        schedule,
        ledger,
        dpd: newDpd,
        lateFee: 7,
        status: "delinquent",
      });
      message =
        newDpd >= store.config.dpdReverseThreshold
          ? `Now ${newDpd} DPD — bonus miles reversed. Base miles untouched — only the bonus is at risk in delinquency.`
          : `Now ${newDpd} DPD — bonus miles held. Base miles untouched. Trigger again to reach 60 DPD.`;
      break;
    }

    case "reward_failed": {
      const ledger = loan.ledger.map((e) =>
        (e.status === "pending" || e.status === "posted") &&
        (e.type === "bonus_earn" || e.type === "miles_back_earn")
          ? {
              ...e,
              status: "pending_retry" as const,
              reason: "MileagePlus posting API unavailable — retrying, posts within 72 hours",
            }
          : e
      );
      replaceLoan({ ...loan, ledger });
      store.exceptions.push({
        id: `EX-${Date.now().toString(36).toUpperCase()}`,
        type: "failed_reward_posting",
        loanId: loan.id,
        pnr: loan.pnr,
        summary: "MileagePlus posting API timeout — bonus posting queued for retry",
        status: "open",
        createdAt: today,
      });
      message =
        "Loyalty API down. Loan unaffected; miles show 'pending — retrying'; exception queued for United ops.";
      break;
    }

    case "miles_redeemed_then_cancel": {
      // Member redeems most of their balance, then cancels the booking.
      const payer = loan.travellers.find((t) => t.isPayer) ?? loan.travellers[0];
      const redemption = Math.max((store.balances[payer.id] ?? 0) - 160, 0);
      store.balances[payer.id] = 160;
      const withRedemption: Loan = {
        ...loan,
        ledger: [
          ...loan.ledger,
          {
            id: nextEntryId(),
            loanId: loan.id,
            travellerId: payer.id,
            travellerName: payer.name,
            type: "redemption",
            amount: -redemption,
            status: "posted",
            reason: "Member redeemed miles (award booking) before cancellation",
            date: today,
          },
        ],
      };
      const res = fullCancellation(withRedemption, store.balances, today);
      for (const [travellerId, debit] of Object.entries(res.balanceDebits)) {
        if (store.balances[travellerId] !== undefined) {
          store.balances[travellerId] -= debit;
        }
      }
      replaceLoan(res.loan);
      if (res.milesOwed > 0) {
        store.exceptions.push({
          id: `EX-${Date.now().toString(36).toUpperCase()}`,
          type: "negative_miles_balance",
          loanId: loan.id,
          pnr: loan.pnr,
          summary: `${res.milesOwed} miles owed after redemption — nets against future earning, never charged as cash`,
          status: "open",
          createdAt: today,
        });
      }
      message = `Cancelled after redemption. Balance covered part of the reversal; ${res.milesOwed} miles booked as "miles owed" netting against future earning. No cash clawback.`;
      break;
    }

    case "full_cancellation": {
      const res = fullCancellation(loan, store.balances, today);
      for (const [travellerId, debit] of Object.entries(res.balanceDebits)) {
        if (store.balances[travellerId] !== undefined) {
          store.balances[travellerId] -= debit;
        }
      }
      replaceLoan(res.loan);
      store.exceptions.push({
        id: `EX-${Date.now().toString(36).toUpperCase()}`,
        type: "refund_awaiting_reversal",
        loanId: loan.id,
        pnr: loan.pnr,
        summary: `Refund of $${res.refundToOriginalMethod.toFixed(2)} settled; loyalty reversal sent to MileagePlus`,
        status: "open",
        createdAt: today,
      });
      message = `Booking cancelled. $${res.refundToOriginalMethod.toFixed(
        2
      )} refunded to original method, remaining instalments cancelled, unearned miles reversed.`;
      break;
    }

    case "partial_refund": {
      // Needs two travellers; if the seed loan has one, add Alex first by
      // splitting the existing pending base earn between the two.
      let target = loan;
      if (loan.travellers.length < 2) {
        const baseEntry = loan.ledger.find((e) => e.type === "base_earn");
        const half = baseEntry ? Math.round(baseEntry.amount / 2) : 0;
        target = {
          ...loan,
          travellers: [
            ...loan.travellers,
            { id: "alex", name: "Alex", mileagePlusNumber: null, isPayer: false },
          ],
          ledger: loan.ledger.flatMap((e) =>
            e.type === "base_earn"
              ? [
                  { ...e, amount: half },
                  {
                    ...e,
                    id: nextEntryId(),
                    travellerId: "alex",
                    travellerName: "Alex",
                    amount: e.amount - half,
                    reason: "Base earn share — add a MileagePlus number to receive",
                  },
                ]
              : [e]
          ),
        };
      }
      const res = partialRefund(target, ["alex"], store.config, today);
      replaceLoan(res.loan);
      message = `Alex cancelled. $${res.refundAmount.toFixed(
        2
      )} refunded pro-rata, loan re-amortised, Alex's base miles reversed. Payer keeps the bonus — it rewards the financed booking, not headcount.`;
      break;
    }

    default:
      return NextResponse.json(
      { error: `unknown scenario: ${String(scenario)}` },
        { status: 400 }
      );
  }

  return NextResponse.json({ ok: true, scenario, message, loan: findLoan(loanId) });
}
