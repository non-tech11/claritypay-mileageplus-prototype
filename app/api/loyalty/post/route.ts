import { NextRequest, NextResponse } from "next/server";
import { findLoan, getStore, replaceLoan } from "@/lib/store";

/** Internal posting attempt. ?fail=1 simulates the loyalty API being down. */
export async function POST(req: NextRequest) {
  const { loanId } = (await req.json().catch(() => ({}))) as { loanId?: string };
  const loan = loanId ? findLoan(loanId) : undefined;
  if (!loan) {
    return NextResponse.json({ error: "loan not found" }, { status: 404 });
  }
  const store = getStore();
  const today = new Date().toISOString().slice(0, 10);

  if (req.nextUrl.searchParams.get("fail") === "1") {
    replaceLoan({
      ...loan,
      ledger: loan.ledger.map((e) =>
        e.status === "pending"
          ? {
              ...e,
              status: "pending_retry" as const,
              reason: "MileagePlus posting failed — retrying, posts within 72 hours",
            }
          : e
      ),
    });
    store.exceptions.push({
      id: `EX-${Date.now().toString(36).toUpperCase()}`,
      type: "failed_reward_posting",
      loanId: loan.id,
      pnr: loan.pnr,
      summary: "Posting attempt failed (forced via ?fail=1)",
      status: "open",
      createdAt: today,
    });
    return NextResponse.json(
      { ok: false, error: "loyalty API unavailable", queued: true },
      { status: 502 }
    );
  }

  let postedCount = 0;
  replaceLoan({
    ...loan,
    ledger: loan.ledger.map((e) => {
      if (e.status === "pending" || e.status === "pending_retry") {
        postedCount += 1;
        return { ...e, status: "posted" as const, reason: `Posted ${today}` };
      }
      return e;
    }),
  });
  return NextResponse.json({ ok: true, posted: postedCount });
}
