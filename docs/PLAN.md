# ClarityPay × United MileagePlus Loyalty Prototype — Build Plan

## Context

PM case-study deliverable: interactive walkable prototype of a white-labeled loyalty layer on top of ClarityPay's existing point-of-sale financing inside United's checkout. Three surfaces (customer journey, servicing, merchant dashboard) + real mock API routes + api-docs page, in one Next.js 15 app. Target dir: `/Users/User/Documents/Clarity/Prototype` (empty, confirmed). No git repo yet — `git init` at start. `npm` (pnpm unavailable). Deployable to Vercel zero-config, in-memory state only.

## Decisions made without asking (each noted in docs/decisions.md)

- **Chart**: hand-rolled tiny SVG line chart, no recharts — zero extra dep, brief allows either.
- **Persona/theme state**: persona in cookie (per brief) read server-side; theme via `?theme=` query param persisted to cookie so navigation keeps it.
- **Prequal as state on `/checkout`**: brief allows same page with state; separate routes for `/checkout/offer` and `/checkout/declined` kept since brief routes them.
- **In-memory store**: module-level singleton with `globalThis` stash to survive Next dev HMR; documented cold-start reset in README.
- **Toast**: minimal hand-rolled toast context, no library.
- **Node**: `.nvmrc` = 20 per brief; local Node 25 used for build (works with Next 15).

## File tree

```
Prototype/
├── .nvmrc                        # 20
├── package.json                  # next@15, react, tailwind, lucide-react, vitest, tsx
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── tailwind.config.ts            # (Tailwind v3 for config-file theming w/ CSS vars)
├── vitest.config.ts
├── README.md
├── docs/decisions.md
├── app/
│   ├── layout.tsx                # root: theme provider, persona switcher header, toast
│   ├── globals.css
│   ├── (customer)/
│   │   ├── layout.tsx            # 430px phone frame, grey backdrop, PrototypeNotes drawer slot
│   │   ├── page.tsx              # / fare selection
│   │   ├── cart/page.tsx
│   │   ├── checkout/page.tsx     # wallet + inline prequal (state)
│   │   ├── checkout/offer/page.tsx
│   │   ├── checkout/declined/page.tsx
│   │   ├── confirmation/page.tsx
│   │   └── account/
│   │       ├── page.tsx          # loan list (3 seeded)
│   │       └── [loanId]/page.tsx # schedule, ledger, docs, actions, simulator panel
│   ├── (merchant)/
│   │   └── dashboard/
│   │       ├── layout.tsx        # sidebar, desktop, neutral grey
│   │       ├── page.tsx          # overview tiles + SVG chart + healthy/unhealthy callout
│   │       ├── transactions/page.tsx
│   │       ├── rewards/page.tsx  # log + editable config controls
│   │       ├── exceptions/page.tsx
│   │       └── data/page.tsx     # static data map table
│   ├── api-docs/page.tsx         # human-readable API list + Try-it buttons
│   └── api/
│       ├── route.ts              # GET index of endpoints
│       ├── reset/route.ts
│       ├── theme/route.ts
│       ├── offers/estimate/route.ts
│       ├── checkout/prequal/route.ts
│       ├── checkout/select-plan/route.ts
│       ├── checkout/sign/route.ts
│       ├── loans/route.ts
│       ├── loans/[loanId]/route.ts
│       ├── loans/[loanId]/pay/route.ts
│       ├── loans/[loanId]/cancel/route.ts
│       ├── loans/[loanId]/simulate/route.ts
│       ├── loyalty/preview/route.ts
│       ├── loyalty/post/route.ts
│       ├── loyalty/reverse/route.ts
│       ├── loyalty/ledger/[loanId]/route.ts
│       └── merchant/
│           ├── metrics/route.ts
│           ├── transactions/route.ts
│           ├── exceptions/route.ts
│           ├── exceptions/[id]/retry/route.ts
│           └── config/route.ts   # GET + PUT
├── components/
│   ├── LoyaltyCard.tsx           # theme-driven; sizes: full | compact | chip
│   ├── PersonaSwitcher.tsx       # header, cookie-backed
│   ├── PrototypeNotes.tsx        # collapsible bottom drawer, per-screen copy
│   ├── PlanSheet.tsx             # bottom sheet: 3 plans + miles-per-plan
│   ├── Toast.tsx                 # context + "Not in prototype scope"
│   ├── Skeleton.tsx / ErrorRetry.tsx
│   ├── MilesPill.tsx             # pending/posted/held/reversed pills
│   ├── MetricTile.tsx            # ⓘ tooltip w/ definition + primary/diagnostic/guardrail tag
│   ├── TierProgress.tsx          # dots + thresholds + illustrative tooltip
│   └── SvgLineChart.tsx
└── lib/
    ├── types.ts                  # shared types: Loan, Instalment, MilesEntry, Offer, Plan, Persona, Config…
    ├── copy.ts                   # LENDER_DISCLOSURE const + prototype-notes copy
    ├── theme.ts                  # united + demo-retailer theme configs
    ├── store.ts                  # in-memory store (globalThis singleton) + reset
    ├── seed.ts                   # personas, 3 loans (healthy/cancelled/delinquent), metrics, exceptions
    ├── api-client.ts             # fetch wrapper w/ loading/error handling for client components
    └── engine/
        ├── loyalty.ts            # earn/hold/reverse pure fns
        ├── loan.ts               # amortisation, schedule, DPD
        ├── refund.ts             # full/partial cancellation math
        └── __tests__/engine.test.ts  # ~10 vitest cases
```

