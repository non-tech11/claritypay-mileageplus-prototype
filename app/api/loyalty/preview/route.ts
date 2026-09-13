import { NextRequest, NextResponse } from "next/server";
import { previewMiles } from "@/lib/engine/loyalty";
import { personaFromRequest } from "@/lib/persona";
import { getStore } from "@/lib/store";
import type { Traveller } from "@/lib/types";

export async function GET(req: NextRequest) {
  const amount = Number(req.nextUrl.searchParams.get("amount"));
  const travellerCount = Number(req.nextUrl.searchParams.get("travellers") ?? 1);
  const fare = Number(req.nextUrl.searchParams.get("fare") ?? amount * 0.89);
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "amount required" }, { status: 400 });
  }
  const persona = personaFromRequest(req);
  const travellers: Traveller[] = [
    {
      id: persona.id,
      name: persona.name,
      mileagePlusNumber: persona.mileagePlusNumber,
      isPayer: true,
    },
  ];
  if (travellerCount > 1) {
    travellers.push({ id: "alex", name: "Alex", mileagePlusNumber: null, isPayer: false });
  }
  const lines = previewMiles(fare, amount, travellers, getStore().config, true);
  return NextResponse.json({
    lines,
    totalBase: lines.reduce((s, l) => s + l.baseMiles, 0),
    totalBonus: lines.reduce((s, l) => s + l.bonusMiles, 0),
    note: "Bonus is identical across plan terms — longer terms earn nothing extra.",
  });
}
