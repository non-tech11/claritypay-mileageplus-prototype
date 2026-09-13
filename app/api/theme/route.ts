import { NextRequest, NextResponse } from "next/server";
import { getTheme } from "@/lib/theme";

export async function GET(req: NextRequest) {
  const merchant = req.nextUrl.searchParams.get("merchant");
  return NextResponse.json(getTheme(merchant));
}
