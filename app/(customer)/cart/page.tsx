"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { loadDraft, saveDraft } from "@/lib/booking";
import { usePersona } from "@/lib/use-persona";
import { useApi } from "@/lib/api-client";
import { useTheme } from "@/app/theme-context";
import { PrototypeNotes } from "@/components/PrototypeNotes";
import type { FareOption } from "@/lib/types";

interface EstimateResponse {
  monthlyFrom: number;
}

export default function CartPage() {
  const router = useRouter();
  const theme = useTheme();
  const persona = usePersona();
  const [fare, setFare] = useState<FareOption | null>(null);
  const [twoTravellers, setTwoTravellers] = useState(false);
  const [alexMp, setAlexMp] = useState("");
  const [showAlexMp, setShowAlexMp] = useState(false);

  useEffect(() => {
    const draft = loadDraft();
    if (!draft.fare) {
      router.replace("/");
      return;
    }
    setFare(draft.fare);
    setTwoTravellers(draft.travellers.length > 1);
  }, [router]);

  const multiplier = twoTravellers ? 2 : 1;
  const total = fare ? fare.total * multiplier : 0;
  const estimate = useApi<EstimateResponse>(
    fare ? `/api/offers/estimate?amount=${total.toFixed(2)}` : null
  );

  if (!fare) return null;

  const buildTravellers = () => [
    {
      id: persona.id,
      name: persona.name,
      mileagePlusNumber: persona.mileagePlusNumber,
      isPayer: true,
    },
    ...(twoTravellers
      ? [
          {
            id: "alex",
            name: "Alex",
            mileagePlusNumber: alexMp.trim() || null,
            isPayer: false,
          },
        ]
      : []),
  ];

  const continueToPayment = () => {
    saveDraft({ travellers: buildTravellers() });
    router.push("/checkout");
  };

  return (
    <div className="flex min-h-full flex-col">
      <h1 className="mb-3 text-base font-bold">Review your trip</h1>

      <section className="card mb-3">
        <p className="text-sm font-semibold">
          SFO → EWR · {fare.label}
        </p>
        <p className="text-[11px] text-slate-500">Tue, Oct 12 · Nonstop · UA 1523</p>
      </section>

      <section className="card mb-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-bold">
            <Users size={14} aria-hidden /> Travellers
          </h2>
          <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
            <input
              type="checkbox"
              checked={twoTravellers}
              onChange={(e) => setTwoTravellers(e.target.checked)}
            />
            Add 2nd traveller
          </label>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold">{persona.name} (you)</p>
            <label className="label mt-1" htmlFor="mp-1">
              {theme.programName} number
            </label>
            <input
              id="mp-1"
              className="input"
              value={persona.mileagePlusNumber ?? ""}
              readOnly
            />
          </div>
          {twoTravellers && (
            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold">Alex</p>
              {showAlexMp ? (
                <>
                  <label className="label mt-1" htmlFor="mp-2">
                    {theme.programName} number
                  </label>
                  <input
                    id="mp-2"
                    className="input"
                    placeholder={`e.g. MP1234567`}
                    value={alexMp}
                    onChange={(e) => setAlexMp(e.target.value)}
                  />
                </>
              ) : (
                <button
                  className="mt-1 text-xs font-semibold underline"
                  style={{ color: "var(--brand)" }}
                  onClick={() => setShowAlexMp(true)}
                >
                  Add {theme.programName} # to earn {theme.unit}
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="card mb-4">
        <h2 className="mb-2 text-sm font-bold">Price summary</h2>
        <dl className="space-y-1 text-xs text-slate-600">
          <div className="flex justify-between">
            <dt>
              Fare × {multiplier}
            </dt>
            <dd>${(fare.fare * multiplier).toFixed(2)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Taxes &amp; fees</dt>
            <dd>${(fare.taxes * multiplier).toFixed(2)}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-100 pt-1 text-sm font-bold text-slate-900">
            <dt>Total</dt>
            <dd>${total.toFixed(2)}</dd>
          </div>
        </dl>
        {estimate.data && (
          // A representative figure, not an offer: no terms are quoted and
          // no plan is selectable until the eligibility check has run.
          <p className="mt-2 text-xs">
            <span className="font-semibold" style={{ color: "var(--brand)" }}>
              or from ${estimate.data.monthlyFrom.toFixed(0)}/mo
            </span>
            <span className="text-slate-500">
              {" "}
              with {theme.programName} pay over time
            </span>
            <span className="mt-0.5 block text-[10px] text-slate-400">
              Representative example. Your plans and rates are shown after a
              quick eligibility check at payment — it won&apos;t affect your
              credit score.
            </span>
          </p>
        )}
      </section>

      <button className="btn-primary" onClick={continueToPayment}>
        Continue to payment
      </button>

      <PrototypeNotes screen="cart" />
    </div>
  );
}
