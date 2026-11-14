# Wealth Creators Freedom Portal

Member portal for Wealth Creators. It tracks how much of a real spending plan is already covered by passive income, how hard assets are working, and the six-year goals on the way there.

Sign-in is Auth.js. Plans, goals, balances, and guide assignments are stored in a database.

## Auth and database

Sign-in uses [Auth.js](https://authjs.dev) (`next-auth` v5) with email and password. The session is a JWT that carries Member, Wealth Guide, or Admin. Accounts, password hashes, and plan data live in the database. Guides and admins must enroll an authenticator app before they can use the portal. The seed leaves it off, so a seeded demo login opens the enrollment page and nothing else. Members can leave it off. After someone enrolls, the next sign-in asks for a 6-digit code.

The database is [Prisma](https://www.prisma.io/). Local development stays on SQLite (`prisma/schema.prisma` and `prisma/migrations`). Production on Vercel uses Postgres (`prisma/postgres/schema.prisma` and `prisma/postgres/migrations`). The models are the same strings, numbers, booleans, and datetimes. Prisma cannot switch the provider inside one schema file, so the build checks that those two model blocks still match. Do not run the SQLite migrations against Postgres.

- Route protection sits in `proxy.ts` (the Next.js 16 replacement for `middleware.ts`).
- Demo logins are Member Alex Rivera, Wealth Guide Jordan Lee, and Admin Morgan Hale. They exist only on a local or preview database. The seed sets their password from `DEMO_PASSWORD`, or a random one when it is blank. No demo password is published or kept in the code. Other roster members are users with plans, assigned to Jordan.
- A member writes only their own spending lines, balances, and steps. A guide reads assigned members and does not see institutions, account numbers, or transactions, including accounts connected through Plaid. The member chooses whether the guide sees score, totals, goals, and check-ins. Category spending stays off.
- An admin manages people, roles, assignments, and the audit log. An admin does not open member plans.

`AUTH_SECRET` is the session secret. `DATABASE_URL` points at SQLite locally and at Postgres in production. Neither belongs in git.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local
```

In `.env.local`, set `AUTH_SECRET` to a long random string (`openssl rand -base64 32`). Leave `AUTH_URL` as `http://localhost:3000` and `DATABASE_URL` as `file:./dev.db`. Leave `PLAID_CLIENT_ID` and `PLAID_SECRET` blank until you want Link. `PLAID_ENV` stays `sandbox`. Leave `MIGHTY_NETWORKS_URL` blank to show members Community coming soon, or set it to the community’s http or https address when that link should open. Leave `RESEND_API_KEY` and `EMAIL_FROM` blank until outbound email should send. Invites and the demo logins work without them. Do not commit `.env.local`.

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
npx tsx scripts/check-leadership.ts
npx tsx scripts/check-community-link.ts
npx tsx scripts/check-invites.ts
npx tsx scripts/check-mail.ts
npx tsx scripts/check-mfa-required.ts
```

`npm run build` reads `.env.local`. With a `file:` database URL it generates the SQLite client and does not contact Postgres. Signed-in pages still need `AUTH_SECRET` and a migrated local database. The build succeeds when the Plaid id and secret are blank.

## Demo logins

| Role | Person | Email | Lands on |
| --- | --- | --- | --- |
| Member | Alex Rivera | alex@wealthcreators.test | Dashboard |
| Wealth Guide | Jordan Lee | jordan@wealthcreators.test | Command center |
| Admin | Morgan Hale | admin@wealthcreators.test | People |

Set `DEMO_PASSWORD` in `.env.local` (12 or more characters) before `npm run db:seed` to choose the password for all three. `DEMO_PASSWORD_ALEX`, `DEMO_PASSWORD_JORDAN`, and `DEMO_PASSWORD_ADMIN` override it per account. When none is set, each seed run picks a random password, so use Forgot password or set the variable and seed again.

The seed refuses to run in production. Against Postgres it also needs `ALLOW_DEMO_SEED=1`, so a copied `.env.local` that points at the production database cannot reseed it. Never set that for production. The production database has no demo logins.

The accounts are created by `npm run db:seed` from `lib/demo-accounts.ts` and `lib/sample-data.ts`. `/signup` redirects to sign-in and does not create a user. New members join from an invite link.

A Guide creates that link on the command center. An admin creates it on People. Email is required. A display name is optional. The link is single-use and expires after 7 days. When `RESEND_API_KEY` and `EMAIL_FROM` are both set, the form emails the link (on by default) and still shows it once so it can be copied. When either is blank, the page says email is not configured and the link is copied by hand. The person sets a password on the accept page and then signs in at `/login` as a Member. A Guide's invite assigns that member to them when it is accepted. An admin can assign a Guide on the invite or leave that for later. Unused invites can be revoked. Creating, accepting, and revoking an invite is written to the audit log. The raw token is not stored. The database keeps a SHA-256 hash.

Forgot password is on the sign-in page. When email is configured, it sends a single-use link that expires in one hour. The database stores a SHA-256 hash of that token. A newer link retires the previous unused one. An address can receive at most three reset emails in an hour. The confirmation is the same whether or not the address has an active account. If email is not configured, the page says so and does not say whether the account exists. Changing the password ends sessions that signed in before the change. An authenticator app stays on if it was already on.

The seed leaves one unused sample invite for Casey Nguyen (`casey@wealthcreators.test`), assigned to Jordan. Its preview link is shown on the command center while the invite is open. It is a demo credential. Revoke it on any database that is not a demo. Accepting it creates a Member whose spending categories and passive-income line start at zero, with no assets or liabilities. Running the seed again refreshes that link until someone accepts it. Alex, Jordan, and Morgan keep their demo logins on that database. Other roster members still have plans and random password hashes.

`npx tsx scripts/check-leadership.ts` checks the aggregate math, the “guides are not ranked” rule, and that `/admin/analytics` is wired only through the admin gate. To see the page, seed the database, run `npm run dev`, and sign in as Morgan. Alex is returned to the member dashboard. Jordan is returned to the command center. The check script does not sign in.

`npx tsx scripts/check-invites.ts` checks invite tokens, expiry, and that accepting a link creates a Member. It also checks that the public sign-up action does not create a user. It uses the local database and deletes the accounts it creates.

`npx tsx scripts/check-mail.ts` checks invite email when mail is off, on, skipped, or failed, and password-reset tokens: hash, expiry, single use, the hourly limit, and that a missing address gets the same confirmation as a real one. It does not call Resend. It uses the local database and deletes the accounts it creates.

`npx tsx scripts/check-community-link.ts` checks that `MIGHTY_NETWORKS_URL` accepts only an http or https address, and that a blank value does not invent a login. It does not sign in.

After sign-in:

- Alex sees only the member shell: dashboard, Freedom Coach, monthly Freedom Report, weekly check-in, Freedom Gap, Wealth Efficiency, Forecast, goals, net worth, spending plan, milestones, Learn, Guide, challenges, Community, recognition, life, and legacy. The figures are Alex's plan in the database. Opening `/guide` returns to the dashboard. The home card opens the current month. Alex also has a saved prior month, so the report can show what moved. Efficiency splits income-producing capital from the rest. Forecast shows illustrated date ranges, and the decision simulator saves a what-if. One seeded scenario is shared with Jordan. A second stays private. Learn has the shared lesson catalog. Alex has two lessons finished, one in progress, and a quiz score. Guide is the shared workspace: one thread, one session note, one agenda item, and an action item. The Guide tab shows an unread count until Alex opens it. Coach shows a seeded Freedom Action Plan for this month and last month, plus one sample exchange. Chat and a fresh plan stay off until `AI_GATEWAY_API_KEY` is set. No extra seed flag is required. Alex is also enrolled in the weekly check-in challenge, with a small circle named Quiet week circle. Recognition unlocks from that plan: the 50% Freedom Score band is shared with Jordan, and the first report, the first passive-income band, and the 25% band stay private. Life has a few self-reported measures. None of those cards show balances. Legacy has a short estate checklist, two beneficiaries, two insurance summaries, and two document titles. It is an educational organizer, not legal advice. Jordan does not see it until Alex turns Legacy on under Guide access. No Social Security numbers or document files are stored. Community sits in the member menu. With `MIGHTY_NETWORKS_URL` set to an http or https address, that item opens Mighty Networks in a new tab. With it blank, or set to something that is not a web address, Community says coming soon and does not show a login.
- Jordan sees the command center and each assigned member's progress. The assignment is the full sample roster, including Alex. Jordan can invite a new Member from the command center. When email is configured, that invite can be emailed and the link is still shown to copy. That person is assigned to Jordan when they accept the link. Opening the member editor returns to the command center. Member detail includes that month's coaching report, the Freedom Action Plan when goals are shared, any forecast the member marked shared, the lessons Alex finished (titles and quiz scores, not answers), the shared workspace, challenge enrollments, recognition the member shared, and the legacy planner only when Alex has turned that scope on. The coach chat stays on Alex's side. Private scenarios and private recognition are not loaded. The guide screens still omit institutions, account numbers, category spending, and transactions. Score, totals, goals, check-ins, and learning progress are on by default. Alex can turn those off under Guide access, and those switches also hide the matching numbers inside a shared scenario, a score or debt challenge, and a shared recognition card that depends on that scope. Jordan's scheduling link is a placeholder Calendly URL. A program-wide fallback can be set with `NEXT_PUBLIC_GUIDE_SCHEDULING_URL` when a Guide has not saved one. When `MIGHTY_NETWORKS_URL` is set, Jordan’s menu and the top of the command center include the same Community link. It stays off those surfaces when the address is blank.
- Morgan sees People, Leadership analytics, and the audit log. People can change a role, assign a Guide, pause sign-in, or invite a Member. An admin invite can name a Guide or leave the assignment for later, and can email the link when mail is configured. People does not show balances. Leadership analytics (`/admin/analytics`) shows program outcomes from the seeded roster: Freedom Score movement, milestones, goal steps, check-ins, learning, challenges, coach usage, and Guide reply time. It does not show balances, coaching-note text, or bank details, and it does not rank Guides by score. The Mighty Networks address is `MIGHTY_NETWORKS_URL` in the environment, not a control on People or Leadership. Authenticator status is on or off, never the secret. Alex and Jordan are sent away from `/admin/analytics`.
- Guides and admins must enroll an authenticator at Security before the command center, People, or any member data will open. A password sign-in without MFA lands on that page, and other routes redirect back or reject the API with a pointer to `/security`. After enrollment, every sign-in asks for a 6-digit code before a session is issued. Members can still sign in with a password only. `npx tsx scripts/check-mfa-required.ts` covers that gate. It uses the local database and deletes the accounts it creates.
- Sign out clears the session and returns to `/login`.

Edits to spending categories, balances, passive streams, holding roles, and this-year steps are written to the database and stay after a refresh. **Reset demo data** restores the seeded plan, Alex's holding roles, and Alex's sample scenarios, and keeps Plaid connections. A member resets their own plan. Jordan resets every assigned member.

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
- **Member invites.** A Guide or an admin creates a single-use link for a new Member. The link expires after 7 days and can be revoked before it is used. When email is configured, the link can be emailed and is still shown once to copy. The accept page sets the password and creates the account. Public sign-up stays closed.
- **Password reset.** Forgot password on the sign-in page emails a one-time link when Resend is configured. The link expires in one hour. The raw token is not stored.
- **Yield on assets** (the primary yield on Home and Net Worth) = annual passive income ÷ total assets. Annual passive is monthly passive × 12.
- **Income-producing yield** = annual passive income ÷ holdings marked income-producing. Wealth Efficiency = annual passive income ÷ net worth, and it stays secondary. Neither one changes Freedom Score.
- **Forecast** projects Freedom Score bands at 25, 50, 75, 100, 150, and 200 percent under conservative, current, and accelerated assumptions. Dates are ranges. The decision simulator reruns that math for a $500 expense cut, $1,000 of added passive income, or $1,000 more contributed each month. Saved runs are private unless shared.
- **Freedom Coach.** A member page with this month's Freedom Action Plan (three actions: impact, difficulty, timeline, and the goal they serve) and a streaming chat. The model reads the plan, Freedom Score, Freedom Gap, Freedom Quality, goals, recent check-ins, and lesson progress. It does not receive bank names or tokens. Replies and plans are educational guidance, not financial, tax, legal, or investment advice. Chat threads and the monthly plan are stored. Refreshing the plan once in a month keeps the previous JSON and the chat. With `AI_GATEWAY_API_KEY` blank, the page loads, the seeded plan still shows, and chat is disabled. Guides see the plan only when goals are shared. Dollar amounts stay off unless score or totals are shared. Admins do not open member plans, and a coach insight still requires an active guide grant.
- **Net worth** = assets − liabilities.
- **Spending plan** is the expense denominator. Categories are stored per member and are editable for the signed-in member.
- **Goals** for Alex: two wealth goals and one personal goal, each with year-1 through year-6 checkpoints and this-year steps.
- **Milestones** at Freedom Score bands 25, 50, 75, 100, and 125%.
- **Learn.** Curated paths and lessons (beginner or intermediate, with a time estimate). Opening a lesson marks it in progress. A member can mark it complete, check an optional action exercise, and take a short quiz on three of the lessons. The score is stored. The answers are not. The monthly report lists how many lessons are finished.
- **Guide workspace.** The member Guide page and the guide's member page share action items (either person can mark one done), a short message thread, session notes the Guide writes, and agenda items the member proposes. An unread count sits on the member's Guide tab. A scheduling link opens outside the portal. It does not use Calendly sign-in.
- **Weekly check-in.** One reflection per member per America/Chicago week (Monday–Sunday). The home card asks for a check-in until this week is saved, then shows the summary. A later save in the same week updates that week.
- **Monthly Freedom Report.** One snapshot per member per America/Chicago month. Opening the current month saves it again from the plan. Earlier months stay as they were. Movement uses the prior month's report when one exists, otherwise a check-in from that month, and otherwise says First report. The three next steps are educational coaching, not investment advice. Learning progress on the report is current lesson completion, not a number frozen with the month. Print uses the browser's print dialog, including save as PDF. The link works only for that member, or for a Guide assigned to them. It is not a public page. Guides see the same month on the member page, plus the latest check-in and open task and note counts, still without bank names. Learning titles stay hidden when the member turns learning progress off.
- **Guide command center** with explainable queues: asked for support, missed this week's check-in, Freedom Score down versus an earlier check-in snapshot, behind on goals, and recent progress. Member detail shows the check-in history. Guides can add a timestamped note and a small task. There is no daily score history, and goal steps have no due dates.
- **Community.** An optional link to Mighty Networks. Set `MIGHTY_NETWORKS_URL` to the community home. Members always have Community in the menu: a new tab when the address is http or https, and a coming-soon page when it is blank. Guides see that link in the menu and a single line on the command center only when it is set. There is no OAuth, no SSO, and no discussion feed inside the portal. The address is not stored in the database.
- **Challenges.** A catalog of 30, 60, and 90 day challenges. A member enrolls, and progress is a checklist or a percent from the plan and check-ins already on file. An optional circle stores a name and member ids. Guides see enrollments for assigned members, read-only, and only when the matching Guide access is on. A score challenge needs the score shared. A debt challenge needs totals shared. A check-in streak needs check-ins shared. The card is a title, a status, and a percent.
- **Recognition.** Badges unlock from a saved Freedom Report, the first passive-income band, Freedom Score bands at 25, 50, 75, and 100 percent, a completed six-year goal, four weekly check-ins in a row, and a lesson marked read on the lessons challenge. The member chooses private or shared with their Guide. There is no public feed. Cards do not show net worth, income amounts, debt amounts, or account details. A shared card still follows Guide access.
- **Life.** Optional self-reported hours of time freedom, a family priority from 1 to 5, a health-habit streak in days, and experiences planned. The page says money serves the life. These fields do not change Freedom Score, and Guides do not see them.
- **Legacy.** A private planner for beneficiaries, an estate checklist, trust status, insurance summaries, document titles, family education goals, charitable intentions, and legacy priorities. Open steps suggest questions for a qualified professional. The page states it is not legal advice. Guides see it only when the member turns Legacy on. Beneficiaries have no Social Security number field. Document files are not uploaded; a file name stores a private placeholder path until `BLOB_READ_WRITE_TOKEN` is configured.
- **Guide roster** with filters: all, needs attention, goals behind, near the line, Freedom+. Member detail shows totals, goals, and check-ins. It does not show bank names, masks, or Plaid tokens.
- **Leadership analytics** for admins at `/admin/analytics`. It aggregates the seeded roster: who is up or down from the earliest saved Freedom Score, milestone bands, goal steps, check-ins, lessons, challenges, coach threads, and how long a Guide took to reply on the shared workspace. Cohorts (Foundation, Building, Near the line) describe starting circumstance. Guide context is listed by name, with the cohort mix beside the score change. Members and Guides cannot open the route.
- **Sessions** are httpOnly Auth.js JWTs. `proxy.ts` redirects anonymous visitors to `/login` and keeps each role inside its own routes. Server layouts check the session again.

Sample passive income includes dividends, interest, net rent, and a royalty. Wages, asset sales, gifts, debt draws, and transfers do not count. Social Security, DRIP, and semi-passive business income are called out as configurable later and are excluded from the sample score.

## Connect a bank with Plaid

v1 uses [Plaid Link](https://plaid.com/docs/link/) in **sandbox**. The server uses the official `plaid` Node SDK. The browser uses `react-plaid-link` with a link token created on the server. Access tokens are encrypted with AES-256-GCM before they are written to the database. The key is derived from `AUTH_SECRET`. The ciphertext stays on the server. It is not sent to the browser and not included on the guide payload.

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

- **Passive tags on synced accounts.** Plaid balances feed net worth and the yield denominator. They do not yet create passive income lines. The member still edits those streams by hand.
- **Other members' line items.** Alex has the full sample categories. The rest of the roster is stored as spending, passive income, asset, and liability totals plus their goals, which is what the guide sees.
- **Guide privacy.** Roster and member pages show aggregates, goals, and check-in answers. They do not show institutions, account numbers, masks, or transactions.
- **Mighty Networks** is the optional link above. It is not a sign-in integration. Whop is not integrated.

## Outbound email

Invites and password reset use [Resend](https://resend.com). Both stay off until `RESEND_API_KEY` and `EMAIL_FROM` are set. Invites still create a copyable link. Password reset says email is not set up, and it does not say whether the address has an account.

1. Create an API key in the Resend dashboard. Put it in `.env.local` or in Vercel as `RESEND_API_KEY`. Never commit it.
2. Marvin verifies the sending domain `wealthdomination.com` in Resend. That means adding the DNS records Resend shows (usually SPF and DKIM). This repo does not create those records. Until the domain is verified, Resend will not deliver to members.
3. Set `EMAIL_FROM` to a sender on that domain. `Wealth Creators <noreply@wealthdomination.com>` is the suggested address. `invites@wealthdomination.com` is a fine alternative if you want invite mail separate later. One from address covers both invites and password reset.
4. Set production `AUTH_URL` to `https://freedom.wealthdomination.com` so the links in the email use that origin.

A failed send still leaves the invite link on screen for staff to copy. Password reset does not show a link in the browser.

## Go live on Vercel

Local `npm run dev` stays on SQLite. The hosted app needs Postgres, because a serverless function cannot keep a SQLite file. `vercel.json` sets the build command to `npm run build`. On Vercel that generates the Postgres Prisma client and applies `prisma/postgres/migrations`. `postinstall` still runs `prisma generate` for the local SQLite client.

1. Create a free Postgres database at [Neon](https://neon.tech). Copy the **pooled** connection string and the **direct** connection string.
2. In the [Vercel dashboard](https://vercel.com/new), import this repo. Leave the framework preset on Next.js.
3. Set these environment variables for Production. Use the same names for Preview if those deploys should boot. Real values stay in Vercel, not in git.

| Name | Value |
| --- | --- |
| `AUTH_SECRET` | Long random string (`openssl rand -base64 32`) |
| `AUTH_URL` | Production: `https://freedom.wealthdomination.com`. Invite and password-reset links use this origin. A preview deploy can use its own https URL. |
| `AUTH_TRUST_HOST` | `true` |
| `DATABASE_URL` | Pooled Postgres URL. Neon example: `postgresql://USER:PASSWORD@HOST-pooler.../neondb?sslmode=require&pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Direct Postgres URL, used for migrations. If there is no pooler, set this to the same value as `DATABASE_URL`. |
| `PLAID_CLIENT_ID` | Blank until you want Link |
| `PLAID_SECRET` | Blank until you want Link |
| `PLAID_ENV` | `sandbox` |
| `AI_GATEWAY_API_KEY` | Blank until the Freedom Coach should call the model. Already set on Vercel for this project. Never commit it. |
| `AI_GATEWAY_MODEL` | Optional. A gateway id such as `openai/gpt-4.1-mini`. Unset uses that default. |
| `MIGHTY_NETWORKS_URL` | Optional. Full http or https address of the Mighty Networks community. Blank keeps member Community as coming soon and hides the guide link. |
| `RESEND_API_KEY` | Blank until invites and password reset should send mail. A Resend API key. Never commit it. |
| `EMAIL_FROM` | Blank until mail should send. Example: `Wealth Creators <noreply@wealthdomination.com>`. |

4. Deploy. The build migrates the empty database. It does not seed, so demo logins do not exist yet.
5. From your laptop, seed the demo once. Use the **direct** Postgres URL (not the pooler) for both variables. Running migrate again is safe if the Vercel build already applied it.

```bash
DATABASE_URL="postgresql://DIRECT..." DIRECT_URL="postgresql://DIRECT..." npm run db:migrate:postgres
DATABASE_URL="postgresql://DIRECT..." npm run db:seed:postgres
npx prisma generate
```

`db:seed:postgres` creates Alex Rivera and Jordan Lee. The last command restores the SQLite Prisma client so `npm run dev` keeps using `prisma/dev.db`.

6. Open the Vercel URL and sign in with the demo logins. Plaid stays on the not-configured screen until the Plaid variables are set. Preview deployments need a Postgres URL too. They can share this database for the demo, or use a separate Neon branch.

If Prisma reports a prepared-statement error at runtime, the pooled URL needs `&pgbouncer=true`. Migrations use `DIRECT_URL`, not the pooled URL.

## Suggested next steps

1. Score snapshots over time, still stored per member.
2. Member-confirmed passive tags on synced balances. Never store bank passwords. Keep raw transactions off the guide view.
3. Decide the gray-area rules (Social Security, DRIP, semi-passive businesses) in product, not only in copy.
4. Switch `PLAID_ENV` to `production` with the production secret when Link should use real institutions.

The full v1 note lives in [PRODUCT_SPEC.md](./PRODUCT_SPEC.md).
