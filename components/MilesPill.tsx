import type { MilesStatus } from "@/lib/types";

const STYLES: Record<MilesStatus, string> = {
  pending: "bg-slate-100 text-slate-600 border-slate-300",
  posted: "bg-emerald-50 text-emerald-700 border-emerald-300",
  held: "bg-amber-50 text-amber-700 border-amber-300",
  reversed: "bg-red-50 text-red-700 border-red-300",
  pending_retry: "bg-blue-50 text-blue-700 border-blue-300",
};

/** Operational labels — merchant dashboard and API views. */
const OPS_LABELS: Record<MilesStatus, string> = {
  pending: "pending",
  posted: "posted",
  held: "held",
  reversed: "reversed",
  pending_retry: "pending — retrying",
};

/** Customer-facing labels — the unlock metaphor. */
const CUSTOMER_LABELS: Record<MilesStatus, string> = {
  pending: "unlocking soon",
  posted: "unlocked",
  held: "on hold",
  reversed: "removed",
  pending_retry: "unlocking soon — retrying",
};

export function MilesPill({
  status,
  customer = false,
}: {
  status: MilesStatus;
  customer?: boolean;
}) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${STYLES[status]}`}
    >
      {(customer ? CUSTOMER_LABELS : OPS_LABELS)[status]}
    </span>
  );
}
