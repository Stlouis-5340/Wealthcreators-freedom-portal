# Wealth Creators Freedom Portal

Member portal for Wealth Creators. It tracks how much of a real spending plan is already covered by passive income, how hard assets are working, and the six-year goals on the way there.

Sign-in is Auth.js. Plans, goals, balances, and guide assignments are stored in a database.

## Auth and database

Sign-in uses [Auth.js](https://authjs.dev) (`next-auth` v5) with email and password. The session is a JWT that carries Member or Wealth Guide. Accounts, password hashes, and plan data live in the database.

The database is [Prisma](https://www.prisma.io/) on SQLite for local development. The schema uses ordinary strings, numbers, booleans, and datetimes, so the same models move to Postgres: change the datasource `provider` to `postgresql`, set `DATABASE_URL` to a Postgres URL, create a Postgres migration with `prisma migrate dev`, and run the seed. The checked-in migration is SQLite SQL. Do not point that file at Postgres.

SQLite is the fit here because the app has to migrate and seed on a laptop with no hosted database account. A free hosted Postgres URL can replace `DATABASE_URL` when you take that step.

- Route protection sits in `proxy.ts` (the Next.js 16 replacement for `middleware.ts`).
- Demo logins are Member Alex Rivera and Wealth Guide Jordan Lee. Their password hashes are created by the seed. Other roster members are users with plans, assigned to Jordan, and do not have published passwords.
- A member writes only their own spending lines, balances, and steps. A guide reads assigned members and does not see institutions or account numbers.

`AUTH_SECRET` is the session secret. `DATABASE_URL` points at the database file. Neither belongs in git. Demo passwords below are preview logins, not production credentials.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local
```

In `.env.local`, set `AUTH_SECRET` to a long random string (`openssl rand -base64 32`). Leave `AUTH_URL` as `http://localhost:3000` and `DATABASE_URL` as `file:./dev.db`. Do not commit `.env.local`.

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

`db:migrate` applies `prisma/migrations`. `db:seed` creates the demo users, Jordan's assignments, and every sample plan. Run the seed again when you want the sample numbers back. The database file is `prisma/dev.db` and is gitignored.

Open [http://localhost:3000](http://localhost:3000). You are sent to the sign-in screen until a session exists.

```bash
npm run build
npm run lint
```

`next build` reads `.env.local` and expects the migrated database, because signed-in pages read Prisma. Set `AUTH_SECRET` before a production build.

## Demo logins

| Role | Person | Email | Password | Lands on |
| --- | --- | --- | --- | --- |
| Member | Alex Rivera | alex@wealthcreators.test | Freedom-Alex-2026 | Dashboard |
| Wealth Guide | Jordan Lee | jordan@wealthcreators.test | Freedom-Jordan-2026 | Roster |

The accounts are created by `npm run db:seed` from `lib/demo-accounts.ts` and `lib/sample-data.ts`. Sign-up on `/signup` is branded and does not create a user.

After sign-in:

- Alex sees only the member shell: dashboard, goals, net worth, spending plan, milestones. The figures are Alex's plan in the database. Opening `/guide` returns to the dashboard.
- Jordan sees the roster and each assigned member's progress. The assignment is the full sample roster, including Alex. Opening the member editor returns to the roster. The roster still omits institutions, account numbers, and transactions.
- Sign out clears the session and returns to `/login`.

Edits to spending categories, balances, passive streams, and this-year steps are written to the database and stay after a refresh. **Reset demo data** restores the seeded plan. A member resets their own plan. Jordan resets every assigned member.

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
- **Spending plan** is the expense denominator. Categories are stored per member and are editable for the signed-in member.
- **Goals** for Alex: two wealth goals and one personal goal, each with year-1 through year-6 checkpoints and this-year steps.
- **Milestones / education** at Freedom Score bands 25, 50, 75, 100, and 125%.
- **Guide roster** with filters: all, needs attention, goals behind, near the line, Freedom+. Member detail shows totals and goals only.
- **Sessions** are httpOnly Auth.js JWTs. `proxy.ts` redirects anonymous visitors to `/login` and keeps each role inside its own routes. Server layouts check the session again.

Sample passive income includes dividends, interest, net rent, and a royalty. Wages, asset sales, gifts, debt draws, and transfers do not count. Social Security, DRIP, and semi-passive business income are called out as configurable later and are excluded from the sample score.

## What is stubbed

- **Invites.** Request access does not create a user. Only the seeded accounts can sign in. Other roster members have plans and password hashes, without a published password.
- **Plaid.** “Connect with Plaid” explains that Link is not configured. No keys, no Link token, no bank contact.
- **Other members' line items.** Alex has the full sample categories. The rest of the roster is stored as spending, passive income, asset, and liability totals plus their goals, which is what the guide sees.
- **Guide privacy.** Roster and member pages show aggregates and goals. They do not show institutions, account numbers, or transactions.
- No Mighty Networks or Whop integration, no production deploy config.

## Suggested next steps

1. Invite flow for new members, and a Postgres migration when more than one server needs the data.
2. Score snapshots over time, still stored per member.
3. Plaid Link for balances, plus member-confirmed passive tags. Never store bank passwords. Keep raw transactions off the guide view.
4. Decide the gray-area rules (Social Security, DRIP, semi-passive businesses) in product, not only in copy.
5. Deploy when those boundaries are real. Set `AUTH_SECRET`, `AUTH_URL`, and `DATABASE_URL` in the host. The product spec asks to document hosting later; this repo does not deploy yet.

The full v1 note lives in [PRODUCT_SPEC.md](./PRODUCT_SPEC.md).
