/**
 * What an assigned Wealth Guide is allowed to see.
 *
 * score covers Freedom Score, Freedom Gap, and Freedom Quality.
 * totals covers net worth, passive income, the spending-plan total, and yield.
 * goals, checkIns, and tasks are the coaching record.
 *
 * Category spending and transactions are not scopes. They stay off in v1.
 * Guides still never receive bank names, masks, or connection tokens.
 */

export interface GuideAccess {
  score: boolean;
  totals: boolean;
  goals: boolean;
  checkIns: boolean;
  tasks: boolean;
}

export const fullGuideAccess: GuideAccess = {
  score: true,
  totals: true,
  goals: true,
  checkIns: true,
  tasks: true,
};

const keys: (keyof GuideAccess)[] = ["score", "totals", "goals", "checkIns", "tasks"];

export function parseGuideAccess(raw: string | null | undefined): GuideAccess {
  if (!raw) return { ...fullGuideAccess };
  try {
    const value = JSON.parse(raw) as Partial<Record<keyof GuideAccess, unknown>>;
    const access = { ...fullGuideAccess };
    for (const key of keys) {
      if (typeof value[key] === "boolean") access[key] = value[key];
    }
    return access;
  } catch {
    return { ...fullGuideAccess };
  }
}

export function serializeGuideAccess(access: GuideAccess): string {
  return JSON.stringify({
    score: access.score,
    totals: access.totals,
    goals: access.goals,
    checkIns: access.checkIns,
    tasks: true,
  });
}

/** Member toggles. Tasks stay on so a Guide can still see follow-ups they assigned. */
export function accessFromMemberToggles(input: {
  score: boolean;
  totals: boolean;
  goals: boolean;
  checkIns: boolean;
}): GuideAccess {
  return {
    score: input.score,
    totals: input.totals,
    goals: input.goals,
    checkIns: input.checkIns,
    tasks: true,
  };
}
