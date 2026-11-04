import { connection } from "next/server";
import { readServerEnv } from "@/lib/server-env";

const MAX_URL = 2000;

/**
 * Community home from `MIGHTY_NETWORKS_URL`.
 * Blank, non-http(s), credentialed, and over-long values stay unset
 * so the member page can show coming soon instead of a broken link.
 */
export function parseCommunityUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value || value.length > MAX_URL) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!url.hostname || url.username || url.password) return null;
  return url.toString();
}

/** Request-time read so a host can set the URL without baking it into the build. */
export async function readCommunityUrl(): Promise<string | null> {
  await connection();
  return parseCommunityUrl(readServerEnv("MIGHTY_NETWORKS_URL"));
}
