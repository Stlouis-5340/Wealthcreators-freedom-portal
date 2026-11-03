import { cookies } from "next/headers";
import { decryptPrivateValue, encryptPrivateValue } from "@/lib/token-crypto";

const COOKIE = "wc_mfa_step";

/** Holds the password for a few minutes so the authenticator step does not ask for it again. */
export async function stashMfaPassword(email: string, password: string): Promise<void> {
  const jar = await cookies();
  const payload = encryptPrivateValue(
    "mfa-step",
    JSON.stringify({ email, password, exp: Date.now() + 5 * 60 * 1000 }),
  );
  jar.set(COOKIE, payload, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 300,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function readMfaPassword(): Promise<{ email: string; password: string } | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decryptPrivateValue("mfa-step", raw)) as {
      email?: string;
      password?: string;
      exp?: number;
    };
    if (!parsed.email || !parsed.password || typeof parsed.exp !== "number" || parsed.exp < Date.now()) {
      return null;
    }
    return { email: parsed.email, password: parsed.password };
  } catch {
    return null;
  }
}

export async function clearMfaPassword(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}
