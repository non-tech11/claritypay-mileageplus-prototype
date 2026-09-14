import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import type { MerchantConfig } from "@/lib/types";

export async function GET() {
  return NextResponse.json(getStore().config);
}

type NumericKey =
  | "bonusMilesPerDollar"
  | "bonusCapPerBooking"
  | "bonusPostDelayDays"
  | "dpdFreezeThreshold"
  | "dpdReverseThreshold"
  | "baseMilesPerDollar"
  | "retroCreditWindowDays";

const NUMERIC_KEYS: NumericKey[] = [
  "bonusMilesPerDollar",
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
  if (updated.dpdReverseThreshold < updated.dpdFreezeThreshold) {
    return NextResponse.json(
      { error: "reverse threshold must be ≥ freeze threshold" },
      { status: 400 }
    );
  }
  store.config = updated;
  return NextResponse.json(updated);
}
