/**
 * Regulated copy lives here and only here. Never free-type disclosures
 * in components — import these constants.
 */

/**
 * Lender disclosure as ordered points. The soft-inquiry point leads and is
 * emphasised in the UI — it answers the customer's biggest hesitation.
 */
export const LENDER_DISCLOSURE_POINTS: { text: string; emphasis?: boolean }[] = [
  {
    text: "Checking eligibility uses a soft credit inquiry — it will not affect your credit score.",
    emphasis: true,
  },
  { text: "Loans provided by Demo Bank, Member FDIC, serviced by ClarityPay, Inc." },
  { text: "Rates from 0–29.99% APR based on creditworthiness." },
  { text: "Illustrative terms for prototype purposes only." },
];

export const LENDER_DISCLOSURE = LENDER_DISCLOSURE_POINTS.map((p) => p.text).join(" ");

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
  "These miles are credited after your flight, on bookings paid with a payment plan.";

export const MILES_TIMING_BONUS =
  "Bonus miles are credited when your payment plan completes — after your final payment.";

export const MILES_TIMING_REVERSAL =
  "Both are reversed if the booking is cancelled.";

/** Per-screen prototype notes — the "voiceover" for interviewers. */
export const PROTOTYPE_NOTES: Record<string, string> = {
  search:
    "Discovery placement: one light monthly-price line per fare, and a loyalty chip per fare stating the exclusivity up front — miles are earned only by paying with a program plan. The financed-most fare leads with the bonus; discovery earns attention, checkout earns conversion.",
  cart:
    "The monthly figure matches search (consistency builds trust). In the plan sheet, bonus labels show only on the bonus-eligible fare: monthly plans add the bonus, the 0% plan doesn't (its subsidy is the incentive), and every monthly term earns the same (we never reward longer debt). The calculator shows cost vs miles value honestly.",
  checkout:
    "The wallet is the selection moment: several providers, one differentiator. Only the pay-over-time option earns program miles, and it says so with the real numbers for this booking; the other methods say 'No miles' plainly. ClarityPay appears only as a micro-tag — the lender shows up where the law requires, nowhere else.",
  prequal:
    "Inline application, no redirect. Phone + last-4 SSN, soft pull only. The lender disclosure is a shared constant, not free-typed. The persona switcher (header) decides the outcome.",
  offer:
    "One plan is recommended. Bonus labels appear only on the bonus-eligible fare (elsewhere they would be noise), and timing is explicit: miles credit after the flight, the bonus credits when the plan completes — completion rewards repayment. Every plan earns the trip miles; the funder is never named to the customer. Autopay defaults on.",
  declined:
    "Soft decline: no reason codes beyond the legal minimum, adverse-action notice by mail, and a one-tap fallback to card — nothing re-entered. The loyalty line is honest about the trade-off: miles are a payment-plan benefit, so the card fallback earns none.",
  confirmation:
    "Miles shown with honest statuses (pending / posted / reversed) rather than a single inflated number. A traveller without a MileagePlus number gets a 30-day retro-credit prompt.",
  account:
    "Post-purchase servicing under United's brand. Trips carry a compact earn summary; the full miles story lives in its own tab — the customer never has to learn that two companies are involved.",
  miles:
    "The miles hub avoids vague promises: every earn 'on the way' carries its concrete arrival — after the flight (with the date) or after the final payment (with the month). Cancellations take back what was still on the way. One place to answer 'where are my miles?'",
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
