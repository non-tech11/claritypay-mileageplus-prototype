import { ArrowLeftRight, ArrowRight, Lock } from "lucide-react";

interface DataRow {
  item: string;
  united: string;
  claritypay: string;
  mileageplus: string;
  movement: React.ReactNode;
}

const ROWS: DataRow[] = [
  {
    item: "PNR, itinerary, fare breakdown",
    united: "Collects & holds (system of record)",
    claritypay: "Receives fare + amount for underwriting & earn calc",
    mileageplus: "Receives PNR reference for posting",
    movement: (
      <span className="flex items-center gap-1">
        United <ArrowRight size={11} aria-hidden /> ClarityPay, United{" "}
        <ArrowRight size={11} aria-hidden /> MileagePlus
      </span>
    ),
  },
  {
    item: "Traveller loyalty IDs (MileagePlus #)",
    united: "Collects at booking",
    claritypay: "Passes through, stores reference only",
    mileageplus: "Holds (member records)",
    movement: (
      <span className="flex items-center gap-1">
        United <ArrowRight size={11} aria-hidden /> ClarityPay{" "}
        <ArrowRight size={11} aria-hidden /> MileagePlus
      </span>
    ),
  },
  {
    item: "Phone, last-4 SSN, credit application",
    united: "Never sees",
    claritypay: "Collects & holds (lender of record)",
    mileageplus: "Never sees",
    movement: (
      <span className="flex items-center gap-1 font-semibold text-red-700">
        <Lock size={11} aria-hidden /> Never leaves ClarityPay
      </span>
    ),
  },
  {
    item: "Full credit decision, score band, bank details",
    united: "Never sees (only approved / declined)",
    claritypay: "Holds",
    mileageplus: "Never sees",
    movement: (
      <span className="flex items-center gap-1 font-semibold text-red-700">
        <Lock size={11} aria-hidden /> Never leaves ClarityPay
      </span>
    ),
  },
  {
    item: "Loan status, instalment events, DPD",
    united: "Receives aggregate metrics in this dashboard",
    claritypay: "Collects & holds (servicer)",
    mileageplus: "Receives hold / reverse triggers only",
    movement: (
      <span className="flex items-center gap-1">
        ClarityPay <ArrowRight size={11} aria-hidden /> United (aggregated),
        ClarityPay <ArrowRight size={11} aria-hidden /> MileagePlus (triggers)
      </span>
    ),
  },
  {
    item: "Bonus miles instructions (issue / hold / reverse)",
    united: "Sees in rewards log",
    claritypay: "Originates per program rules",
    mileageplus: "Executes posting",
    movement: (
      <span className="flex items-center gap-1">
        ClarityPay <ArrowRight size={11} aria-hidden /> MileagePlus
      </span>
    ),
  },
  {
    item: "Miles balances & member tier",
    united: "Reads for display",
    claritypay: "Reads preview totals only, never stores balances",
    mileageplus: "Holds (system of record)",
    movement: (
      <span className="flex items-center gap-1">
        MileagePlus <ArrowLeftRight size={11} aria-hidden /> read-only lookups
      </span>
    ),
  },
];

export default function DataMapPage() {
  return (
    <div>
      <h1 className="mb-1 text-lg font-bold text-slate-900">Data map</h1>
      <p className="mb-4 max-w-2xl text-xs text-slate-500">
        Who collects what, who holds what, and what moves across the seams.
        The privacy posture in one table: credit data never leaves the lender,
        loyalty balances never leave the program, and United shares booking
        context — not member finances.
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[820px] text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">United</th>
              <th className="px-3 py-2">ClarityPay</th>
              <th className="px-3 py-2">MileagePlus system</th>
              <th className="px-3 py-2">Movement</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.item} className="border-b border-slate-100 align-top last:border-0">
                <td className="px-3 py-2.5 font-semibold text-slate-800">{r.item}</td>
                <td className="px-3 py-2.5 text-slate-600">{r.united}</td>
                <td className="px-3 py-2.5 text-slate-600">{r.claritypay}</td>
                <td className="px-3 py-2.5 text-slate-600">{r.mileageplus}</td>
                <td className="px-3 py-2.5 text-slate-600">{r.movement}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
