# Product decisions in this build

1. **Loyalty appears once on discovery, in force at checkout.** Search shows one chip on the fare most likely to be financed; the full earn breakdown waits for the offer screen. Discovery earns attention, checkout earns conversion — over-selling loyalty at search erodes trust in the price.

2. **The lender is invisible except where the law requires it.** United branding everywhere the customer acts; ClarityPay appears only as the wallet micro-tag, the prequal disclosure block, the loan agreement, and statement footers. All regulated copy is a shared constant (`lib/copy.ts`) — disclosures are never free-typed.

3. **Rewards exist only where there is margin: APR plans.** A 0% plan earns nothing — the subsidised rate *is* the reward, and there is no margin to fund miles from. Monthly (APR) plans earn 1 mi/$ of fare, and Economy Plus adds 0.5 bonus mi/$ financed (capped), concentrating spend-up where the airline's margin is. Every APR term earns the same — the loyalty currency never nudges a customer into longer debt. Enforced in the engine and unit-tested; a calculator in the plan sheet shows financing cost vs miles value honestly.

4. **Bonus goes to the payer only; base goes to every traveller.** One loan, one borrower, one bonus. Base miles are earned on the fare and split per traveller with a MileagePlus number; travellers without one get a 30-day retro-credit window instead of silently losing the earn.

5. **ClarityPay funds all reward miles (purchased from the airline), but the two types keep different lifecycles.** Trip miles credit after the flight, are reversed only if the booking is refunded, and delinquency never touches them — they anchor trust in the reward. The bonus credits **when the plan completes** — completion rewards repayment, there is nothing to claw back mid-loan, and a cured delinquency simply restores it to pending (held at 30 DPD, reversed at 60). The funder is invisible to the customer: the reward carries the airline's brand end to end, like a cobrand card, additional to whatever the member earns for flying.

6. **No cash clawback for miles, ever.** Redeemed-then-cancelled reverses what the balance covers and books the shortfall as a "miles owed" line that nets against future earning. Converting a loyalty problem into a surprise charge would poison both brands.

7. **Declines are soft and recoverable in one tap.** No reason codes beyond the legal minimum, adverse-action notice by mail, fallback to card without re-entering anything — and the loyalty line says plainly that miles are a payment-plan benefit, so the card fallback earns none.

8. **Loyalty failure never blocks lending.** If the MileagePlus posting API is down, the loan proceeds, the customer sees "pending — retrying, posts within 72 hours", and United ops gets an exception queue item with a retry button. Money movement and points movement are decoupled by design.

9. **The whole loyalty layer is config-driven for reusability.** Theme config (`lib/theme.ts`) re-skins every widget — `/?theme=demo-retailer` proves it with a generic points program. Program economics (`/api/merchant/config`) are editable from the dashboard and apply to checkout on next load.

10. **Chart is hand-rolled SVG, state is in-memory, personas replace auth.** Prototype-scale choices made deliberately: no chart dependency, no database (documented cold-start reset + `POST /api/reset`), and a persona switcher that also drives underwriting outcomes so every path is walkable without credentials.

11. **One plan is recommended, and it's the 12-month.** A default fights choice paralysis; 12 months balances a manageable payment against total cost, and (unlike 0%) it earns miles — aligned incentives for customer, airline, and ClarityPay.

12. **Partial cancellation keeps the payer's bonus.** The bonus rewards the financed booking (which still exists, re-amortised), not headcount. The cancelled traveller's trip miles are reversed pro-rata; the loan is re-amortised so unpaid instalments sum to the new outstanding balance.
