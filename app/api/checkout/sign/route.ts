import { NextRequest, NextResponse } from "next/server";
import {
  computeBaseMilesPerTraveller,
  computeBonusMiles,
  nextEntryId,
} from "@/lib/engine/loyalty";
import { findLoan, generatePnr, getStore, replaceLoan } from "@/lib/store";

export async function POST(req: NextRequest) {
  const { loanId } = (await req.json().catch(() => ({}))) as { loanId?: string };
  const loan = loanId ? findLoan(loanId) : undefined;
  if (!loan) {
    return NextResponse.json({ error: "loan not found" }, { status: 404 });
  }

  const store = getStore();
  const config = store.config;
  const today = new Date().toISOString().slice(0, 10);
  const pnr = loan.pnr || generatePnr();

  const basePer = computeBaseMilesPerTraveller(
    loan.trip.fare,
    loan.travellers.length || 1,
    config
  );
  const bonus = computeBonusMiles(loan.principal, config);

  const ledger = [...loan.ledger];
  for (const t of loan.travellers) {
    ledger.push({
      id: nextEntryId(),
      loanId: loan.id,
      travellerId: t.id,
      travellerName: t.name,
      type: "base_earn",
      amount: basePer,
      status: "pending",
      reason: t.mileagePlusNumber
        ? `Base earn — posts after travel on ${loan.trip.travelDate}`
        : `Held for retro-credit — add a MileagePlus number within ${config.retroCreditWindowDays} days`,
      date: today,
    });
    if (t.isPayer) {
      ledger.push({
        id: nextEntryId(),
        loanId: loan.id,
        travellerId: t.id,
        travellerName: t.name,
        type: "bonus_earn",
        amount: bonus,
        status: "pending",
        reason: "Pay-over-time bonus — posts after first on-time payment",
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
