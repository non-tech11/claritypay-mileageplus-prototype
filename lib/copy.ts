/**
 * Regulated copy lives here and only here. Never free-type disclosures
 * in components — import these constants.
 */

export const LENDER_DISCLOSURE =
  "Loans provided by Demo Bank, Member FDIC, serviced by ClarityPay, Inc. " +
  "Rates from 0–29.99% APR based on creditworthiness. Checking eligibility " +
  "uses a soft credit inquiry and will not affect your credit score. " +
  "Illustrative terms for prototype purposes only.";

export const POWERED_BY = "Powered by ClarityPay";

export const STATEMENT_FOOTER =
  "Loans provided by Demo Bank, serviced by ClarityPay.";

export const SOFT_PULL_NOTE = "Checking eligibility won't affect your credit score";

export const DECLINE_HEADLINE = "We couldn't offer a plan today";

export const DECLINE_BODY =
  "This doesn't affect your credit score, and you can still complete this " +
  "booking with another payment method.";

export const ADVERSE_ACTION_LINK_TEXT =
  "You'll receive a notice explaining this decision (adverse action notice)";

export const LATE_FEE_DISCLOSURE =
  "A late fee of up to $7 may apply after a 10-day grace period, as set out in your loan agreement.";

export const REWARD_RETRY_NOTE =
  "We'll post these within 72 hours — no action needed.";

export const MILES_TIMING_BASE =
  "Base miles are earned by flying and are credited after your flight, per MileagePlus program rules.";

export const MILES_TIMING_BONUS =
  "Bonus miles are credited when your payment plan completes — after your final payment.";

export const MILES_TIMING_REVERSAL =
  "Both are reversed if the booking is cancelled.";

/** Per-screen prototype notes — the "voiceover" for interviewers. */
export const PROTOTYPE_NOTES: Record<string, string> = {
  search:
    "Discovery placement: one light monthly-price line per fare, and a single loyalty chip on the fare most likely to be financed. Deliberately no heavy loyalty sell here — discovery earns attention, checkout earns conversion.",
  cart:
    "The monthly figure matches search (consistency builds trust). In the plan sheet, 0% APR earns no bonus — the subsidy is the incentive; APR plans earn a bonus at a fare-tier rate (Economy Plus highest), and every APR term earns the same (we never reward longer debt). The calculator shows cost vs miles value honestly.",
  checkout:
    "Wallet placement: pay-over-time sits below card, above PayPal. United has no other pay-later provider in this mock, so no adjacency conflict. ClarityPay appears only as a micro-tag — the lender shows up where the law requires, nowhere else.",
  prequal:
    "Inline application, no redirect. Phone + last-4 SSN, soft pull only. The lender disclosure is a shared constant, not free-typed. The persona switcher (header) decides the outcome.",
  offer:
    "One plan is recommended, each shows its bonus (0% earns none), and timing is explicit: base miles credit after the flight (United's rules), the bonus credits when the plan completes (ClarityPay-funded — completion rewards repayment). Autopay defaults on.",
  declined:
    "Soft decline: no reason codes beyond the legal minimum, adverse-action notice by mail, and a one-tap fallback to card — nothing re-entered. The loyalty line adjusts to base miles only: bonus rewards financing, base rewards flying.",
  confirmation:
    "Miles shown with honest statuses (pending / posted / reversed) rather than a single inflated number. A traveller without a MileagePlus number gets a 30-day retro-credit prompt.",
  account:
    "Post-purchase servicing under United's brand. Trips carry a compact earn summary; the full miles story lives in its own tab — the customer never has to learn that two companies are involved.",
  miles:
    "The miles hub uses the unlock metaphor: base miles unlock after travel, bonus miles unlock after the final payment, and cancellations deduct whatever was still unlocking soon. One place to answer 'where are my miles?'",
  loan:
    "Every miles movement is a ledger line with a reason. The simulator panel below exercises the edge cases: cancellations, partial refunds, redeemed-then-cancelled netting, delinquency freeze/reverse, and loyalty-API failure.",
  dashboard:
    "United's internal view — deliberately neutral, not customer-branded. Every tile is tagged primary / diagnostic / guardrail so the team reads growth and risk together; the callout shows how the same take-rate rise can be healthy or unhealthy.",
  "dashboard-transactions":
    "One row per financed booking with the miles state alongside the loan state. Row click opens the full ledger — ops can answer 'where are my miles?' without touching ClarityPay's systems.",
  "dashboard-rewards":
    "The program is config, not code: bonus rate, cap, hold period and DPD thresholds are editable here and apply to checkout on next load. That's the white-label promise — same rails, per-merchant economics.",
  "dashboard-exceptions":
    "Loyalty failures never block lending. This queue is where posting failures, pending reversals, negative balances and unmatched loyalty numbers wait for a retry or a human.",
  "dashboard-data":
    "The trust boundary in one table: credit data never leaves ClarityPay, miles balances never leave MileagePlus, United shares booking context only. This is the answer to 'what does the lender see about my members?'",
};
