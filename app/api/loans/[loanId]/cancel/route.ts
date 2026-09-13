import { NextRequest, NextResponse } from "next/server";
import { fullCancellation, partialRefund } from "@/lib/engine/refund";
import { findLoan, getStore, replaceLoan } from "@/lib/store";

interface CancelBody {
  scope?: "full" | "partial";
  travellerIds?: string[];
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ loanId: string }> }
) {
  const { loanId } = await params;
  const { scope = "full", travellerIds = [] } =
    (await req.json().catch(() => ({}))) as CancelBody;
  const loan = findLoan(loanId);
  if (!loan) {
    return NextResponse.json({ error: "loan not found" }, { status: 404 });
  }
  if (loan.status === "cancelled") {
    return NextResponse.json({ error: "loan already cancelled" }, { status: 400 });
  }

  const store = getStore();
  const today = new Date().toISOString().slice(0, 10);

  if (scope === "partial") {
    if (travellerIds.length === 0 || travellerIds.length >= loan.travellers.length) {
      return NextResponse.json(
        { error: "partial cancel needs a strict subset of travellerIds" },
        { status: 400 }
      );
    }
    const res = partialRefund(loan, travellerIds, store.config, today);
    replaceLoan(res.loan);
    return NextResponse.json({
      ok: true,
      scope,
      refundAmount: res.refundAmount,
      loan: res.loan,
    });
  }

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
  if (res.milesOwed > 0) {
    store.exceptions.push({
      id: `EX-${Date.now().toString(36).toUpperCase()}N`,
      type: "negative_miles_balance",
      loanId: loan.id,
      pnr: loan.pnr,
      summary: `${res.milesOwed} miles owed after redemption — nets against future earning`,
      status: "open",
      createdAt: today,
    });
  }
  return NextResponse.json({
    ok: true,
    scope,
    refundToOriginalMethod: res.refundToOriginalMethod,
    milesOwed: res.milesOwed,
    loan: res.loan,
  });
}
