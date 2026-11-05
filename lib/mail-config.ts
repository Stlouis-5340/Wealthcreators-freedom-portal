import { readServerEnv } from "@/lib/server-env";

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

export interface MailConfig {
  apiKey: string;
  from: string;
}

/** Accepts `name@domain` or `Display Name <name@domain>`. Rejects newlines and broken brackets. */
export function parseFromAddress(value: string): string | null {
  const from = value.trim();
  if (!from || from.length > 200 || /[\r\n\u0000]/.test(from)) return null;
  const wrapped = from.match(/^(.{1,80}) <([^<>\s]+)>$/);
  if (wrapped) {
    const name = wrapped[1]?.trim() ?? "";
    const email = wrapped[2]?.trim() ?? "";
    if (!name || /[<>"]/.test(name)) return null;
    if (!EMAIL_RE.test(email)) return null;
    return `${name} <${email}>`;
  }
  if (from.includes("<") || from.includes(">")) return null;
  if (!EMAIL_RE.test(from)) return null;
  return from;
}

export function readMailConfig(): MailConfig | null {
  const apiKey = readServerEnv("RESEND_API_KEY");
  const from = parseFromAddress(readServerEnv("EMAIL_FROM"));
  if (!apiKey || apiKey.length > 200 || /[\r\n\s]/.test(apiKey) || !from) return null;
  return { apiKey, from };
}

export function mailIsConfigured(): boolean {
  return readMailConfig() !== null;
}
