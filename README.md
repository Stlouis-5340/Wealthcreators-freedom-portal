# Wealth Creators Freedom Portal

Member portal for Wealth Creators. It tracks how much of a real spending plan is already covered by passive income, how hard assets are working, and the six-year goals on the way there.

Sample plans still live in the repo. Sign-in is real: Auth.js sessions decide who is a Member and who is a Wealth Guide.

## Auth choice

This app uses [Auth.js](https://authjs.dev) (`next-auth` v5) with the Credentials provider: email and password, JWT sessions, no database.

That is the practical v1 for this repo.

- The portal is Next.js App Router, TypeScript, and Tailwind. Auth.js is built for that stack, and route protection sits in `proxy.ts` (the Next.js 16 replacement for `middleware.ts`).
- Two demo people have to sign in on a laptop with no hosted project and no inbox: Member Alex Rivera and Wealth Guide Jordan Lee. Credentials does that. A magic link would need Resend or SMTP, and Clerk would need a Clerk application plus dashboard users before either login works.
- Roles travel on the JWT (`member` or `guide`). Guides are sent to the roster. Members are sent to the dashboard. A member cannot open another member, and a guide cannot open the member plan editor.
- When a database exists, swap the Credentials user list for an Auth.js database adapter (or move the same routes to Clerk). The protected paths and role checks stay.

`AUTH_SECRET` is the only secret. Demo passwords are preview logins, written below, not production credentials.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local
```

Set `AUTH_SECRET` in `.env.local` to a long random string (`openssl rand -base64 32`). Leave `AUTH_URL` as `http://localhost:3000` for local dev. Do not commit `.env.local`.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You are sent to the sign-in screen until a session exists.

```bash
npm run build
npm run lint
```

`next build` reads `.env.local`, so `AUTH_SECRET` has to be set there before a production build.

## Demo logins

| Role | Person | Email | Password | Lands on |
| --- | --- | --- | --- | --- |
| Member | Alex Rivera | alex@wealthcreators.test | Freedom-Alex-2026 | Dashboard |
| Wealth Guide | Jordan Lee | jordan@wealthcreators.test | Freedom-Jordan-2026 | Roster |

There is no Auth.js project to create in a dashboard. The accounts are the two rows in `lib/demo-accounts.ts`. Sign-up on `/signup` is branded and explains that Wealth Creators issues accounts; it does not create a user yet.

After sign-in:

- Alex sees only the member shell: dashboard, goals, net worth, spending plan, milestones. The figures are Alex's sample plan. Opening `/guide` returns to the dashboard.
- Jordan sees the roster and each assigned member's progress. The assignment for this preview is the full sample roster, including Alex. Opening the member editor returns to the roster. The roster still omits institutions, account numbers, and transactions.
- Sign out clears the session and returns to `/login`.

Edits to Alex Rivera amounts and steps are saved in this browser under `localStorage` key `wc-freedom-portal-v1`. **Reset demo data** restores the sample plan. The saved role switch from the earlier demo is ignored; the session is the only role.

## Brand

- Official mark: `public/wc-hero.png` (gold WC crown monogram and WEALTH CREATORS wordmark). The app shell and the sign-in screens use this file. Do not replace it with a redrawn logo.
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
- **Spending plan** is the expense denominator. Sample categories are editable for the signed-in member.
- **Goals** for Alex: two wealth goals and one personal goal, each with year-1 through year-6 checkpoints and this-year steps.
- **Milestones / education** at Freedom Score bands 25, 50, 75, 100, and 125%.
- **Guide roster** with filters: all, needs attention, goals behind, near the line, Freedom+. Member detail shows totals and goals only.
- **Sessions** are httpOnly Auth.js JWTs. `proxy.ts` redirects anonymous visitors to `/login` and keeps each role inside its own routes. Server layouts check the session again.

Sample passive income includes dividends, interest, net rent, and a royalty. Wages, asset sales, gifts, debt draws, and transfers do not count. Social Security, DRIP, and semi-passive business income are called out as configurable later and are excluded from the sample score.

## What is stubbed

- **Accounts.** Only the two demo users exist. Request access does not store a new member.
- **Plaid.** “Connect with Plaid” explains that Link is not configured. No keys, no Link token, no bank contact.
- **Data.** Mock figures in `lib/sample-data.ts`, bound to the signed-in member (Alex) and to Jordan's assigned roster. Alex's edits stay in the browser. Other members are static.
- **Guide privacy.** Roster and member pages show aggregates and goals. They do not show institutions, account numbers, or transactions.
- No database, no Mighty Networks or Whop integration, no production deploy config.

## Suggested next steps

1. Replace `lib/demo-accounts.ts` with a database adapter and an invite flow. Keep Member and Wealth Guide on the session.
2. Persist plans, goals, and score snapshots per member id.
3. Plaid Link for balances, plus member-confirmed passive tags. Never store bank passwords. Keep raw transactions off the guide view.
4. Decide the gray-area rules (Social Security, DRIP, semi-passive businesses) in product, not only in copy.
5. Deploy when those boundaries are real. Set `AUTH_SECRET` and `AUTH_URL` in the host. The product spec asks to document hosting later; this repo does not deploy yet.

The full v1 note lives in [PRODUCT_SPEC.md](./PRODUCT_SPEC.md).
