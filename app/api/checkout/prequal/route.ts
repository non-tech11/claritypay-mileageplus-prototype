import { NextRequest, NextResponse } from "next/server";
import { buildPlans } from "@/lib/engine/loan";
import { personaFromRequest } from "@/lib/persona";
import { getStore, nextOfferId } from "@/lib/store";
import type { Traveller, Trip } from "@/lib/types";

interface PrequalBody {
  phone?: string;
  ssnLast4?: string;
  amount?: number;
  travellers?: Traveller[];
  trip?: Trip;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as PrequalBody;
  const { phone, ssnLast4, amount, travellers } = body;
  if (!phone || !ssnLast4 || !amount) {
    return NextResponse.json(
      { error: "phone, ssnLast4 and amount are required" },
      { status: 400 }
    );
  }

  const persona = personaFromRequest(req);

  // Thin file → soft decline. Soft pull only; no reason codes returned
  // beyond the legal minimum (adverse action notice sent separately).
  if (persona.creditProfile === "thin") {
    return NextResponse.json({
      decision: "declined" as const,
      offerId: null,
      plans: [],
    });
  }

  const store = getStore();
  const offerId = nextOfferId();
  const plans = buildPlans(amount, persona.creditProfile);
  store.offers.push({
    id: offerId,
    personaId: persona.id,
    amount,
    decision: "approved",
    plans,
    createdAt: new Date().toISOString(),
    // Extended prototype fields carried on the stored offer:
    ...({
      travellers:
        travellers && travellers.length > 0
          ? travellers
          : [
              {
                id: persona.id,
                name: persona.name,
                mileagePlusNumber: persona.mileagePlusNumber,
                isPayer: true,
              },
            ],
      trip: body.trip,
    } as object),
  });

  return NextResponse.json({ decision: "approved" as const, offerId, plans });
}
