import { readServerEnv } from "@/lib/server-env";

const environments = new Set(["sandbox", "development", "production"]);

export type PlaidEnvName = "sandbox" | "development" | "production";

export interface PlaidCredentials {
  clientId: string;
  secret: string;
  env: PlaidEnvName;
}

export function plaidCredentials(): PlaidCredentials | null {
  const clientId = readServerEnv("PLAID_CLIENT_ID");
  const secret = readServerEnv("PLAID_SECRET");
  if (!clientId || !secret) return null;
  const env = readServerEnv("PLAID_ENV") || "sandbox";
  if (!environments.has(env)) return null;
  return { clientId, secret, env: env as PlaidEnvName };
}

export function isPlaidConfigured(): boolean {
  return plaidCredentials() !== null;
}

export type LinkTokenResult =
  | { configured: false }
  | { configured: true; linkToken: string }
  | { configured: true; error: string };

export type PlaidActionResult = { ok: true } | { ok: false; error: string };
