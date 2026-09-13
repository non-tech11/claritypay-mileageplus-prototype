import type { Loan, Offer } from "./types";
import { buildSeedState, type SeedState } from "./seed";

/**
 * In-memory prototype store. Lives on globalThis so it survives Next.js
 * dev-server HMR. Resets on serverless cold start — acceptable for a
 * prototype and documented in the README. POST /api/reset reseeds.
 */
interface Store extends SeedState {
  offers: Offer[];
}

const g = globalThis as unknown as { __clarityStore?: Store };

function freshStore(): Store {
  return { ...buildSeedState(), offers: [] };
}

export function getStore(): Store {
  if (!g.__clarityStore) g.__clarityStore = freshStore();
  return g.__clarityStore;
}

export function resetStore(): void {
  g.__clarityStore = freshStore();
}

export function findLoan(loanId: string): Loan | undefined {
  return getStore().loans.find((l) => l.id === loanId);
}

export function replaceLoan(updated: Loan): void {
  const store = getStore();
  store.loans = store.loans.map((l) => (l.id === updated.id ? updated : l));
}

let seq = 1100;
export function nextLoanId(): string {
  seq += 1;
  return `LN-${seq}`;
}

export function nextOfferId(): string {
  return `OF-${Date.now().toString(36).toUpperCase()}`;
}

const PNR_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generatePnr(): string {
  return Array.from(
    { length: 6 },
    () => PNR_CHARS[Math.floor(Math.random() * PNR_CHARS.length)]
  ).join("");
}
