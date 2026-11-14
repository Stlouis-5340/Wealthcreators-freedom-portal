import { randomBytes } from "node:crypto";

const MIN_LENGTH = 12;

/**
 * Password for a seeded demo login. Never hard-code one here.
 * Uses DEMO_PASSWORD_<ID> (for example DEMO_PASSWORD_ALEX), then DEMO_PASSWORD.
 * When neither is set, or the value is shorter than 12 characters, a random
 * password is generated so the seed never writes a known password.
 */
export function demoPassword(id: string): { password: string; fromEnv: boolean } {
  const specific = process.env[`DEMO_PASSWORD_${id.toUpperCase()}`] ?? "";
  const shared = process.env.DEMO_PASSWORD ?? "";
  const value = specific || shared;
  if (value.length >= MIN_LENGTH) return { password: value, fromEnv: true };
  return { password: randomBytes(24).toString("base64url"), fromEnv: false };
}
