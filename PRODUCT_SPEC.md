# Wealth Creators Freedom Portal — Product Spec (v1 scaffold)

## Brand: Wealth Creators
- Logo: gold WC monogram with crown + "WEALTH CREATORS" wordmark on black (see attached wc-hero.png / logo).
- Primary palette:
  - Black / near-black background: `#0A0A0A`, surfaces `#111111` / `#1A1A1A`
  - Gold accent (brand): `#E8B84A` (from logo gold ~`#F0C050`; use `#E8B84A` as primary CTA/accent)
  - Gold muted: `#C49A3A`
  - Text primary: `#F5F5F5`
  - Text secondary: `#A3A3A3`
  - Borders: `#2A2A2A`
  - Success: soft green for Freedom+ states; warning amber; danger muted red — keep gold as brand accent, not status.
- Typography: clean modern sans (Inter or similar); logo wordmark is condensed sans all-caps — UI body should be readable Inter/Geist; display headings may be tighter tracking.
- Voice: clear, empowering, structured — financial freedom with clarity (not hype-y crypto vibes).
- Do NOT invent a different logo; use the provided Wealth Creators mark.

## Product name
**Freedom Portal** (member-facing). Subtitle optional: Wealth Creators.

## Users
1. **Members** (Wealth Creators members)
2. **Wealth Guides** (coaches who monitor assigned members)

## Core metrics
1. **Freedom Score** = (monthly passive income / monthly expenses) × 100%. Can exceed 100%.
2. **Yield on assets** (PRIMARY yield) = (annual passive [= monthly × 12] / total assets) × 100%.
3. Optional secondary later: yield on net worth (do not make primary).
4. **Net worth** = assets − liabilities.

## Passive income rules (summary)
COUNTS: dividends/interest/distributions, net rent, royalties/silent partner, lending yield, pension/annuity-like when tagged passive.
DOES NOT: W-2/salary, active self-employment, one-time asset sales/principal, gifts/refunds, debt draws, transfers.
Gray (leave configurable): Social Security, DRIP as income vs assets-only, semi-passive business.

Spending plan is the expense denominator for Freedom Score (intentional plan, not raw card noise).

## Features for v1 scaffold (working UI with sample data; stub auth & Plaid)
### Member app
- Dark Wealth Creators branded shell (sidebar or top nav)
- **Overview**: Freedom Score, Yield on assets, Net worth, milestones/goals summary; sample editable inputs
- **Goals tab**: 6-year wealth + personal goals; yearly checkpoints Y1–Y6; **this year simple steps**; progress %
- **Spending plan**: expense categories feeding Freedom Score denominator
- **Milestones**: Freedom Score bands 25/50/75/100/125%
- **Accounts**: Connect accounts empty/CTA state (Plaid Link stub — button that explains not wired yet)
- Education callout by Freedom Score stage

### Wealth Guide app
- Roster: Freedom Score, 6-yr goal %, this-year steps, net worth, last active
- Filters: all / needs attention / goals behind / near line / freedom+
- Member detail: overview + 6-yr goals monitor; **privacy**: no bank credentials, no raw transactions

### Auth (stub)
- Demo login: Member (Alex Rivera) vs Guide (Jordan Lee) role switcher — no real auth provider required for v1

## Tech preferences
- Next.js (App Router) + TypeScript + Tailwind CSS
- Clean component structure; sample data in `/lib/sample-data.ts`
- Responsive; mobile-friendly
- README with how to run locally (`npm install && npm run dev`)
- Polish UI to feel production-quality branded dark theme — not a generic shadcn default blue

## Out of scope for this first pass
- Real Plaid keys/production Link
- Real database / production auth
- Mighty Networks / Whop deep integration
- Deploy to Vercel (document later; Origin is source of truth)

## Success criteria
1. `npm run build` succeeds.
2. Member can view Freedom Score, yield on assets, Goals (6-yr + this-year steps), spending plan, milestones in Wealth Creators black/gold brand.
3. Guide can view roster and member goal progress.
4. Logo/wordmark appears in chrome.
5. README explains next steps (Plaid, auth, data).
