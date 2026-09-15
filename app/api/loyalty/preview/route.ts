import { NextRequest, NextResponse } from "next/server";
import { financingMiles, previewMiles, termMonthsFor } from "@/lib/engine/loyalty";
import { buildPlans } from "@/lib/engine/loan";
import { personaFromRequest } from "@/lib/persona";
import { getStore } from "@/lib/store";
import type { Traveller } from "@/lib/types";

/**
 * Miles preview: base per traveller (1 mi/$ fare) and the pay-over-time
 * bonus (0.5 mi/$ financed, Economy Plus only) — on APR-bearing plans.
 * A 0% plan earns nothing: the subsidised rate is the reward. The bonus
 * is paid in full at the reference term and tapers beyond it, so each
 * per-plan row carries its own figure.
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

  // Base as earned on an APR (monthly) plan — the number the chips and
  // wallet quote. A 0% plan earns nothing; per-plan rows carry the truth.
  const lines = previewMiles(
    fare, amount, travellers, config, true, fareTier, 14.99,
    config.bonusReferenceTermMonths
  );
  const totalBase = lines.reduce((s, l) => s + l.baseMiles, 0);

  const ladder =
    persona.creditProfile === "thin" ? "prime" : persona.creditProfile;
  // Customer-facing model has exactly two reward types: base and bonus.
  const perPlan = buildPlans(amount, ladder).map((p) => {
    const { bonus } = financingMiles(amount, fareTier, p.apr, config, termMonthsFor(p));
    const baseTotal = p.apr > 0 ? totalBase : 0;
    return {
      planId: p.id,
      label: p.label,
      apr: p.apr,
      recommended: !!p.recommended,
      bonus,
      financingTotal: bonus,
      baseTotal,
      totalMiles: baseTotal + bonus,
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
      "Rewards apply on monthly (APR) plans: 1 mi/$ of fare, plus 0.5 bonus mi/$ financed on Economy Plus. A 0% plan earns none — the subsidised rate is the reward. The bonus is paid in full over the reference term and tapers on longer ones, so a 24-month plan earns half what a 12-month plan earns.",
  });
}
