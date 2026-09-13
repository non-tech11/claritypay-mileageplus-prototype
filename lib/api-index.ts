/** Single source of truth for /api (JSON index) and /api-docs (human page). */

export interface EndpointDoc {
  method: "GET" | "POST" | "PUT";
  path: string;
  purpose: string;
  sampleRequest?: unknown;
  /** Concrete path used by the api-docs "Try it" button. */
  tryPath?: string;
  tryBody?: unknown;
}

export const API_ENDPOINTS: EndpointDoc[] = [
  {
    method: "GET",
    path: "/api/offers/estimate?amount=",
    purpose: "Monthly estimate for the price-summary chip",
    tryPath: "/api/offers/estimate?amount=416.80",
  },
  {
    method: "POST",
    path: "/api/checkout/prequal",
    purpose: "Inline prequal: soft pull, returns decision + plans",
    sampleRequest: {
      phone: "415-555-0134",
      ssnLast4: "1234",
      amount: 416.8,
      travellers: [{ id: "priya", name: "Priya", mileagePlusNumber: "MP4821937", isPayer: true }],
    },
    tryPath: "/api/checkout/prequal",
    tryBody: {
      phone: "415-555-0134",
      ssnLast4: "1234",
      amount: 416.8,
      travellers: [{ id: "priya", name: "Priya", mileagePlusNumber: "MP4821937", isPayer: true }],
    },
  },
  {
    method: "POST",
    path: "/api/checkout/select-plan",
    purpose: "Lock a plan on an approved offer → loan + schedule",
    sampleRequest: { offerId: "OF-…", planId: "12mo", autopay: true },
  },
  {
    method: "POST",
    path: "/api/checkout/sign",
    purpose: "Sign the agreement → PNR + confirmation",
    sampleRequest: { loanId: "LN-1101" },
  },
  {
    method: "GET",
    path: "/api/loans",
    purpose: "Loans for the current persona (cookie)",
    tryPath: "/api/loans",
  },
  {
    method: "GET",
    path: "/api/loans/[loanId]",
    purpose: "Loan + schedule + miles ledger + documents",
    tryPath: "/api/loans/LN-1001",
  },
  {
    method: "POST",
    path: "/api/loans/[loanId]/pay",
    purpose: "Pay the next open instalment",
    tryPath: "/api/loans/LN-1001/pay",
    tryBody: {},
  },
  {
    method: "POST",
    path: "/api/loans/[loanId]/cancel",
    purpose: "Cancel trip: full or partial (per traveller)",
    sampleRequest: { scope: "full", travellerIds: [] },
    tryPath: "/api/loans/LN-1001/cancel",
    tryBody: { scope: "full", travellerIds: [] },
  },
  {
    method: "POST",
    path: "/api/loans/[loanId]/simulate",
    purpose: "Prototype scenario simulator (delinquency, reward failure, …)",
    sampleRequest: { scenario: "missed_payment" },
    tryPath: "/api/loans/LN-1001/simulate",
    tryBody: { scenario: "missed_payment" },
  },
  {
    method: "GET",
    path: "/api/loyalty/preview?amount=&travellers=",
    purpose: "Miles breakdown per traveller (base + bonus)",
    tryPath: "/api/loyalty/preview?amount=416.80&travellers=1",
  },
  {
    method: "POST",
    path: "/api/loyalty/post",
    purpose: "Internal: attempt to post miles; force failure with ?fail=1",
    tryPath: "/api/loyalty/post?fail=1",
    tryBody: { loanId: "LN-1001" },
  },
  {
    method: "POST",
    path: "/api/loyalty/reverse",
    purpose: "Reverse miles on a loan (reason, optional traveller)",
    sampleRequest: { loanId: "LN-1001", reason: "refund", travellerId: "priya" },
  },
  {
    method: "GET",
    path: "/api/loyalty/ledger/[loanId]",
    purpose: "Miles ledger for a loan",
    tryPath: "/api/loyalty/ledger/LN-1001",
  },
  {
    method: "GET",
    path: "/api/merchant/metrics?window=30d",
    purpose: "Dashboard overview metrics",
    tryPath: "/api/merchant/metrics?window=30d",
  },
  {
    method: "GET",
    path: "/api/merchant/transactions",
    purpose: "Financed bookings for the dashboard table",
    tryPath: "/api/merchant/transactions",
  },
  {
    method: "GET",
    path: "/api/merchant/exceptions",
    purpose: "Ops exceptions queue",
    tryPath: "/api/merchant/exceptions",
  },
  {
    method: "POST",
    path: "/api/merchant/exceptions/[id]/retry",
    purpose: "Retry a failed reward posting",
    tryPath: "/api/merchant/exceptions/EX-201/retry",
    tryBody: {},
  },
  {
    method: "GET",
    path: "/api/merchant/config",
    purpose: "Loyalty program config (bonus rate, cap, thresholds)",
    tryPath: "/api/merchant/config",
  },
  {
    method: "PUT",
    path: "/api/merchant/config",
    purpose: "Update config — reflected in checkout on next load",
    sampleRequest: { bonusFlatPerBooking: 500, bonusCapPerBooking: 1000 },
  },
  {
    method: "GET",
    path: "/api/theme?merchant=united|demo-retailer",
    purpose: "White-label theme config",
    tryPath: "/api/theme?merchant=united",
  },
  {
    method: "POST",
    path: "/api/reset",
    purpose: "Reseed all in-memory state",
    tryPath: "/api/reset",
    tryBody: {},
  },
];
