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

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-800">
          Unit economics — one financed booking (illustrative)
        </h2>
        <p className="mb-3 text-xs text-slate-500">
          How the variables connect on a $1,000 Economy Plus booking, 12-month
          plan. ClarityPay funds all reward miles, purchased from the airline
          at the transfer price — cost scales with the Rewards page controls.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-xs">
            <tbody>
              {[
                ["Merchant fee to ClarityPay", "6.0% of booking", "+$60.00", "revenue"],
                ["Interest income (14.99% APR, 12mo)", "borne by customer", "+$82.00", "revenue"],
                ["Cost of funds", "~5% on outstanding balance", "−$27.00", "cost"],
                ["Expected credit loss", "2.0% of principal", "−$20.00", "cost"],
                ["Reward cost — trip miles", "4,500 mi × 0.6¢ purchased from airline", "−$27.00", "cost"],
                ["Reward cost — bonus miles", "3,000 mi × 0.6¢ purchased from airline", "−$18.00", "cost"],
                ["Servicing & ops", "per-loan allocation", "−$8.00", "cost"],
              ].map(([label, note, value, kind]) => (
                <tr key={label} className="border-b border-slate-100">
                  <td className="py-1.5 pr-2 font-medium text-slate-700">{label}</td>
                  <td className="py-1.5 pr-2 text-slate-400">{note}</td>
                  <td
                    className={`py-1.5 text-right font-semibold ${
                      kind === "revenue" ? "text-emerald-700" : "text-slate-700"
                    }`}
                  >
                    {value}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="py-2 pr-2 text-sm font-bold text-slate-900">
                  Contribution per financed booking
                </td>
                <td className="py-2 pr-2 text-[11px] text-slate-400">
                  before repeat-purchase lift
                </td>
                <td className="py-2 text-right text-sm font-bold text-emerald-700">
                  +$42.00
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
          The reward runs on a value arbitrage: miles bought at 0.6¢ are
          valued by members at ~1.3¢, so the $45 reward spend here reads as
          ~$97 of perceived value — every reward dollar lands at ~2.2×. And
          it pays twice: a member who redeems earned miles rebooks at ~1.4×
          the rate of a card payer (illustrative), so reward cost is partly
          acquisition spend for the next booking. Levers: each 1 mi/$ off
          the trip-miles earn rate adds ~$5.40 of contribution; take rate
          moves revenue linearly; if 30+ DPD rises 1pt, contribution drops
          ~$10, which is why the delinquency guardrail freezes the reward
          spend first.
        </p>
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
