import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { readServerEnv } from "@/lib/server-env";

const SALT = "wc-plaid-access-token";

function encryptionKey(): Buffer {
  const secret = readServerEnv("AUTH_SECRET");
  if (!secret) {
    throw new Error("AUTH_SECRET is required to store a Plaid access token.");
  }
  return scryptSync(secret, SALT, 32);
}

export function canStoreAccessTokens(): boolean {
  return readServerEnv("AUTH_SECRET").length > 0;
}

export function encryptAccessToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(
    "$",
  );
}

export function decryptAccessToken(payload: string): string {
  const [version, ivPart, tagPart, dataPart] = payload.split("$");
  if (version !== "v1" || !ivPart || !tagPart || !dataPart || payload.split("$").length !== 4) {
    throw new Error("Stored Plaid access token could not be read.");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  const plain = Buffer.concat([decipher.update(Buffer.from(dataPart, "base64url")), decipher.final()]);
  return plain.toString("utf8");
}
