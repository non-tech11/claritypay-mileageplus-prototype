"use client";

import { useState } from "react";
import { Loader2, Play } from "lucide-react";
import { API_ENDPOINTS, type EndpointDoc } from "@/lib/api-index";

const METHOD_STYLE: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-800",
  POST: "bg-blue-100 text-blue-800",
  PUT: "bg-amber-100 text-amber-800",
};

function EndpointCard({ ep }: { ep: EndpointDoc }) {
  const [response, setResponse] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [running, setRunning] = useState(false);

  const tryIt = async () => {
    if (!ep.tryPath) return;
    setRunning(true);
    setResponse(null);
    try {
      const res = await fetch(ep.tryPath, {
        method: ep.method,
        headers:
          ep.method === "GET" ? undefined : { "Content-Type": "application/json" },
        body:
          ep.method === "GET" || ep.tryBody === undefined
            ? undefined
            : JSON.stringify(ep.tryBody),
      });
      setStatus(res.status);
      const json = await res.json().catch(() => null);
      setResponse(JSON.stringify(json, null, 2));
    } catch (e) {
      setStatus(0);
      setResponse((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded px-2 py-0.5 font-mono text-[11px] font-bold ${METHOD_STYLE[ep.method]}`}
        >
          {ep.method}
        </span>
        <code className="min-w-0 flex-1 break-all font-mono text-xs text-slate-800">
          {ep.path}
        </code>
        {ep.tryPath && (
          <button
            onClick={tryIt}
            disabled={running}
            className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40"
          >
            {running ? (
              <Loader2 size={11} className="animate-spin" aria-hidden />
            ) : (
              <Play size={11} aria-hidden />
            )}
            Try it
          </button>
        )}
      </div>
      <p className="mt-1.5 text-xs text-slate-600">{ep.purpose}</p>
      {ep.sampleRequest !== undefined && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[11px] font-semibold text-slate-500">
            Sample request body
          </summary>
          <pre className="mt-1 overflow-x-auto rounded-lg bg-slate-900 p-3 text-[11px] leading-relaxed text-emerald-300">
            {JSON.stringify(ep.sampleRequest, null, 2)}
          </pre>
        </details>
      )}
      {response !== null && (
        <div className="mt-2">
          <p className="text-[11px] font-semibold text-slate-500">
            Response{status !== null && ` · HTTP ${status}`}
          </p>
          <pre className="mt-1 max-h-64 overflow-auto rounded-lg bg-slate-900 p-3 text-[11px] leading-relaxed text-sky-300">
            {response}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-lg font-bold text-slate-900">API reference</h1>
      <p className="mb-1 text-xs text-slate-500">
        Real Next.js route handlers over an in-memory store.{" "}
        <code className="font-mono">GET /api</code> returns this list as JSON.
      </p>
      <p className="mb-4 text-[11px] text-slate-400">
        POST endpoints that mutate state affect the customer and dashboard
        views immediately. State resets on cold start; POST /api/reset reseeds.
      </p>
      <div className="space-y-3">
        {API_ENDPOINTS.map((ep) => (
          <EndpointCard key={`${ep.method} ${ep.path}`} ep={ep} />
        ))}
      </div>
    </div>
  );
}
