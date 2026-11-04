/**
 * Preview invite created by the seed.
 * The token is a demo credential, like the passwords in lib/demo-accounts.ts.
 * Revoke this invite on any database that is not a demo.
 */
export const DEMO_INVITE = {
  id: "invite-sample",
  email: "casey@wealthcreators.test",
  name: "Casey Nguyen",
  token: "Freedom-Invite-Casey-2026",
  createdById: "jordan",
  guideId: "jordan",
} as const;
