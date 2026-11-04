import { readServerEnv } from "@/lib/server-env";

/** Gateway model string. Unset AI_GATEWAY_MODEL uses this id. */
export const DEFAULT_COACH_MODEL = "openai/gpt-4.1-mini";

/**
 * A gateway model is ready when the id has a provider prefix.
 * An empty AI_GATEWAY_MODEL falls back to the default. A value without a
 * provider prefix is treated as missing so the page stays quiet.
 */
export function resolveCoachModel(raw: string | undefined): string | null {
  const model = (raw?.trim() || DEFAULT_COACH_MODEL).trim();
  if (!model.includes("/")) return null;
  return model;
}

export function coachModel(): string | null {
  return resolveCoachModel(readServerEnv("AI_GATEWAY_MODEL"));
}

/** True when a gateway key and a provider/model id are both present. */
export function isCoachReady(apiKey: string, model: string | null): boolean {
  return apiKey.trim().length > 0 && model != null;
}

export function coachConfigured(): boolean {
  return isCoachReady(readServerEnv("AI_GATEWAY_API_KEY"), coachModel());
}
