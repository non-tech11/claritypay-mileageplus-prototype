import { NextRequest, NextResponse } from "next/server";
import { financingMiles, previewMiles } from "@/lib/engine/loyalty";
import { buildPlans } from "@/lib/engine/loan";
import { personaFromRequest } from "@/lib/persona";
import { getStore } from "@/lib/store";
import type { Traveller } from "@/lib/types";

/**
 * Miles preview: base per traveller, plus a per-plan breakdown of
 * financing-funded miles (miles back by fare tier + Economy Plus bonus).
 * 0% APR plans earn no financing miles by design.
 */
export async function GET(req: NextRequest) {
  const amount = Number(req.nextUrl.searchParams.get("amount"));
  const travellerCount = Number(req.nextUrl.searchParams.get("travellers") ?? 1);
  const fare = Number(req.nextUrl.searchParams.get("fare") ?? amount * 0.89);
  const fareTier = req.nextUrl.searchParams.get("fareTier") ?? "economy-plus";
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "amount required" }, { status: 400 });
  }
  const persona = personaFromRequest(req);
  const config = getStore().config;

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

  // Base miles only in the lines (financing miles depend on the plan).
  const lines = previewMiles(fare, amount, travellers, config, false);
  const totalBase = lines.reduce((s, l) => s + l.baseMiles, 0);

  const ladder =
    persona.creditProfile === "thin" ? "prime" : persona.creditProfile;
  const perPlan = buildPlans(amount, ladder).map((p) => {
    const funded = financingMiles(amount, fareTier, p.apr, config);
    return {
      planId: p.id,
      label: p.label,
      apr: p.apr,
      recommended: !!p.recommended,
      milesBack: funded.milesBack,
      bonus: funded.bonus,
      financingTotal: funded.milesBack + funded.bonus,
    };
  });
  const best = Math.max(...perPlan.map((p) => p.financingTotal));

  return NextResponse.json({
    fareTier,
    lines,
    totalBase,
    perPlan,
    maxFinancingMiles: best,
    note:
      "0% APR plans earn no financing miles — the subsidised rate is the incentive. APR plans earn miles back (rate varies by fare tier); the Economy Plus bonus is identical on every APR term.",
  });
}
