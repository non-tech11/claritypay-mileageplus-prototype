"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FlaskConical, RotateCcw } from "lucide-react";
import { PERSONAS } from "@/lib/seed";
import { useToast } from "./Toast";

const PERSONA_COOKIE = "cp_persona";

function readPersonaCookie(): string {
  if (typeof document === "undefined") return "priya";
  const m = document.cookie.match(/(?:^|; )cp_persona=([^;]+)/);
  return m?.[1] ?? "priya";
}

/**
 * Neutral prototype toolbar — not part of the branded experience.
 * Persona switching stands in for auth per the brief.
 */
export function DemoBar() {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const current = readPersonaCookie();

  const setPersona = (id: string) => {
    document.cookie = `${PERSONA_COOKIE}=${id}; path=/; max-age=31536000`;
    router.refresh();
    const p = PERSONAS.find((x) => x.id === id);
    if (p) toast(`Persona: ${p.name} — ${p.description}`);
  };

  const reset = async () => {
    await fetch("/api/reset", { method: "POST" });
    toast("Prototype state reset to seed");
    router.refresh();
  };

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`rounded px-2 py-1 transition hover:bg-white/10 ${
        pathname === href ? "bg-white/15 font-semibold" : ""
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center gap-x-3 gap-y-1 bg-slate-900 px-3 py-1.5 text-xs text-slate-200">
      <span className="flex items-center gap-1 font-semibold uppercase tracking-wider text-slate-400">
        <FlaskConical size={12} aria-hidden /> Prototype
      </span>
      <label className="flex items-center gap-1.5">
        <span className="text-slate-400">Persona</span>
        <select
          aria-label="Demo persona"
          className="rounded bg-slate-700 px-1.5 py-0.5 text-xs text-white"
          value={current}
          onChange={(e) => setPersona(e.target.value)}
        >
          {PERSONAS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.tier}, {p.creditProfile}
            </option>
          ))}
        </select>
      </label>
      <nav aria-label="Prototype surfaces" className="flex items-center gap-1">
        {navLink("/", "Customer")}
        {navLink("/account", "My trips")}
        {navLink("/dashboard", "United dashboard")}
        {navLink("/api-docs", "API")}
      </nav>
      <button
        onClick={reset}
        className="ml-auto flex items-center gap-1 rounded px-2 py-1 transition hover:bg-white/10"
      >
        <RotateCcw size={12} aria-hidden /> Reset data
      </button>
    </div>
  );
}
