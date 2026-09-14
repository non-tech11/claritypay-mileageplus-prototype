import { NextRequest, NextResponse } from "next/server";
import {
  computeBaseMilesPerTraveller,
  financingMiles,
  nextEntryId,
} from "@/lib/engine/loyalty";
import { findLoan, generatePnr, getStore, replaceLoan } from "@/lib/store";

export async function POST(req: NextRequest) {
  const { loanId } = (await req.json().catch(() => ({}))) as { loanId?: string };
  const loan = loanId ? findLoan(loanId) : undefined;
  if (!loan) {
    return NextResponse.json({ error: "loan not found" }, { status: 404 });
  }

  // Idempotent: re-signing an already-signed loan must not duplicate miles.
  if (loan.pnr && loan.ledger.length > 0) {
    return NextResponse.json({
      pnr: loan.pnr,
      confirmation: {
        loanId: loan.id,
        nextPaymentDate: loan.schedule[0]?.dueDate,
        nextPaymentAmount: loan.schedule[0]?.amount,
      },
    });
  }

  const store = getStore();
  const config = store.config;
  const today = new Date().toISOString().slice(0, 10);
  const pnr = loan.pnr || generatePnr();

  // Rewards only on APR-bearing plans — a 0% plan writes no miles at all.
  const earns = loan.plan.apr > 0;
  const basePer = earns
    ? computeBaseMilesPerTraveller(loan.trip.fare, loan.travellers.length || 1, config)
    : 0;
  const fareId =
    loan.trip.fareId ??
    loan.trip.fareLabel.toLowerCase().replace(/\s+/g, "-").replace("basic-economy", "basic");
  const funded = earns
    ? financingMiles(loan.principal, fareId, loan.plan.apr, config)
    : { bonus: 0 };

  const ledger = [...loan.ledger];
  for (const t of loan.travellers) {
    if (basePer > 0) {
      ledger.push({
        id: nextEntryId(),
        loanId: loan.id,
        travellerId: t.id,
        travellerName: t.name,
        type: "base_earn",
        amount: basePer,
        status: "pending",
        reason: t.mileagePlusNumber
          ? `Earned on this trip — posts after your flight on ${loan.trip.travelDate}`
          : `Held for retro-credit — add a MileagePlus number within ${config.retroCreditWindowDays} days`,
        date: today,
      });
    }
    // One customer-facing bonus entry to the payer: 0.5 mi/$ financed.
    if (t.isPayer && funded.bonus > 0) {
      ledger.push({
        id: nextEntryId(),
        loanId: loan.id,
        travellerId: t.id,
        travellerName: t.name,
        type: "bonus_earn",
        amount: funded.bonus,
        status: "pending",
        reason: "Pay-over-time bonus — credits after your final payment",
        date: today,
      });
    }
  }

  replaceLoan({
    ...loan,
    pnr,
    ledger,
    documents: loan.documents.map((d) =>
      d.title === "Loan agreement" ? { ...d, note: `Signed ${today}` } : d
    ),
  });

  return NextResponse.json({
    pnr,
    confirmation: {
      loanId: loan.id,
      nextPaymentDate: loan.schedule[0]?.dueDate,
      nextPaymentAmount: loan.schedule[0]?.amount,
    },
  });
}
