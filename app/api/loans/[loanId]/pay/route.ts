import { NextResponse } from "next/server";
import { findLoan, replaceLoan } from "@/lib/store";

/**
 * Pay the next open instalment. Bringing the account current releases
 * held bonus miles; the first paid instalment posts a pending bonus.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ loanId: string }> }
) {
  const { loanId } = await params;
  const loan = findLoan(loanId);
  if (!loan) {
    return NextResponse.json({ error: "loan not found" }, { status: 404 });
  }
  const next = loan.schedule.find(
    (s) => s.status === "late" || s.status === "due"
  );
  if (!next) {
    return NextResponse.json({ error: "nothing due" }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const schedule = loan.schedule.map((s) =>
    s.idx === next.idx ? { ...s, status: "paid" as const, paidAt: today } : s
  );
  const anyLate = schedule.some((s) => s.status === "late");
  const allPaid = schedule.every(
    (s) => s.status === "paid" || s.status === "refunded" || s.status === "cancelled"
  );

  let ledger = loan.ledger;
  const firstPayment = loan.schedule.every((s) => s.status !== "paid");
  if (firstPayment || (!anyLate && loan.dpd > 0)) {
    ledger = ledger.map((e) => {
      if (e.type !== "bonus_earn" && e.type !== "miles_back_earn") return e;
      if (e.status === "pending") {
        return {
          ...e,
          status: "posted" as const,
          reason: "Posted after first on-time payment",
        };
      }
      if (e.status === "held" && !anyLate) {
        return {
          ...e,
          status: "posted" as const,
          reason: "Released — account brought current",
        };
      }
      return e;
    });
  }

  const updated = {
    ...loan,
    schedule,
    ledger,
    dpd: anyLate ? loan.dpd : 0,
    lateFee: anyLate ? loan.lateFee : 0,
    status: allPaid ? ("paid_off" as const) : anyLate ? loan.status : ("active" as const),
  };
  replaceLoan(updated);
  return NextResponse.json({ ok: true, paid: next, loan: updated });
}
