"use client";

import { useRouter } from "next/navigation";
import { Plane } from "lucide-react";
import { FARES } from "@/lib/seed";
import { saveDraft } from "@/lib/booking";
import { useApi } from "@/lib/api-client";
import { useTheme } from "@/app/theme-context";
import { LoyaltyCard } from "@/components/LoyaltyCard";
import { PrototypeNotes } from "@/components/PrototypeNotes";
import { CardSkeleton } from "@/components/Skeleton";
import { ErrorRetry } from "@/components/ErrorRetry";
import type { FareOption } from "@/lib/types";

interface EstimateResponse {
  monthlyFrom: number;
}
interface PreviewResponse {
  totalBase: number;
  maxFinancingMiles: number;
}

function FareCard({
  fare,
  highlight,
  onSelect,
}: {
  fare: FareOption;
  highlight: boolean;
  onSelect: () => void;
}) {
  const theme = useTheme();
  const estimate = useApi<EstimateResponse>(
    `/api/offers/estimate?amount=${fare.total}`
  );
  const preview = useApi<PreviewResponse>(
    highlight
      ? `/api/loyalty/preview?amount=${fare.total}&fare=${fare.fare}&travellers=1&fareTier=${fare.id}`
      : null
  );

  return (
    <article
      className={`card ${highlight ? "border-2" : ""}`}
      style={highlight ? { borderColor: "var(--brand)" } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold">{fare.label}</h2>
          <ul className="mt-1 space-y-0.5 text-[11px] text-slate-500">
            {fare.perks.map((p) => (
              <li key={p}>· {p}</li>
            ))}
          </ul>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">${fare.total.toFixed(2)}</p>
          {estimate.loading ? (
            <p className="text-[11px] text-slate-400">…</p>
          ) : estimate.data ? (
            <p className="text-[11px] font-medium" style={{ color: "var(--brand)" }}>
              or from ${estimate.data.monthlyFrom.toFixed(0)}/mo
            </p>
          ) : null}
        </div>
      </div>
      {highlight && preview.data && (
        <div className="mt-2">
          <LoyaltyCard
            variant="chip"
            tierName=""
            balance={0}
            chipText={`Earn up to ${preview.data.totalBase.toLocaleString()} ${theme.unit} · up to +${preview.data.maxFinancingMiles.toLocaleString()} more if you pay over time`}
          />
        </div>
      )}
      <button onClick={onSelect} className="btn-primary mt-3">
        Select
      </button>
    </article>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const theme = useTheme();
  const anyFailed = useApi<EstimateResponse>(
    `/api/offers/estimate?amount=${FARES[0].total}`
  );

  const select = (fare: FareOption) => {
    saveDraft({
      fare,
      travellers: [],
      offerId: null,
      plans: [],
      selectedPlanId: null,
      loanId: null,
      pnr: null,
      declined: false,
    });
    router.push("/cart");
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
        <Plane size={14} aria-hidden />
        <span className="font-semibold text-slate-700">SFO → EWR</span>
        <span>· Tue, Oct 12 · 1 adult</span>
      </div>
      <h1 className="mb-3 text-base font-bold">Choose your fare</h1>
      {anyFailed.error ? (
        <ErrorRetry message={anyFailed.error} onRetry={anyFailed.retry} />
      ) : anyFailed.loading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="space-y-3">
          {FARES.map((f) => (
            <FareCard
              key={f.id}
              fare={f}
              highlight={f.id === "economy-plus"}
              onSelect={() => select(f)}
            />
          ))}
        </div>
      )}
      <p className="mt-3 text-[10px] text-slate-400">
        Monthly estimates are illustrative. {theme.programName} members earn on
        the fare, excluding taxes and fees.
      </p>
      <PrototypeNotes screen="search" />
    </div>
  );
}
