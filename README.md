# Wealth Creators Freedom Portal

Member portal for Wealth Creators. It tracks how much of a real spending plan is already covered by passive income, how hard assets are working, and the six-year goals on the way there.

This repository is a production-quality scaffold with sample data. Authentication, Plaid, and a database are intentionally not wired yet.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build
npm run lint
```

## Demo roles

Use the switcher at the bottom of the sidebar. Nothing is password-protected.

| Role | Person | What you see |
| --- | --- | --- |
| Member | Alex Rivera | Dashboard, goals, net worth, spending plan, milestones |
| Wealth Guide | Jordan Lee | Roster and each member progress view |

Edits to Alex Rivera amounts and steps are saved in this browser under `localStorage` key `wc-freedom-portal-v1`. **Reset demo data** restores the sample plan.

## Brand

- Official mark: `public/wc-hero.png` (gold WC crown monogram and WEALTH CREATORS wordmark). The app shell uses this file. Do not replace it with a redrawn logo.
- App icon: `app/icon.png`, cropped from the same monogram.
- Background `#0A0A0A`, surfaces `#111111` / `#1A1A1A`
- Gold accent `#E8B84A`, logo gold `#F0C050`, muted gold `#C49A3A`
- Text `#F5F5F5` / `#A3A3A3`, borders `#2A2A2A`
- Voice: clear, structured, and specific. Not crypto-hype.

Tokens live as CSS variables in `app/globals.css` and are exposed to Tailwind.

## What this build does

- **Freedom Score** = monthly passive income ÷ monthly spending plan. It can exceed 100%.
- **Yield on assets** (the primary yield) = annual passive income ÷ total assets. Annual passive is monthly passive × 12.
- Yield on net worth is available as context only. It is not the headline rate.
- **Net worth** = assets − liabilities.
- **Spending plan** is the expense denominator. Sample categories are editable.
- **Goals** for Alex: two wealth goals and one personal goal, each with year-1 through year-6 checkpoints and this-year steps.
- **Milestones / education** at Freedom Score bands 25, 50, 75, 100, and 125%.
- **Guide roster** with filters: all, needs attention, goals behind, near the line, Freedom+. Member detail shows totals and goals only.

Sample passive income includes dividends, interest, net rent, and a royalty. Wages, asset sales, gifts, debt draws, and transfers do not count. Social Security, DRIP, and semi-passive business income are called out as configurable later and are excluded from the sample score.

## What is stubbed

- **Auth.** Role switch only. No accounts, sessions, or provider.
- **Plaid.** “Connect with Plaid” explains that Link is not configured. No keys, no Link token, no bank contact.
- **Data.** Mock figures in `lib/sample-data.ts`. Alex edits stay in the browser. Other members are static.
- **Guide privacy.** Roster and member pages show aggregates and goals. They do not show institutions, account numbers, or transactions.
- No database, no Mighty Networks or Whop integration, no production deploy config.

## Suggested next steps

1. Real auth with Member and Wealth Guide roles, and a guide-to-member assignment.
2. Persist plans, goals, and score snapshots in a database.
3. Plaid Link for balances, plus member-confirmed passive tags. Never store bank passwords. Keep raw transactions off the guide view.
4. Decide the gray-area rules (Social Security, DRIP, semi-passive businesses) in product, not only in copy.
5. Deploy when those boundaries are real. The product spec asks to document hosting later; this repo does not deploy yet.

The full v1 note lives in [PRODUCT_SPEC.md](./PRODUCT_SPEC.md).
