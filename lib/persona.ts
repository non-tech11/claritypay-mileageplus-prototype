import type { NextRequest } from "next/server";
import { PERSONAS } from "./seed";
import type { Persona } from "./types";

export const PERSONA_COOKIE = "cp_persona";

export function personaFromRequest(req: NextRequest): Persona {
  const id = req.cookies.get(PERSONA_COOKIE)?.value ?? "priya";
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];
}
