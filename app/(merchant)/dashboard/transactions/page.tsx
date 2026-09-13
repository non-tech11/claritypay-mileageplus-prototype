"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useApi } from "@/lib/api-client";
import { MilesPill } from "@/components/MilesPill";
import { CardSkeleton } from "@/components/Skeleton";
import { ErrorRetry } from "@/components/ErrorRetry";
import type { MilesEntry, MilesStatus } from "@/lib/types";

interface TxRow {
  loanId: string;
  pnr: string;
  date: string;
  travellers: string;
  amount: number;
  plan: string;
  status: string;
  dpd: number;
  baseMiles: number;
  bonusMiles: number;
  milesStatus: MilesStatus;
  ledger: MilesEntry[];
}

const STATUSES = ["all", "active", "delinquent", "cancelled", "paid_off"];

export default function TransactionsPage() {
  const { data, loading, error, retry } = useApi<{ transactions: TxRow[] }>(
    "/api/merchant/transactions"
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<TxRow | null>(null);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.transactions.filter(
      (t) =>
        (statusFilter === "all" || t.status === statusFilter) &&
        (query === "" ||
          t.pnr.toLowerCase().includes(query.toLowerCase()) ||
          t.travellers.toLowerCase().includes(query.toLowerCase()))
    );
  }, [data, statusFilter, query]);

  if (error) return <ErrorRetry message={error} onRetry={retry} />;

  return (
    <div>
      <h1 className="mb-3 text-lg font-bold text-slate-900">Financed bookings</h1>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          className="input max-w-56 !py-1.5 text-xs"
          placeholder="Search PNR or traveller"
          aria-label="Search transactions"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex gap-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs capitalize ${
                statusFilter === s
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {loading || !data ? (
        <CardSkeleton lines={6} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">PNR</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Traveller(s)</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Base / bonus mi</th>
                <th className="px-3 py-2">Miles</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr
                  key={t.loanId}
                  className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  onClick={() => setSelected(t)}
                >
                  <td className="px-3 py-2 font-semibold">{t.pnr || "—"}</td>
                  <td className="px-3 py-2">{t.date}</td>
                  <td className="px-3 py-2">{t.travellers}</td>
                  <td className="px-3 py-2 text-right">${t.amount.toFixed(2)}</td>
                  <td className="px-3 py-2">{t.plan}</td>
                  <td className="px-3 py-2 capitalize">
                    {t.status.replace("_", " ")}
                    {t.dpd > 0 && (
                      <span className="ml-1 text-red-600">({t.dpd} DPD)</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {t.baseMiles.toLocaleString()} / {t.bonusMiles.toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <MilesPill status={t.milesStatus} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-slate-400">
                    No bookings match the filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Ledger drawer */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/30"
          role="dialog"
          aria-modal="true"
          aria-label={`Ledger for ${selected.pnr}`}
          onClick={() => setSelected(null)}
        >
          <div
            className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">
                {selected.pnr} · {selected.loanId}
              </h2>
              <button aria-label="Close" onClick={() => setSelected(null)}>
                <X size={18} aria-hidden />
              </button>
            </div>
            <p className="mb-3 text-xs text-slate-500">
              {selected.travellers} · ${selected.amount.toFixed(2)} · {selected.plan}
            </p>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              Full miles ledger
            </h3>
            <ul className="space-y-2">
              {selected.ledger.map((e) => (
                <li key={e.id} className="rounded-lg border border-slate-100 p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className={e.amount < 0 ? "font-semibold text-red-700" : "font-semibold"}>
                      {e.amount > 0 ? "+" : ""}
                      {e.amount.toLocaleString()} mi · {e.type.replace(/_/g, " ")}
                    </span>
                    <MilesPill status={e.status} />
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {e.date} · {e.travellerName} · {e.reason}
                  </p>
                </li>
              ))}
              {selected.ledger.length === 0 && (
                <li className="text-xs text-slate-400">No ledger entries.</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
