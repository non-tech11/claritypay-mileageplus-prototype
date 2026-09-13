"use client";

import { useState } from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { postJson, useApi } from "@/lib/api-client";
import { CardSkeleton } from "@/components/Skeleton";
import { ErrorRetry } from "@/components/ErrorRetry";
import { useToast } from "@/components/Toast";
import type { OpsException } from "@/lib/types";

const TYPE_LABEL: Record<OpsException["type"], string> = {
  failed_reward_posting: "Failed reward posting",
  refund_awaiting_reversal: "Refund awaiting loyalty reversal",
  negative_miles_balance: "Negative miles balance",
  unmatched_loyalty_number: "Unmatched loyalty number",
};

export default function ExceptionsPage() {
  const { data, loading, error, retry } = useApi<{ exceptions: OpsException[] }>(
    "/api/merchant/exceptions"
  );
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const retryPosting = async (id: string) => {
    setBusy(id);
    try {
      await postJson(`/api/merchant/exceptions/${id}/retry`, {});
      toast("Retry succeeded — posting resolved");
      retry();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (error) return <ErrorRetry message={error} onRetry={retry} />;

  return (
    <div>
      <h1 className="mb-1 text-lg font-bold text-slate-900">Exceptions queue</h1>
      <p className="mb-4 text-xs text-slate-500">
        Loyalty operations that need a human or a retry. Loans are never
        blocked by loyalty failures — these are posting problems, not payment
        problems.
      </p>
      {loading || !data ? (
        <CardSkeleton lines={5} />
      ) : (
        <ul className="space-y-2">
          {data.exceptions.map((ex) => (
            <li
              key={ex.id}
              className={`flex flex-wrap items-center gap-3 rounded-xl border bg-white px-4 py-3 ${
                ex.status === "resolved" ? "border-slate-100 opacity-60" : "border-slate-200"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800">
                  {TYPE_LABEL[ex.type]}
                  <span className="ml-2 font-normal text-slate-400">
                    {ex.id} · {ex.pnr} · {ex.createdAt}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-slate-600">{ex.summary}</p>
              </div>
              {ex.status === "resolved" ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 size={14} aria-hidden /> Resolved
                </span>
              ) : ex.type === "failed_reward_posting" ? (
                <button
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                  disabled={busy !== null}
                  onClick={() => retryPosting(ex.id)}
                >
                  <RefreshCw
                    size={12}
                    className={busy === ex.id ? "animate-spin" : ""}
                    aria-hidden
                  />
                  Retry posting
                </button>
              ) : (
                <span className="text-[11px] text-slate-400">Awaiting upstream</span>
              )}
            </li>
          ))}
          {data.exceptions.length === 0 && (
            <li className="text-xs text-slate-400">Queue is empty.</li>
          )}
        </ul>
      )}
    </div>
  );
}
