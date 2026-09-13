import { NextRequest, NextResponse } from "next/server";
import { estimateMonthly } from "@/lib/engine/loan";

export async function GET(req: NextRequest) {
  const amount = Number(req.nextUrl.searchParams.get("amount"));
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "amount required" }, { status: 400 });
  }
  return NextResponse.json({
    amount,
    monthlyFrom: estimateMonthly(amount),
    note: "Illustrative estimate; final terms subject to eligibility",
  });
}
