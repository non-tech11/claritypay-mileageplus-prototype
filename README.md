# ClarityPay × United MileagePlus — Loyalty Layer Prototype

An interactive, walkable prototype for a PM case study: a **white-labeled
loyalty layer** on top of ClarityPay's existing point-of-sale financing
inside United's checkout. Three surfaces in one Next.js app:

1. **Customer journey** — United-branded, mobile-first: fare search → cart →
   payment wallet → inline prequal → offer / decline → confirmation.
2. **Servicing** — "My trips & payments": loan schedule, miles ledger,
   documents, and an edge-case simulator (cancellations, delinquency,
   loyalty-API failure, redeemed-then-cancelled netting).
3. **Merchant dashboard** — United's internal ops/finance view: metrics with
   primary/diagnostic/guardrail tags, transactions, reward config controls,
   exceptions queue, and a data map.

Plus a real mock API (24 Next.js route handlers) listed at `GET /api` and
browsable with "Try it" buttons at `/api-docs` — and a **live API panel**
docked to the right of the prototype (screens ≥ 1280px) that shows every
request the UI makes in real time, with expandable request/response JSON.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 12 vitest unit tests on the loyalty/loan/refund engine
npm run build      # production build, zero TS errors
```

Node 20+ (`.nvmrc` included).

## Deploy to Vercel

```bash
npm i -g vercel   # if needed
vercel --prod     # zero config, no env vars
```

## Personas (switcher in the dark toolbar)

| Persona | Profile | Outcome |
|---|---|---|
| **Priya** | Premier Silver, prime | Approved, all plans, bonus eligible |
| **Marcus** | Member, near-prime | Approved, shorter terms only, higher APR shown clearly |
| **Dana** | Member, thin file | Declined path (soft decline, card fallback) |
| **Alex** | 2nd traveller only | No MileagePlus # — retro-credit scenario |

The persona cookie drives the prequal decision, the plan ladder, and whose
loans `/account` shows.

## How to walk the prototype in 5 minutes

1. **`/` Search** — three fares with `or from $XX/mo`; Economy Plus carries the
   single loyalty chip ("Earn up to 1,860 miles · +500 bonus"). Open the
   *Prototype notes* drawer at the bottom of every screen — it explains the
   product decision the screen demonstrates. Select **Economy Plus**.
2. **`/cart`** — toggle *Add 2nd traveller* (Alex, no MileagePlus #) to arm the
   multi-traveller case. Tap the `or from $XX/mo` line: the plan sheet shows
   the plans with **per-plan financing miles** — the 0% plan earns none (the
   subsidy is the incentive), APR plans earn miles back at a fare-tier rate,
   Economy Plus adds the bonus, and every APR term earns the same. One plan
   is **Recommended**, and picking one carries it through checkout. The
   calculator at the bottom shows financing cost vs miles value honestly.
3. **`/checkout`** — wallet order: card, Apple Pay, **Pay over time** (with
   "Powered by ClarityPay" micro-tag), PayPal. Pay-over-time expands inline:
   phone + last-4 SSN, soft-pull note, the shared lender disclosure. Press
   **Continue and agree** as Priya.
4. **`/checkout/offer`** — plans with exact APRs, compact loyalty card
   ("1,860 base + 500 bonus = 2,360 miles"), the *When do I get these?*
   timing disclosure, autopay on. **Sign and book** → **`/confirmation`** with
   PNR, plan summary, miles as status pills, and Alex's retro-credit prompt.
5. **Decline path** — switch persona to **Dana**, repeat checkout: soft
   decline, adverse-action link, *one-tap* card fallback, loyalty line drops
   to base-only ("You'll still earn 1,860 miles").
6. **`/account`** — three seeded loans (healthy / cancelled / delinquent).
   Open the delinquent one: late instalment, bonus **held**, late-fee
   disclosure. Use the **simulator panel**: run *Missed instalment* twice
   (30 DPD hold → 60 DPD reversal, base miles untouched), then *Miles
   redeemed, then cancel* (shortfall becomes "miles owed", never cash).
7. **`/dashboard`** — tiles tagged primary/diagnostic/guardrail with ⓘ
   definitions and the healthy-vs-unhealthy growth callout. Check
   **Exceptions** (retry the failed posting), **Rewards & config** (change
   the bonus per booking, save, reload checkout — the chip updates), and
   **Data map** (what never leaves ClarityPay).
8. **White-label proof** — visit `/?theme=demo-retailer`: the entire journey
   re-skins to a generic retailer with points and Bronze/Silver/Gold tiers.
   `/?theme=united` switches back.

## API

`GET /api` returns the endpoint list as JSON; `/api-docs` renders it with
sample bodies and Try-it buttons. Highlights:

```
GET  /api/offers/estimate?amount=      POST /api/checkout/prequal
POST /api/checkout/select-plan         POST /api/checkout/sign
GET  /api/loans                        GET  /api/loans/[loanId]
POST /api/loans/[loanId]/pay           POST /api/loans/[loanId]/cancel
POST /api/loans/[loanId]/simulate      GET  /api/loyalty/preview
POST /api/loyalty/post (?fail=1)       POST /api/loyalty/reverse
GET  /api/loyalty/ledger/[loanId]      GET  /api/merchant/metrics
GET  /api/merchant/transactions        GET  /api/merchant/exceptions
POST /api/merchant/exceptions/[id]/retry
GET|PUT /api/merchant/config           GET  /api/theme?merchant=
POST /api/reset
```

Handlers are thin; the rules live in `lib/engine/` (`loyalty.ts`, `loan.ts`,
`refund.ts`) as pure functions with 15 vitest tests: 0% APR earns no
financing miles, APR-presence (not term length) drives earn, fare-tier
differentiated miles-back rates, Economy-Plus-only bonus with cap,
payer-only financing miles, decline → base-only, 30/60 DPD freeze/reverse
of both financing types, no-clawback-after-repayment, redeemed-then-cancelled
netting, full/partial cancellation math, re-amortisation, plan-ladder shape
with one recommended plan.

## Assumptions (stated, per the brief)

- **Booking economics**: $1,000 illustrative AOV financed; 6% merchant fee;
  ~5% cost of funds; 2% expected credit loss; miles transfer price 1.1¢,
  member-perceived value 1.3¢. See the unit-economics table on `/dashboard`.
- **Earn model**: base 5 mi/$ of fare (excl. taxes) is United's normal earn;
  financing miles (miles back + Economy Plus bonus) are funded from merchant
  economics and only on APR-bearing plans — a 0% plan is already subsidised.
- **Credit**: three illustrative profiles (prime / near-prime / thin) stand
  in for underwriting; APRs 0–24.99% are illustrative, not priced.
- **Repeat behaviour**: members who redeem earned miles rebook at ~1.4× the
  rate of card payers (assumed, not measured).

**Data I'd request first, and why it changes the recommendation:**

1. **Incremental take rate by fare tier** — if financing shifts Basic buyers
   up to Economy Plus, the bonus concentration on Economy Plus is right; if
   not, spread the miles-back rates flatter.
2. **Reversal/refund rate on financed vs card bookings** — sets the bonus
   hold window; a high early-cancel rate argues for unlock-at-travel.
3. **Redemption-to-rebooking elasticity** — the repeat-purchase lift is the
   whole case for reward spend; if it's below ~1.15×, cut the earn rate.
4. **DPD curves by credit tier** — calibrates the 30/60 freeze/reverse
   thresholds and whether near-prime should earn the bonus at all.

## Known limitations

- **In-memory state** — resets on serverless cold start / server restart.
  `POST /api/reset` (or the toolbar "Reset data" button) reseeds on demand.
- **Illustrative numbers** — fares, APRs, earn rates, tier thresholds and
  dashboard metrics are invented for the walkthrough, not United's real values.
- No auth, no real payments, no real credit decisioning; the persona switcher
  stands in for all three.
- Seeded servicing loans belong to Priya — switch to her to see all three.

## Tools used

Built with Claude Code (Anthropic's CLI agent) doing the implementation,
on Next.js 15 (App Router, TypeScript), Tailwind CSS, lucide-react icons,
vitest for engine tests, deployed on Vercel. No component library, no
database, no chart library — the line chart is hand-rolled SVG.
