import { NextResponse } from "next/server";
import { findLoan } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ loanId: string }> }
) {
  const { loanId } = await params;
  const loan = findLoan(loanId);
  if (!loan) {
    return NextResponse.json({ error: "loan not found" }, { status: 404 });
  }
  return NextResponse.json(loan);
}
