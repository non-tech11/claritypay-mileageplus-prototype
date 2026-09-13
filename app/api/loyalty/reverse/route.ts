import { NextRequest, NextResponse } from "next/server";
import { reverseWithNetting } from "@/lib/engine/loyalty";
import { findLoan, getStore, replaceLoan } from "@/lib/store";

interface ReverseBody {
  loanId?: string;
  reason?: string;
  travellerId?: string;
}

export async function POST(req: NextRequest) {
  const { loanId, reason = "manual reversal", travellerId } =
    (await req.json().catch(() => ({}))) as ReverseBody;
  const loan = loanId ? findLoan(loanId) : undefined;
  if (!loan) {
    return NextResponse.json({ error: "loan not found" }, { status: 404 });
  }
  const store = getStore();
  const today = new Date().toISOString().slice(0, 10);

  const targets = loan.ledger.filter(
    (e) =>
      (e.type === "base_earn" || e.type === "bonus_earn") &&
      e.status !== "reversed" &&
      (!travellerId || e.travellerId === travellerId)
  );
  if (targets.length === 0) {
    return NextResponse.json({ error: "nothing to reverse" }, { status: 400 });
  }

  let ledger = loan.ledger.map((e) =>
    targets.some((t) => t.id === e.id)
      ? { ...e, status: "reversed" as const, reason }
      : e
  );
  let totalOwed = 0;
  for (const e of targets.filter((t) => t.status === "posted" || t.status === "held")) {
    const res = reverseWithNetting({
      loanId: loan.id,
      travellerId: e.travellerId,
      travellerName: e.travellerName,
      milesToReverse: e.amount,
      availableBalance: store.balances[e.travellerId] ?? 0,
      type: e.type === "base_earn" ? "base_reversal" : "bonus_reversal",
      reason,
      today,
    });
    ledger = [...ledger, ...res.entries];
    if (store.balances[e.travellerId] !== undefined) {
      store.balances[e.travellerId] -= res.balanceDebit;
    }
    totalOwed += res.milesOwed;
  }

  replaceLoan({ ...loan, ledger });
  return NextResponse.json({ ok: true, reversedEntries: targets.length, milesOwed: totalOwed });
}
