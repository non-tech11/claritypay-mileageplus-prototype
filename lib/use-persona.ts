"use client";

import { PERSONAS } from "./seed";
import type { Persona } from "./types";

/** Active demo persona from the cookie (client side). */
export function usePersona(): Persona {
  let id = "priya";
  if (typeof document !== "undefined") {
    const m = document.cookie.match(/(?:^|; )cp_persona=([^;]+)/);
    if (m) id = m[1];
  }
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];
}
