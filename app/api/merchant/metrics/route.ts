import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function GET(req: NextRequest) {
  const window = req.nextUrl.searchParams.get("window") ?? "30d";
  const store = getStore();
  // Live counters derived from the ledger sit on top of the seeded series.
  const allEntries = store.loans.flatMap((l) => l.ledger);
  const liveBonusReversed = allEntries
    .filter((e) => e.type === "bonus_reversal")
    .reduce((s, e) => s + Math.abs(e.amount), 0);
  return NextResponse.json({
    window,
    ...store.metrics,
    bonusMilesReversed: store.metrics.bonusMilesReversed + liveBonusReversed,
    openExceptions: store.exceptions.filter((e) => e.status === "open").length,
  });
}
