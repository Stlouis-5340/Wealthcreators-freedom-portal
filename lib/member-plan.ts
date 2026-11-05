import { alexExpenses } from "@/lib/sample-data";
import type { SeedPlan } from "@/lib/sample-plans";

/** Shown on the guide roster until the member fills in numbers. */
export const NEW_MEMBER_NOTE =
  "Joined by invite. The spending plan and passive income start at zero.";

/**
 * A new member gets the same spending categories the portal already uses, at zero,
 * plus one passive-income line they can edit. Assets and liabilities stay empty
 * so those figures stay missing until there is a real balance.
 */
export function blankMemberPlan(memberId: string): SeedPlan {
  return {
    expenses: alexExpenses.map((line, sort) => ({
      id: `${memberId}-${line.id}`,
      name: line.name,
      monthly: 0,
      note: line.note,
      sort,
    })),
    streams: [
      {
        id: `${memberId}-passive`,
        name: "Passive income",
        monthly: 0,
        source: "Dividends, interest, net rent, or royalties. Wages do not count.",
        sort: 0,
      },
    ],
    assets: [],
    liabilities: [],
    goals: [],
  };
}
