# Product decisions in this build

1. **Loyalty appears once on discovery, in force at checkout.** Search shows one chip on the fare most likely to be financed; the full earn breakdown waits for the offer screen. Discovery earns attention, checkout earns conversion — over-selling loyalty at search erodes trust in the price.

2. **The lender is invisible except where the law requires it.** United branding everywhere the customer acts; ClarityPay appears only as the wallet micro-tag, the prequal disclosure block, the loan agreement, and statement footers. All regulated copy is a shared constant (`lib/copy.ts`) — disclosures are never free-typed.

3. **Financing miles reward margin, never term length.** 0% APR plans earn no financing miles — the subsidised rate *is* the incentive, and there is no margin to fund miles from. APR-bearing plans earn miles back per $100 financed at a fare-tier rate (Basic < Economy < Economy Plus), and every APR term earns the same — we never let the loyalty currency nudge a customer into longer debt. The flat bonus is reserved for Economy Plus, concentrating spend-up where United's margin is. All enforced in the engine and unit-tested; a calculator in the plan sheet shows financing cost vs miles value honestly.

4. **Bonus goes to the payer only; base goes to every traveller.** One loan, one borrower, one bonus. Base miles are earned by flying and split per traveller with a MileagePlus number; travellers without one get a 30-day retro-credit window instead of silently losing the earn.

5. **Base and bonus have different owners and different lifecycles.** Base miles are United's (post after travel, reversed only if the flight is refunded — delinquency never touches them). Bonus miles are ClarityPay-funded (post after first on-time instalment, held at 30 DPD, reversed at 60 DPD or on cancellation, never reversed after full repayment).

6. **No cash clawback for miles, ever.** Redeemed-then-cancelled reverses what the balance covers and books the shortfall as a "miles owed" line that nets against future earning. Converting a loyalty problem into a surprise charge would poison both brands.

7. **Declines are soft and recoverable in one tap.** No reason codes beyond the legal minimum, adverse-action notice by mail, fallback to card without re-entering anything — and the loyalty line adjusts to base-only rather than disappearing (bonus rewards financing; base rewards flying).

8. **Loyalty failure never blocks lending.** If the MileagePlus posting API is down, the loan proceeds, the customer sees "pending — retrying, posts within 72 hours", and United ops gets an exception queue item with a retry button. Money movement and points movement are decoupled by design.

9. **The whole loyalty layer is config-driven for reusability.** Theme config (`lib/theme.ts`) re-skins every widget — `/?theme=demo-retailer` proves it with a generic points program. Program economics (`/api/merchant/config`) are editable from the dashboard and apply to checkout on next load.

10. **Chart is hand-rolled SVG, state is in-memory, personas replace auth.** Prototype-scale choices made deliberately: no chart dependency, no database (documented cold-start reset + `POST /api/reset`), and a persona switcher that also drives underwriting outcomes so every path is walkable without credentials.

11. **One plan is recommended, and it's the 12-month.** A default fights choice paralysis; 12 months balances a manageable payment against total cost, and (unlike 0%) it earns financing miles — aligned incentives for customer, United, and ClarityPay.

12. **Partial cancellation keeps the payer's bonus.** The bonus rewards the financed booking (which still exists, re-amortised), not headcount. The cancelled traveller's base miles are reversed pro-rata; the loan is re-amortised so unpaid instalments sum to the new outstanding balance.
