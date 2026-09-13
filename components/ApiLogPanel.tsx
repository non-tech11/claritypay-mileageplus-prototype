"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { ChevronsRight, Terminal, Trash2 } from "lucide-react";
import {
  clearApiLog,
  getApiLog,
  installFetchLogger,
  subscribeApiLog,
  type ApiLogEntry,
} from "@/lib/api-log";

const METHOD_COLOR: Record<string, string> = {
  GET: "text-emerald-400",
  POST: "text-sky-400",
  PUT: "text-amber-400",
};

function statusColor(status: number | null): string {
  if (status === null) return "text-slate-500";
  if (status >= 500) return "text-red-400";
  if (status >= 400) return "text-amber-400";
  return "text-emerald-400";
}

function Row({ e }: { e: ApiLogEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="border-b border-white/5">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-baseline gap-2 px-3 py-1.5 text-left hover:bg-white/5"
      >
        <span className={`w-9 shrink-0 font-bold ${METHOD_COLOR[e.method] ?? "text-slate-300"}`}>
          {e.method}
        </span>
        <span className="min-w-0 flex-1 truncate text-slate-200">{e.path}</span>
        <span className={`shrink-0 font-semibold ${statusColor(e.status)}`}>
          {e.status === null ? "…" : e.status}
        </span>
        <span className="w-12 shrink-0 text-right text-slate-500">
          {e.status === null ? "" : `${e.ms}ms`}
        </span>
      </button>
      {open && (
        <div className="space-y-1.5 bg-black/30 px-3 pb-2 pt-1">
          {e.requestBody && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                Request
              </p>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-[10px] leading-snug text-sky-200">
                {e.requestBody}
              </pre>
            </div>
          )}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
              Response · {e.at}
            </p>
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap text-[10px] leading-snug text-emerald-200">
              {e.responseBody ?? "(pending)"}
            </pre>
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * Live API traffic, docked to the right of the prototype (≥1280px only).
 * Every fetch to /api/* — from any surface — appears here in real time,
 * so an interviewer sees the endpoints working while walking the UI.
 */
export function ApiLogPanel() {
  const pathname = usePathname();
  const entries = useSyncExternalStore(subscribeApiLog, getApiLog, () => []);
  // Open by default on the customer journey; collapsed on wide internal
  // surfaces (dashboard, api-docs) where it would cover content.
  const [open, setOpen] = useState<boolean | null>(null);
  const isCustomer = !pathname.startsWith("/dashboard") && pathname !== "/api-docs";
  const effectiveOpen = open ?? isCustomer;

  useEffect(() => {
    installFetchLogger();
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--api-panel-w",
      effectiveOpen ? "372px" : "0px"
    );
  }, [effectiveOpen]);

  return (
    <>
      {!effectiveOpen && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-0 top-1/2 z-40 hidden -translate-y-1/2 items-center gap-1 rounded-l-lg bg-slate-900 py-3 pl-2 pr-1.5 text-[10px] font-bold text-slate-300 shadow-lg hover:bg-slate-800 xl:flex"
          aria-label="Show API calls"
        >
          <Terminal size={13} aria-hidden />
          API
          {entries.length > 0 && (
            <span className="rounded-full bg-sky-500 px-1.5 text-white">
              {entries.length}
            </span>
          )}
        </button>
      )}
      <aside
        aria-label="Live API calls"
        className={`fixed bottom-0 right-0 top-[32px] z-40 hidden w-[372px] flex-col border-l border-white/10 bg-slate-950 font-mono text-[11px] xl:flex ${
          effectiveOpen ? "" : "translate-x-full"
        } transition-transform`}
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
          <Terminal size={13} className="text-sky-400" aria-hidden />
          <span className="font-sans text-xs font-bold text-slate-200">
            Mock API — live calls
          </span>
          <span className="rounded-full bg-white/10 px-1.5 font-sans text-[10px] text-slate-400">
            {entries.length}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={clearApiLog}
              aria-label="Clear log"
              className="rounded p-1 text-slate-400 hover:bg-white/10"
            >
              <Trash2 size={13} aria-hidden />
            </button>
            <button
              onClick={() => setOpen(false)}
              aria-label="Hide API calls"
              className="rounded p-1 text-slate-400 hover:bg-white/10"
            >
              <ChevronsRight size={14} aria-hidden />
            </button>
          </div>
        </div>
        <p className="border-b border-white/10 px-3 py-1.5 font-sans text-[10px] text-slate-500">
          Every request the prototype makes, as it happens. Click a row for
          request/response JSON. Full reference at /api-docs.
        </p>
        <ul className="flex-1 overflow-y-auto">
          {entries.map((e) => (
            <Row key={e.id} e={e} />
          ))}
          {entries.length === 0 && (
            <li className="px-3 py-6 text-center font-sans text-slate-500">
              No calls yet — interact with the prototype.
            </li>
          )}
        </ul>
      </aside>
    </>
  );
}
