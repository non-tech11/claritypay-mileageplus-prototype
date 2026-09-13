"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Info } from "lucide-react";
import { loadDraft, type BookingDraft } from "@/lib/booking";
import { useApi } from "@/lib/api-client";
import { useTheme } from "@/app/theme-context";
import {
  ADVERSE_ACTION_LINK_TEXT,
  DECLINE_BODY,
  DECLINE_HEADLINE,
} from "@/lib/copy";
import { PrototypeNotes } from "@/components/PrototypeNotes";
import { useScopeToast } from "@/components/Toast";

interface PreviewResponse {
  totalBase: number;
}

export default function DeclinedPage() {
  const router = useRouter();
  const theme = useTheme();
  const scopeToast = useScopeToast();
  const [draft, setDraft] = useState<BookingDraft | null>(null);

  useEffect(() => {
    const d = loadDraft();
    if (!d.fare) {
      router.replace("/");
      return;
    }
    setDraft(d);
  }, [router]);

  const multiplier = draft && draft.travellers.length > 1 ? 2 : 1;
  const total = draft?.fare ? Number((draft.fare.total * multiplier).toFixed(2)) : 0;
  // Base miles only — the bonus rewards financing, which didn't happen.
  const preview = useApi<PreviewResponse>(
    draft?.fare
      ? `/api/loyalty/preview?amount=${total}&fare=${draft.fare.fare * multiplier}&travellers=${multiplier}`
      : null
  );

  if (!draft?.fare) return null;

  return (
    <div className="flex min-h-full flex-col">
      <h1 className="mb-1 text-base font-bold">{DECLINE_HEADLINE}</h1>
      <p className="mb-3 text-xs text-slate-600">{DECLINE_BODY}</p>

      <button
        className="mb-3 flex items-start gap-1.5 text-left text-[11px] underline"
        style={{ color: "var(--brand)" }}
        onClick={scopeToast}
      >
        <Info size={12} className="mt-0.5 shrink-0" aria-hidden />
        {ADVERSE_ACTION_LINK_TEXT}
      </button>

      {preview.data && (
        <p className="mb-4 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
          You&apos;ll still earn{" "}
          <strong>
            {preview.data.totalBase.toLocaleString()} {theme.unit}
          </strong>{" "}
          on this booking.
        </p>
      )}

      {/* One-tap fallback: same booking, same details, nothing re-entered. */}
      <button
        className="btn-primary flex items-center justify-center gap-2"
        onClick={() => router.push("/confirmation?method=card")}
      >
        <CreditCard size={16} aria-hidden /> Pay ${total.toFixed(2)} with card ending 4482
      </button>
      <button className="btn-secondary mt-2" onClick={() => router.push("/checkout")}>
        Back to payment options
      </button>
      <PrototypeNotes screen="declined" />
    </div>
  );
}
