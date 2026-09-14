import { NextRequest, NextResponse } from "next/server";
import { financingMiles, previewMiles } from "@/lib/engine/loyalty";
import { buildPlans } from "@/lib/engine/loan";
import { personaFromRequest } from "@/lib/persona";
import { getStore } from "@/lib/store";
import type { Traveller } from "@/lib/types";

/**
 * Miles preview: base per traveller (1 mi/$ fare), plus the pay-over-time
 * bonus (0.5 mi/$ financed) — identical on every plan, 0% included.
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
  // Customer-facing model has exactly two reward types: base and bonus.
  const perPlan = buildPlans(amount, ladder).map((p) => {
    const { bonus } = financingMiles(amount, config);
    return {
      planId: p.id,
      label: p.label,
      apr: p.apr,
      recommended: !!p.recommended,
      bonus,
      financingTotal: bonus,
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
      "Every plan earns the same bonus — 0.5 mi per $ financed, 0% included. Longer terms earn no more.",
  });
}
