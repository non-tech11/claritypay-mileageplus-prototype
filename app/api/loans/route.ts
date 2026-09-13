import { NextRequest, NextResponse } from "next/server";
import { personaFromRequest } from "@/lib/persona";
import { getStore } from "@/lib/store";

export async function GET(req: NextRequest) {
  const persona = personaFromRequest(req);
  const loans = getStore().loans.filter((l) => l.personaId === persona.id);
  return NextResponse.json({ personaId: persona.id, loans });
}
