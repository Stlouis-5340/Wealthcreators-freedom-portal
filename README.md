# Wealth Creators Freedom Portal

Member portal for Wealth Creators. It tracks how much of a real spending plan is already covered by passive income, how hard assets are working, and the six-year goals on the way there.

Sign-in is Auth.js. Plans, goals, balances, and guide assignments are stored in a database.

## Auth and database

Sign-in uses [Auth.js](https://authjs.dev) (`next-auth` v5) with email and password. The session is a JWT that carries Member or Wealth Guide. Accounts, password hashes, and plan data live in the database.

The database is [Prisma](https://www.prisma.io/) on SQLite for local development. The schema uses ordinary strings, numbers, booleans, and datetimes, so the same models move to Postgres: change the datasource `provider` to `postgresql`, set `DATABASE_URL` to a Postgres URL, create a Postgres migration with `prisma migrate dev`, and run the seed. The checked-in migration is SQLite SQL. Do not point that file at Postgres.

SQLite is the fit here because the app has to migrate and seed on a laptop with no hosted database account. A free hosted Postgres URL can replace `DATABASE_URL` when you take that step.

- Route protection sits in `proxy.ts` (the Next.js 16 replacement for `middleware.ts`).
- Demo logins are Member Alex Rivera and Wealth Guide Jordan Lee. Their password hashes are created by the seed. Other roster members are users with plans, assigned to Jordan, and do not have published passwords.
- A member writes only their own spending lines, balances, and steps. A guide reads assigned members and does not see institutions, account numbers, or transactions, including accounts connected through Plaid.

`AUTH_SECRET` is the session secret. `DATABASE_URL` points at the database file. Neither belongs in git. Demo passwords below are preview logins, not production credentials.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local
```

In `.env.local`, set `AUTH_SECRET` to a long random string (`openssl rand -base64 32`). Leave `AUTH_URL` as `http://localhost:3000` and `DATABASE_URL` as `file:./dev.db`. Leave `PLAID_CLIENT_ID` and `PLAID_SECRET` blank until you want Link. `PLAID_ENV` stays `sandbox`. Do not commit `.env.local`.

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

`next build` reads `.env.local` and expects the migrated database, because signed-in pages read Prisma. Set `AUTH_SECRET` before a production build. The build succeeds when the Plaid id and secret are blank.

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

Edits to spending categories, balances, passive streams, and this-year steps are written to the database and stay after a refresh. **Reset demo data** restores the seeded plan and keeps Plaid connections. A member resets their own plan. Jordan resets every assigned member.

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

## Connect a bank with Plaid

v1 uses [Plaid Link](https://plaid.com/docs/link/) in **sandbox**. The server uses the official `plaid` Node SDK. The browser uses `react-plaid-link` with a link token created on the server. Access tokens are encrypted with AES-256-GCM before they are written to SQLite. The key is derived from `AUTH_SECRET`. They are not sent to the browser and they are not on the guide payload.

With `PLAID_CLIENT_ID` or `PLAID_SECRET` empty, Assets still loads. **Connect with Plaid** opens a branded “Plaid is not configured” dialog and does not call Plaid. `npm run build` does not require the keys.

When the keys are set, a member can link an institution. After Link, the server exchanges the public token, stores the encrypted access token, and writes balances onto the member plan:

- Checking, savings, and other depository accounts become **Cash** assets.
- Investment and brokerage accounts become **Investments** assets.
- Credit cards and loans become **liabilities**, so they do not inflate the yield-on-assets denominator.
- Sample lines stay editable and labeled Sample. Synced lines are read-only. **Refresh balances** pulls them again. **Remove connection** calls Plaid `/item/remove` when it can, then deletes the local item, its accounts, and the synced lines.
- Institution names and the last four digits are visible to that member. The guide roster and member progress pages stay totals, Freedom Score, and goals. They do not receive bank names, masks, or transactions. This build does not import transactions.

### Sandbox setup

1. Create a free account at [https://dashboard.plaid.com/signup](https://dashboard.plaid.com/signup).
2. Open [https://dashboard.plaid.com/developers/keys](https://dashboard.plaid.com/developers/keys) (or **Team settings → Keys**). Create a Sandbox app if you are asked to. Enable **Transactions**. Enable **Investments** as well if you want brokerage accounts in Link. If Investments is off, Link still starts with Transactions only.
3. Copy the client id and the **sandbox** secret into `.env.local`:

```bash
PLAID_CLIENT_ID=your_sandbox_client_id
PLAID_SECRET=your_sandbox_secret
PLAID_ENV=sandbox
```

4. Apply the Plaid migration if you have not already, then start the app:

```bash
npm run db:migrate
npm run dev
```

5. Sign in as Alex Rivera, open **Net Worth**, and choose **Connect with Plaid**.
6. In Link, pick a sandbox institution such as **First Platypus Bank**. Username `user_good`, password `pass_good`. If Link asks for a code, use `1234`. Plaid’s full list is [sandbox test credentials](https://plaid.com/docs/sandbox/test-credentials/).
7. The new accounts show name, type, and balance. Net worth and yield on assets include them. The access token in `prisma/dev.db` is the `v1$...` ciphertext on `PlaidItem.accessTokenEnc`, not the raw token. Sign in as Jordan Lee and confirm the roster still has no bank name, mask, or transaction.
8. **Remove connection** deletes that item. With the id and secret cleared again, the same button returns to the not-configured state.

Use the sandbox secret only. Do not put a development or production secret in this demo.

## What is stubbed

- **Invites.** Request access does not create a user. Only the seeded accounts can sign in. Other roster members have plans and password hashes, without a published password.
- **Passive tags on synced accounts.** Plaid balances feed net worth and the yield denominator. They do not yet create passive income lines. The member still edits those streams by hand.
- **Other members' line items.** Alex has the full sample categories. The rest of the roster is stored as spending, passive income, asset, and liability totals plus their goals, which is what the guide sees.
- **Guide privacy.** Roster and member pages show aggregates and goals. They do not show institutions, account numbers, or transactions.
- No Mighty Networks or Whop integration, no production deploy config.

## Suggested next steps

1. Invite flow for new members, and a Postgres migration when more than one server needs the data.
2. Score snapshots over time, still stored per member.
3. Member-confirmed passive tags on synced balances. Never store bank passwords. Keep raw transactions off the guide view.
4. Decide the gray-area rules (Social Security, DRIP, semi-passive businesses) in product, not only in copy.
5. Deploy when those boundaries are real. Set `AUTH_SECRET`, `AUTH_URL`, `DATABASE_URL`, and the Plaid sandbox variables in the host. Production Link is a later switch of `PLAID_ENV` and the secret. This repo does not deploy yet.

The full v1 note lives in [PRODUCT_SPEC.md](./PRODUCT_SPEC.md).
