import { NextResponse } from "next/server";
import { findLoan, getStore, replaceLoan } from "@/lib/store";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = getStore();
  const exception = store.exceptions.find((e) => e.id === id);
  if (!exception) {
    return NextResponse.json({ error: "exception not found" }, { status: 404 });
  }
  if (exception.status === "resolved") {
    return NextResponse.json({ error: "already resolved" }, { status: 400 });
  }

  // A retry re-attempts the loyalty posting for the affected loan.
  const loan = findLoan(exception.loanId);
  if (loan && exception.type === "failed_reward_posting") {
    const today = new Date().toISOString().slice(0, 10);
    replaceLoan({
      ...loan,
      ledger: loan.ledger.map((e) =>
        e.status === "pending_retry"
          ? { ...e, status: "posted" as const, reason: `Retry succeeded — posted ${today}` }
          : e
      ),
    });
  }
  store.exceptions = store.exceptions.map((e) =>
    e.id === id ? { ...e, status: "resolved" as const } : e
  );
  return NextResponse.json({ ok: true, resolved: id });
}
