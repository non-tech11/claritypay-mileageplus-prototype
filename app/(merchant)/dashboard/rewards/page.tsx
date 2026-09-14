"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { postJson, useApi } from "@/lib/api-client";
import { MilesPill } from "@/components/MilesPill";
import { CardSkeleton } from "@/components/Skeleton";
import { ErrorRetry } from "@/components/ErrorRetry";
import { useToast } from "@/components/Toast";
import type { MerchantConfig, MilesEntry, MilesStatus } from "@/lib/types";

interface TxRow {
  loanId: string;
  pnr: string;
  ledger: MilesEntry[];
  milesStatus: MilesStatus;
}

const FIELDS: {
  key: keyof MerchantConfig;
  label: string;
  hint: string;
}[] = [
  {
    key: "bonusFlatPerBooking",
    label: "Bonus miles per financed booking",
    hint: "Economy Plus + APR plans only; identical across APR terms",
  },
  {
    key: "bonusPer100Financed",
    label: "Extra bonus miles per $100 financed",
    hint: "0 = flat-only. Raising this rewards larger baskets",
  },
  {
    key: "bonusCapPerBooking",
    label: "Bonus cap per booking",
    hint: "Ceiling on total bonus, whatever the amount",
  },
  {
    key: "bonusPostDelayDays",
    label: "Hold period (days after first payment)",
    hint: "Bonus posts this many days after the first on-time instalment",
  },
  {
    key: "dpdFreezeThreshold",
    label: "Freeze bonus at (days past due)",
    hint: "Bonus miles held — recoverable if the account cures",
  },
  {
    key: "dpdReverseThreshold",
    label: "Reverse bonus at (days past due)",
    hint: "Bonus miles reversed; base miles never touched",
  },
];

export default function RewardsPage() {
  const toast = useToast();
  const config = useApi<MerchantConfig>("/api/merchant/config");
  const txs = useApi<{ transactions: TxRow[] }>("/api/merchant/transactions");
  const [form, setForm] = useState<Partial<MerchantConfig>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config.data) setForm(config.data);
  }, [config.data]);

  const save = async () => {
    setSaving(true);
    try {
      await postJson<MerchantConfig>("/api/merchant/config", form, "PUT");
      toast("Config saved — reflected in checkout on next load");
      config.retry();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const log =
    txs.data?.transactions.flatMap((t) =>
      t.ledger
        .filter((e) => e.type.startsWith("bonus") || e.type.startsWith("miles_back"))
        .map((e) => ({ ...e, pnr: t.pnr }))
    ) ?? [];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section>
        <h1 className="mb-3 text-lg font-bold text-slate-900">Program controls</h1>
        {config.error ? (
          <ErrorRetry message={config.error} onRetry={config.retry} />
        ) : config.loading ? (
          <CardSkeleton lines={6} />
        ) : (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <fieldset className="rounded-lg border border-slate-200 p-3">
              <legend className="px-1 text-[11px] font-bold text-slate-600">
                Miles back per $100 financed (APR plans only)
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {(["basic", "economy", "economy-plus"] as const).map((tier) => (
                  <div key={tier}>
                    <label className="label capitalize" htmlFor={`mb-${tier}`}>
                      {tier.replace("-", " ")}
                    </label>
                    <input
                      id={`mb-${tier}`}
                      type="number"
                      min={0}
                      className="input"
                      value={form.milesBackPer100?.[tier] ?? ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          milesBackPer100: {
                            ...(prev.milesBackPer100 ?? {}),
                            [tier]: Number(e.target.value),
                          },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                Differentiated by fare tier; 0% APR plans always earn none.
              </p>
            </fieldset>
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className="label" htmlFor={f.key}>
                  {f.label}
                </label>
                <input
                  id={f.key}
                  type="number"
                  min={0}
                  className="input"
                  value={(form[f.key] as number | undefined) ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      [f.key]: Number(e.target.value),
                    }))
                  }
                />
                <p className="mt-0.5 text-[10px] text-slate-400">{f.hint}</p>
              </div>
            ))}
            <button
              className="btn-primary flex items-center justify-center gap-2 !bg-slate-900"
              onClick={save}
              disabled={saving}
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" aria-hidden />
              ) : (
                <Save size={14} aria-hidden />
              )}
              Save config
            </button>
            <p className="text-[10px] text-slate-400">
              Changes apply to new checkouts immediately (config-driven earn) —
              open the customer journey after saving to verify.
            </p>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">
          Issuance &amp; reversal log
        </h2>
        {txs.error ? (
          <ErrorRetry message={txs.error} onRetry={txs.retry} />
        ) : txs.loading ? (
          <CardSkeleton lines={6} />
        ) : (
          <ul className="space-y-2">
            {log.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
              >
                <div>
                  <span className={e.amount < 0 ? "font-semibold text-red-700" : "font-semibold"}>
                    {e.amount > 0 ? "+" : ""}
                    {e.amount.toLocaleString()} mi
                  </span>
                  <span className="ml-1 text-slate-500">
                    · {e.pnr} · {e.type.replace(/_/g, " ")}
                  </span>
                  <p className="text-[10px] text-slate-400">{e.reason}</p>
                </div>
                <MilesPill status={e.status} />
              </li>
            ))}
            {log.length === 0 && (
              <li className="text-xs text-slate-400">No bonus activity yet.</li>
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
