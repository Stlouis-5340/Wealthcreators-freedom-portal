/**
 * Self-reported life measures. They do not change Freedom Score.
 * Money is the tool. These fields are the life it is for.
 */

export interface LifeDraft {
  timeFreedomHours: number | null;
  familyPriority: number | null;
  healthStreakDays: number | null;
  experiencesPlanned: string;
}

export interface LifeView extends LifeDraft {
  updatedAt: string | null;
}

export const emptyLife: LifeView = {
  timeFreedomHours: null,
  familyPriority: null,
  healthStreakDays: null,
  experiencesPlanned: "",
  updatedAt: null,
};

export function parseLifeDraft(input: {
  timeFreedomHours: unknown;
  familyPriority: unknown;
  healthStreakDays: unknown;
  experiencesPlanned: unknown;
}): { ok: true; value: LifeDraft } | { ok: false; message: string } {
  const hours = optionalNumber(input.timeFreedomHours);
  if (hours === "bad" || (hours != null && (hours < 0 || hours > 168))) {
    return { ok: false, message: "Time freedom is hours per week, from 0 to 168." };
  }
  const family = optionalInteger(input.familyPriority);
  if (family === "bad" || (family != null && (family < 1 || family > 5))) {
    return { ok: false, message: "Family priority is a whole number from 1 to 5." };
  }
  const health = optionalInteger(input.healthStreakDays);
  if (health === "bad" || (health != null && (health < 0 || health > 3650))) {
    return { ok: false, message: "Health streak is whole days, from 0 to 3650." };
  }
  const experiences = typeof input.experiencesPlanned === "string" ? input.experiencesPlanned : "";
  const cleaned = experiences.replace(/[\u0000-\u001F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 280);
  return {
    ok: true,
    value: {
      timeFreedomHours: hours == null ? null : Math.round(hours * 10) / 10,
      familyPriority: family,
      healthStreakDays: health,
      experiencesPlanned: cleaned,
    },
  };
}

function optionalNumber(value: unknown): number | null | "bad" {
  if (value == null || value === "") return null;
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(number)) return "bad";
  return number;
}

function optionalInteger(value: unknown): number | null | "bad" {
  const number = optionalNumber(value);
  if (number === "bad" || number == null) return number;
  if (!Number.isInteger(number)) return "bad";
  return number;
}
