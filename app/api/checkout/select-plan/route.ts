import { NextRequest, NextResponse } from "next/server";
import { buildSchedule } from "@/lib/engine/loan";
import { getStore, nextLoanId } from "@/lib/store";
import type { Loan, Traveller, Trip } from "@/lib/types";

interface SelectPlanBody {
  offerId?: string;
  planId?: string;
  autopay?: boolean;
}

export async function POST(req: NextRequest) {
  const { offerId, planId, autopay = true } =
    (await req.json().catch(() => ({}))) as SelectPlanBody;
  const store = getStore();
  const offer = store.offers.find((o) => o.id === offerId) as
    | (typeof store.offers)[number] & { travellers?: Traveller[]; trip?: Trip }
    | undefined;
  if (!offer) {
    return NextResponse.json({ error: "offer not found" }, { status: 404 });
  }
  const plan = offer.plans.find((p) => p.id === planId);
  if (!plan) {
    return NextResponse.json({ error: "plan not found on offer" }, { status: 404 });
  }

  const loan: Loan = {
    id: nextLoanId(),
    personaId: offer.personaId,
    pnr: "", // assigned at signing
    trip:
      offer.trip ?? {
        origin: "SFO",
        destination: "EWR",
        travelDate: "2026-10-12",
        fareLabel: "Economy Plus",
        fare: Math.round(offer.amount * 0.89 * 100) / 100,
        taxes: Math.round(offer.amount * 0.11 * 100) / 100,
      },
    principal: offer.amount,
    plan,
    autopay,
    status: "active",
    dpd: 0,
    lateFee: 0,
    schedule: buildSchedule(plan, new Date()),
    ledger: [],
    travellers: offer.travellers ?? [],
    documents: [{ id: `doc-agr-${Date.now()}`, title: "Loan agreement", note: "Pending signature" }],
    createdAt: new Date().toISOString().slice(0, 10),
  };
  store.loans.push(loan);

  return NextResponse.json({ loanId: loan.id, schedule: loan.schedule });
}
