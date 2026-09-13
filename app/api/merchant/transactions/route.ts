import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function GET() {
  const store = getStore();
  const transactions = store.loans.map((l) => {
    const base = l.ledger.filter((e) => e.type === "base_earn");
    const bonus = l.ledger.filter((e) => e.type === "bonus_earn");
    return {
      loanId: l.id,
      pnr: l.pnr,
      date: l.createdAt,
      travellers: l.travellers.map((t) => t.name).join(", "),
      amount: l.principal,
      plan: l.plan.label,
      status: l.status,
      dpd: l.dpd,
      baseMiles: base.reduce((s, e) => s + e.amount, 0),
      bonusMiles: bonus.reduce((s, e) => s + e.amount, 0),
      milesStatus: bonus[0]?.status ?? base[0]?.status ?? "pending",
      ledger: l.ledger,
    };
  });
  return NextResponse.json({ transactions });
}
