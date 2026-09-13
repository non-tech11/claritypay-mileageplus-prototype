"use client";

/**
 * Client-side log of every /api call the prototype makes, so the live
 * API traffic can be shown next to the walkthrough. Populated by a
 * window.fetch wrapper installed once by ApiLogPanel.
 */
export interface ApiLogEntry {
  id: number;
  method: string;
  path: string;
  status: number | null;
  ms: number;
  requestBody: string | null;
  responseBody: string | null;
  at: string;
}

const MAX_ENTRIES = 50;
const MAX_BODY = 2000;

let entries: ApiLogEntry[] = [];
let counter = 0;
const listeners = new Set<() => void>();

export function getApiLog(): ApiLogEntry[] {
  return entries;
}

export function clearApiLog(): void {
  entries = [];
  listeners.forEach((l) => l());
}

export function subscribeApiLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function truncate(s: string | null): string | null {
  if (!s) return s;
  return s.length > MAX_BODY ? `${s.slice(0, MAX_BODY)}\n… (truncated)` : s;
}

function pretty(raw: string | null): string | null {
  if (!raw) return null;
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export function installFetchLogger(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & { __cpFetchLogged?: boolean };
  if (w.__cpFetchLogged) return;
  w.__cpFetchLogged = true;

  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const path = url.replace(/^https?:\/\/[^/]+/, "");
    // Only the mock API: /api and /api/* — not the /api-docs page (or its
    // RSC prefetches).
    if (!/^\/api(\/|\?|$)/.test(path)) return original(input, init);

    const method = (init?.method ?? "GET").toUpperCase();
    const requestBody =
      typeof init?.body === "string" ? pretty(init.body) : null;
    const started = performance.now();
    const entry: ApiLogEntry = {
      id: ++counter,
      method,
      path,
      status: null,
      ms: 0,
      requestBody: truncate(requestBody),
      responseBody: null,
      at: new Date().toLocaleTimeString(),
    };
    entries = [entry, ...entries].slice(0, MAX_ENTRIES);
    listeners.forEach((l) => l());

    try {
      const res = await original(input, init);
      const clone = res.clone();
      const text = await clone.text().catch(() => "");
      entry.status = res.status;
      entry.ms = Math.round(performance.now() - started);
      entry.responseBody = truncate(pretty(text));
      entries = [...entries];
      listeners.forEach((l) => l());
      return res;
    } catch (err) {
      entry.status = 0;
      entry.ms = Math.round(performance.now() - started);
      entry.responseBody = (err as Error).message;
      entries = [...entries];
      listeners.forEach((l) => l());
      throw err;
    }
  };
}

// Install at module evaluation so the very first fetches on page load are
// captured, before any component effect runs.
installFetchLogger();
