"use client";

import type { FareOption, Plan, Traveller } from "./types";

/** Client-side booking draft, kept in sessionStorage across checkout steps. */
export interface BookingDraft {
  fare: FareOption | null;
  travellers: Traveller[];
  offerId: string | null;
  plans: Plan[];
  selectedPlanId: string | null;
  autopay: boolean;
  loanId: string | null;
  pnr: string | null;
  declined: boolean;
}

const KEY = "cp_booking_draft";

export const EMPTY_DRAFT: BookingDraft = {
  fare: null,
  travellers: [],
  offerId: null,
  plans: [],
  selectedPlanId: null,
  autopay: true,
  loanId: null,
  pnr: null,
  declined: false,
};

export function loadDraft(): BookingDraft {
  if (typeof window === "undefined") return EMPTY_DRAFT;
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? { ...EMPTY_DRAFT, ...(JSON.parse(raw) as BookingDraft) } : EMPTY_DRAFT;
  } catch {
    return EMPTY_DRAFT;
  }
}

export function saveDraft(patch: Partial<BookingDraft>): BookingDraft {
  const next = { ...loadDraft(), ...patch };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Session storage unavailable (private mode) — draft lives in memory only.
  }
  return next;
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
