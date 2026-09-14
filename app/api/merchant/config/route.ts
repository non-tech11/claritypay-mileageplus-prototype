import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import type { MerchantConfig } from "@/lib/types";

export async function GET() {
  return NextResponse.json(getStore().config);
}

type NumericKey =
  | "bonusFlatPerBooking"
  | "bonusPer100Financed"
  | "bonusCapPerBooking"
  | "bonusPostDelayDays"
  | "dpdFreezeThreshold"
  | "dpdReverseThreshold"
  | "baseMilesPerDollar"
  | "retroCreditWindowDays";

const NUMERIC_KEYS: NumericKey[] = [
  "bonusFlatPerBooking",
  "bonusPer100Financed",
  "bonusCapPerBooking",
  "bonusPostDelayDays",
  "dpdFreezeThreshold",
  "dpdReverseThreshold",
  "baseMilesPerDollar",
  "retroCreditWindowDays",
];

export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Partial<MerchantConfig>;
  const store = getStore();
  const updated = { ...store.config };
  for (const key of NUMERIC_KEYS) {
    const v = body[key];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
      updated[key] = v;
    }
  }
  // Per-fare-tier miles-back rates (numbers only, merged key by key).
  if (body.milesBackPer100 && typeof body.milesBackPer100 === "object") {
    const merged = { ...updated.milesBackPer100 };
    for (const [tier, v] of Object.entries(body.milesBackPer100)) {
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
        merged[tier] = v;
      }
    }
    updated.milesBackPer100 = merged;
  }
  if (updated.dpdReverseThreshold < updated.dpdFreezeThreshold) {
    return NextResponse.json(
      { error: "reverse threshold must be ≥ freeze threshold" },
      { status: 400 }
    );
  }
  store.config = updated;
  return NextResponse.json(updated);
}
