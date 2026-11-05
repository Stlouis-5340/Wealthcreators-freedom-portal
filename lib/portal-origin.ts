import { headers } from "next/headers";
import { readServerEnv } from "@/lib/server-env";

/** Origin used in invite and password-reset links. Prefers AUTH_URL, then the request host. */
export async function portalOrigin(): Promise<string> {
  const configured = readServerEnv("AUTH_URL");
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === "http:" || url.protocol === "https:") return url.origin;
    } catch {
      // Fall through to the request host.
    }
  }
  try {
    const headerList = await headers();
    const host = (headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "").split(",")[0]?.trim() ?? "";
    const proto = (headerList.get("x-forwarded-proto") ?? "https").split(",")[0]?.trim();
    if (/^[A-Za-z0-9.:-]+$/.test(host) && (proto === "http" || proto === "https")) {
      return `${proto}://${host}`;
    }
  } catch {
    // Seed and scripts have no request.
  }
  return "http://localhost:3000";
}