## Build order (per brief's process)

0. **Save this plan** as `Prototype/docs/PLAN.md` (user requested copy in Prototype folder).
1. **Scaffold**: `git init`, package.json (next@15, react@19, typescript, tailwindcss@3, lucide-react, vitest), configs, `.nvmrc`, globals.css with United CSS vars.
2. **Engine + types + seed + store**: pure functions in `lib/engine/`, shared types, seed data (Priya/Marcus/Dana/Alex personas; 3 loans; merchant config defaults: base 1 mi/$ fare excl. taxes, bonus 0.5 mi/$ financed, cap 1000, 30/60 DPD freeze/reverse — bonus on Economy Plus only, and all earn on APR-bearing plans only).
3. **Tests**: ~10 vitest cases — bonus term-independence, partial refund pro-ration, redeemed-then-cancelled netting (miles-owed, never cash), 30 DPD hold / 60 DPD reverse, decline → base-only, cap enforcement, multi-traveller base split / bonus-to-payer, retro-credit window. Run `npm test`, green before UI.
4. **API routes**: thin handlers over store + engine; `/api` GET index.
5. **Shared components**: theme provider, LoyaltyCard (3 sizes), PersonaSwitcher, PrototypeNotes, Toast, skeletons.
6. **Customer journey**: `/` → `/cart` → `/checkout` (wallet + inline prequal) → `/checkout/offer` | `/checkout/declined` → `/confirmation`. Persona drives outcome (Dana → declined; Marcus → short terms + higher APR).
7. **Servicing**: `/account`, `/account/[loanId]` with edge-case simulator panel (6 buttons incl. reset).
8. **Dashboard**: overview, transactions (filter + row drawer), rewards (editable config → reflected in checkout), exceptions (retry), data map table.
9. **api-docs page** with Try-it buttons.
10. **README + docs/decisions.md** (8–10 bullets), 5-min walkthrough script.
11. **`npm run build`** — fix until zero TS errors. Verify key flows via dev server. Give Vercel deploy commands (`vercel --prod`).

## Loyalty mechanics encoded (from brief, in lib/engine/loyalty.ts + config)

- **Earn exists only on APR-bearing (monthly) plans.** A 0% plan writes no ledger entries at all — the subsidised rate is the reward, and there is no margin to fund miles on top of it.
- Base: 1 mi/$ fare (excl. taxes), posts after travel, reversed only on flight refund. Delinquency never touches it. ClarityPay-funded, purchased from the airline (the customer sees the airline's brand end to end).
- Bonus: 0.5 mi/$ financed, cap 1000, Economy Plus fares only, paid in full over a 12-month reference term and tapered in proportion beyond it (24 months earns half). `pending` → `posted` (when the plan completes) → `held` (30 DPD) → `reversed` (60 DPD or full cancel in hold window). Never reversed after full repayment.
- Pay-in-4 collects the first instalment at checkout (`dueAtSigning`); the monthly plans stay zero-down.
- Multi-traveller: base per traveller w/ MileagePlus #; bonus payer-only; missing # → retro-credit 30d prompt.
- Redeemed-then-cancelled: reverse available balance, shortfall → negative "miles owed" netting future earn. No cash clawback.

## Verification

- `npm test` — all engine tests green.
- `npm run build` — zero TS errors.
- `npm run dev` + walk: fare → cart (2-traveller toggle) → checkout → prequal per persona (Priya approve / Dana decline) → offer → confirmation → account → simulate each scenario → dashboard config change reflected in checkout estimate → `/api-docs` Try-it → `/?theme=demo-retailer` re-skins.
- 390px viewport check on customer screens.
