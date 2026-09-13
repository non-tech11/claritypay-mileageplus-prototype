"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { useApi } from "@/lib/api-client";
import { MetricTile } from "@/components/MetricTile";
import { SvgLineChart } from "@/components/SvgLineChart";
import { CardSkeleton } from "@/components/Skeleton";
import { ErrorRetry } from "@/components/ErrorRetry";
import type { MerchantMetrics } from "@/lib/types";

const money = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${n.toLocaleString()}`;

export default function OverviewPage() {
  const { data, loading, error, retry } = useApi<
    MerchantMetrics & { openExceptions: number }
  >("/api/merchant/metrics?window=30d");

  if (error) return <ErrorRetry message={error} onRetry={retry} />;
  if (loading || !data)
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <CardSkeleton key={i} lines={2} />
        ))}
      </div>
    );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900">Overview</h1>
        <p className="text-xs text-slate-500">
          Last 30 days · {data.openExceptions} open exception
          {data.openExceptions === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile
          label="Financed GMV (30d)"
          value={money(data.financedGmv30d)}
          metricClass="primary"
          definition="Gross booking value paid via ClarityPay financing in the window. The north-star volume metric for the partnership."
        />
        <MetricTile
          label="Take rate"
          value={`${data.takeRatePct}%`}
          metricClass="primary"
          definition="Share of eligible checkouts that chose pay-over-time. Primary adoption metric — read it alongside AOV and DPD to tell healthy growth from risk-driven growth."
        />
        <MetricTile
          label="Approval rate"
          value={`${data.approvalRatePct}%`}
          metricClass="diagnostic"
          definition="Approved prequals ÷ completed prequals. Diagnostic: a sudden rise can mean credit-box loosening — check DPD before celebrating."
        />
        <MetricTile
          label="AOV financed vs card"
          value={`$${data.avgOrderFinanced} / $${data.avgOrderCard}`}
          metricClass="diagnostic"
          definition="Average order value of financed bookings vs card bookings. Financing should lift basket size; the gap is the incrementality signal."
        />
        <MetricTile
          label="Bonus miles issued"
          value={data.bonusMilesIssued.toLocaleString()}
          metricClass="diagnostic"
          definition="ClarityPay-funded bonus miles issued in the window. This is the loyalty program's cost line, funded from merchant economics."
        />
        <MetricTile
          label="Bonus miles reversed"
          value={data.bonusMilesReversed.toLocaleString()}
          metricClass="guardrail"
          definition="Bonus miles clawed back via cancellations and 60+ DPD reversals. Rising reversals mean rewards are being issued on bookings that don't stick."
        />
        <MetricTile
          label="Reversal rate"
          value={`${data.reversalRatePct}%`}
          metricClass="guardrail"
          definition="Reversed ÷ issued bonus miles. Guardrail: above ~5% the earn experience starts feeling unreliable to members."
        />
        <MetricTile
          label="30+ DPD"
          value={`${data.dpd30PlusPct}%`}
          metricClass="guardrail"
          definition="Share of active loans 30+ days past due. Guardrail: growth that comes with rising DPD is unhealthy growth."
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-bold text-slate-800">
          Financed volume, daily
        </h2>
        <SvgLineChart points={data.gmvSeries} />
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-emerald-800">
            <TrendingUp size={15} aria-hidden /> Healthy growth
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-emerald-900">
            Take rate up <strong>while AOV is up and 30+ DPD is flat</strong> —
            customers use financing to buy more trip, and they repay. Bonus
            miles are doing their job: shifting share, not shifting risk.
          </p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-red-800">
            <TrendingDown size={15} aria-hidden /> Unhealthy growth
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-red-900">
            Take rate up <strong>while approvals shift to lower credit tiers
            and DPD rises</strong> — the incentive is recruiting borrowers who
            struggle to repay. Expect bonus reversals to climb next; tighten
            before the reversal rate breaches the guardrail.
          </p>
        </div>
      </section>
    </div>
  );
}
