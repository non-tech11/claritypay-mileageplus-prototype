"use client";

import { useState } from "react";
import { Info } from "lucide-react";

export type MetricClass = "primary" | "diagnostic" | "guardrail";

const CLASS_STYLE: Record<MetricClass, string> = {
  primary: "bg-blue-50 text-blue-700 border-blue-200",
  diagnostic: "bg-slate-100 text-slate-600 border-slate-200",
  guardrail: "bg-amber-50 text-amber-700 border-amber-200",
};

/** Overview tile with an ⓘ definition and its role in the metric tree. */
export function MetricTile({
  label,
  value,
  definition,
  metricClass,
  sub,
}: {
  label: string;
  value: string;
  definition: string;
  metricClass: MetricClass;
  sub?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-1">
        <p className="text-[11px] font-medium text-slate-500">{label}</p>
        <button
          aria-label={`Definition of ${label}`}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="text-slate-400 hover:text-slate-600"
        >
          <Info size={13} aria-hidden />
        </button>
      </div>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
      <span
        className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${CLASS_STYLE[metricClass]}`}
      >
        {metricClass}
      </span>
      {open && (
        <div className="absolute left-2 right-2 top-full z-20 mt-1 rounded-lg border border-slate-200 bg-white p-2 text-[11px] text-slate-600 shadow-lg">
          {definition}
        </div>
      )}
    </div>
  );
}
