import type {
  AssetLine,
  Checkpoint,
  ExpenseLine,
  Goal,
  LiabilityLine,
  PassiveStream,
} from "./types";

const YEARS = [1, 2, 3, 4, 5, 6] as const;

function rail(
  labels: readonly [string, string, string, string, string, string],
  targets?: readonly [number, number, number, number, number, number],
): Checkpoint[] {
  return labels.map((label, index) => ({
    year: YEARS[index],
    calendarYear: 2026 + index,
    label,
    targetValue: targets?.[index],
  }));
}

export const GUIDE = {
  name: "Jordan Lee",
  title: "Wealth Guide",
};

export const MEMBER = {
  name: "Alex Rivera",
  title: "Member",
};

export const alexIdentity = {
  id: "alex",
  name: "Alex Rivera",
  lastActive: "2026-10-26",
};

export const alexExpenses: ExpenseLine[] = [
  {
    id: "housing",
    name: "Housing",
    monthly: 2400,
    note: "The planned cost of housing, including the mortgage payment. The loan balance lives on Net Worth.",
  },
  {
    id: "food",
    name: "Food",
    monthly: 850,
    note: "Groceries and the meals you intend to keep, not a surprise month.",
  },
  {
    id: "transport",
    name: "Transportation",
    monthly: 420,
    note: "Car, insurance share, and transit you actually use.",
  },
  {
    id: "insurance",
    name: "Insurance",
    monthly: 310,
    note: "Health, life, and property premiums outside the housing line.",
  },
  {
    id: "utilities",
    name: "Utilities and home",
    monthly: 240,
    note: "Power, water, internet, and ordinary upkeep.",
  },
  {
    id: "health",
    name: "Health",
    monthly: 180,
    note: "Care you plan for beyond premiums.",
  },
  {
    id: "personal",
    name: "Personal and family",
    monthly: 350,
    note: "The life around the plan: kids, clothes, small travel.",
  },
  {
    id: "giving",
    name: "Giving",
    monthly: 200,
    note: "Kept on purpose so generosity is not whatever is left.",
  },
];

export const alexStreams: PassiveStream[] = [
  {
    id: "dividends",
    name: "Dividend portfolio",
    monthly: 1180,
    source: "Taxable brokerage distributions",
  },
  {
    id: "interest",
    name: "Treasury and cash interest",
    monthly: 420,
    source: "Treasuries and high-yield cash",
  },
  {
    id: "rent",
    name: "Duplex net rent",
    monthly: 1650,
    source: "Rent minus operating costs, not gross rent",
  },
  {
    id: "royalty",
    name: "Book royalty",
    monthly: 210,
    source: "Royalty on a finished book",
  },
];

export const alexAssets: AssetLine[] = [
  {
    id: "brokerage",
    name: "Taxable brokerage",
    institution: "Vanguard",
    group: "Investments",
    balance: 285400,
  },
  {
    id: "cash",
    name: "Treasuries and cash",
    institution: "TreasuryDirect",
    group: "Cash",
    balance: 96200,
  },
  {
    id: "duplex",
    name: "Duplex",
    institution: "Owned",
    group: "Property",
    balance: 410000,
  },
  {
    id: "retirement",
    name: "Retirement accounts",
    institution: "Fidelity",
    group: "Retirement",
    balance: 168500,
  },
  {
    id: "home",
    name: "Primary home",
    institution: "Owned",
    group: "Property",
    balance: 525000,
  },
];

export const alexLiabilities: LiabilityLine[] = [
  {
    id: "home-mortgage",
    name: "Primary mortgage",
    balance: 312400,
    note: "Balance, not the monthly payment. The payment sits in Housing.",
  },
  {
    id: "duplex-mortgage",
    name: "Duplex mortgage",
    balance: 241800,
    note: "Net rent on the passive side is after operating costs, not after principal.",
  },
];

export const alexGoals: Goal[] = [
  {
    id: "alex-freedom",
    kind: "wealth",
    title: "Cover the life you already live",
    summary:
      "Passive income covers the spending plan, then a small surplus so a quiet month does not break it.",
    progressSource: "freedom",
    baseline: 40,
    baselineLabel: "a 40% starting score",
    target: 110,
    targetLabel: "110% Freedom Score by 2031",
    checkpoints: rail(
      ["75% score", "82% score", "88% score", "94% score", "The line", "110% surplus"],
      [75, 82, 88, 94, 100, 110],
    ),
    steps: [
      {
        id: "alex-freedom-plan",
        title: "Lock the spending plan",
        detail: "Housing stays at or under $2,400. The plan is the score denominator.",
        done: true,
      },
      {
        id: "alex-freedom-sleeve",
        title: "Add $200 a month in dividends or interest",
        detail: "A durable stream, not a one-time sale of principal.",
        done: false,
      },
      {
        id: "alex-freedom-rent",
        title: "Raise duplex net rent by $150 a month",
        detail: "A lease renewal or a cost you can actually cut. Gross rent is not the number.",
        done: false,
      },
      {
        id: "alex-freedom-rules",
        title: "Tag every stream with the passive-income rules",
        detail: "Done with Jordan. Salary and transfers stay out of the score.",
        done: true,
      },
      {
        id: "alex-freedom-reserve",
        title: "Hold three months of the plan in cash",
        detail: "Separate from invested assets, so a quiet month does not force a sale.",
        done: false,
      },
    ],
  },
  {
    id: "alex-networth",
    kind: "wealth",
    title: "Reach $1.5M with liabilities on purpose",
    summary:
      "Grow net worth while both mortgages stay visible. Extra principal is a choice, not a reflex.",
    progressSource: "netWorth",
    baseline: 720000,
    baselineLabel: "$720k net worth",
    target: 1500000,
    targetLabel: "$1.5M net worth by 2031",
    checkpoints: rail(
      ["$980k", "$1.08M", "$1.18M", "$1.28M", "$1.38M", "$1.50M"],
      [980000, 1080000, 1180000, 1280000, 1380000, 1500000],
    ),
    steps: [
      {
        id: "alex-nw-review",
        title: "Review both mortgages with Jordan",
        detail: "Balances, rates, and whether extra principal helps the six-year target.",
        done: false,
      },
      {
        id: "alex-nw-debt",
        title: "Take on no new consumer debt",
        detail: "The year stays clean if this remains true in December.",
        done: true,
      },
      {
        id: "alex-nw-surplus",
        title: "Direct the next $300 a month to the taxable account",
        detail: "Only after the cash reserve step is funded. Order matters.",
        done: false,
      },
    ],
  },
  {
    id: "alex-sabbatical",
    kind: "personal",
    title: "Four weeks away, principal untouched",
    summary:
      "A family sabbatical funded by surplus and a named reserve, not by selling the assets that produce income.",
    progressSource: "journey",
    targetLabel: "Take it in 2031",
    checkpoints: rail([
      "Trip named, reserve started",
      "Reserve covers two weeks",
      "Dates chosen with family",
      "Reserve covers four weeks",
      "A one-week dry run",
      "Take the four weeks",
    ]),
    steps: [
      {
        id: "alex-life-sentence",
        title: "Write the sabbatical in one sentence",
        detail: "Shared with Jordan: four weeks away, without selling investments.",
        done: true,
      },
      {
        id: "alex-life-auto",
        title: "Automate $200 a month into the sabbatical reserve",
        detail: "The sample reserve is $800. One month of the plan is about $4,950.",
        done: false,
      },
      {
        id: "alex-life-family",
        title: "Agree the target year with your family",
        detail: "The rail aims at 2031. Move it only on purpose.",
        done: false,
      },
    ],
  },
];

export interface MemberSeed {
  id: string;
  name: string;
  lastActive: string;
  coachingNote: string;
  passiveMonthly: number;
  expensesMonthly: number;
  assetsTotal: number;
  liabilitiesTotal: number;
  goals: Goal[];
}

export const staticMembers: MemberSeed[] = [
  {
    id: "sam",
    name: "Sam Okonkwo",
    lastActive: "2026-09-18",
    coachingNote:
      "Quiet since September. The plan is thin and the first real stream is still the work.",
    passiveMonthly: 820,
    expensesMonthly: 2890,
    assetsTotal: 894500,
    liabilitiesTotal: 708500,
    goals: [
      {
        id: "sam-freedom",
        kind: "wealth",
        title: "Reach the line in six years",
        summary:
          "A first passive stream and an honest plan. This year aims at 35%, not 100.",
        progressSource: "freedom",
        baseline: 5,
        baselineLabel: "a 5% starting score",
        target: 100,
        targetLabel: "100% Freedom Score by 2031",
        checkpoints: rail(
          ["35% score", "48% score", "60% score", "75% score", "88% score", "The line"],
          [35, 48, 60, 75, 88, 100],
        ),
        steps: [
          {
            id: "sam-plan",
            title: "Write a spending plan you can live on",
            detail: "Categories first. Card noise is not the denominator.",
            done: true,
          },
          {
            id: "sam-stream",
            title: "Name one stream that counts as passive",
            detail: "Interest or a dividend sleeve. Wages do not count.",
            done: false,
          },
          {
            id: "sam-auto",
            title: "Automate $100 a month into that stream",
            detail: "The amount can be small if it is repeatable.",
            done: false,
          },
        ],
      },
      {
        id: "sam-cushion",
        kind: "personal",
        title: "A $1,000 cushion",
        summary: "A separate cash reserve so a short month does not become new debt.",
        progressSource: "journey",
        targetLabel: "$1,000 set aside by 2027, then kept",
        checkpoints: rail([
          "Reserve opened",
          "Balance reaches $1,000",
          "Three months without a draw",
          "Cushion rebuilt if used",
          "Purpose written down",
          "Cushion still intact",
        ]),
        steps: [
          {
            id: "sam-cushion-open",
            title: "Open a separate cash reserve",
            detail: "Not the checking account that pays the rent.",
            done: false,
          },
          {
            id: "sam-cushion-50",
            title: "Automate $50 a month",
            detail: "Small enough to survive a tight week.",
            done: false,
          },
          {
            id: "sam-cushion-name",
            title: "Tell Jordan what the cushion is for",
            detail: "A job for the money keeps it from being spent by accident.",
            done: false,
          },
        ],
      },
    ],
  },
  {
    id: "drew",
    name: "Drew Patel",
    lastActive: "2026-10-12",
    coachingNote:
      "The six-year Freedom goal is still under 25% along, and most of this year is open.",
    passiveMonthly: 1960,
    expensesMonthly: 4130,
    assetsTotal: 980000,
    liabilitiesTotal: 570000,
    goals: [
      {
        id: "drew-freedom",
        kind: "wealth",
        title: "Make the score match the calendar",
        summary:
          "The balance sheet is real. The pace of the six-year Freedom goal is not keeping up.",
        progressSource: "freedom",
        baseline: 35,
        baselineLabel: "a 35% starting score",
        target: 110,
        targetLabel: "110% Freedom Score by 2031",
        checkpoints: rail(
          ["60% score", "72% score", "84% score", "94% score", "The line", "110% surplus"],
          [60, 72, 84, 94, 100, 110],
        ),
        steps: [
          {
            id: "drew-plan",
            title: "Put housing and food on the plan",
            detail: "Two lines, written down, reviewed once.",
            done: true,
          },
          {
            id: "drew-div",
            title: "List dividend and interest from the last quarter",
            detail: "Only what was paid, not what the market did.",
            done: false,
          },
          {
            id: "drew-tag",
            title: "Tag what counts before the next meeting",
            detail: "Use the passive-income rules. Leave gray areas out.",
            done: false,
          },
          {
            id: "drew-one",
            title: "Choose one stream to increase this year",
            detail: "Name the dollar amount, not a ticker.",
            done: false,
          },
        ],
      },
      {
        id: "drew-life",
        kind: "personal",
        title: "A fall half-marathon without new debt",
        summary: "Train, race, and keep gear purchases out of consumer debt.",
        progressSource: "journey",
        targetLabel: "Race finished, no new consumer debt",
        checkpoints: rail([
          "Race registered",
          "Training block finished",
          "Race weekend funded in cash",
          "Recovery month on the plan",
          "Next race only if the plan holds",
          "Story written for the family",
        ]),
        steps: [
          {
            id: "drew-race",
            title: "Register only if the fee is already in cash",
            detail: "The race is not a reason for a new card balance.",
            done: false,
          },
          {
            id: "drew-weekend",
            title: "Put one non-work weekend on the calendar",
            detail: "A date, not an intention.",
            done: false,
          },
          {
            id: "drew-note",
            title: "Finish the passive-income rules note",
            detail: "One page. Bring it to Jordan.",
            done: false,
          },
        ],
      },
    ],
  },
  {
    id: "elena",
    name: "Elena Vasquez",
    lastActive: "2026-10-20",
    coachingNote:
      "Steady middle of the path. Keep the plan and the rental math honest.",
    passiveMonthly: 2740,
    expensesMonthly: 4880,
    assetsTotal: 1060000,
    liabilitiesTotal: 420000,
    goals: [
      {
        id: "elena-freedom",
        kind: "wealth",
        title: "Cross 60%, then protect it",
        summary:
          "Net rent and a dividend sleeve are doing the work. The plan has to stay still while they grow.",
        progressSource: "freedom",
        baseline: 30,
        baselineLabel: "a 30% starting score",
        target: 110,
        targetLabel: "110% Freedom Score by 2031",
        checkpoints: rail(
          ["62% score", "72% score", "82% score", "92% score", "The line", "110% surplus"],
          [62, 72, 82, 92, 100, 110],
        ),
        steps: [
          {
            id: "elena-plan",
            title: "Confirm the spending plan for the year",
            detail: "No category moves without a written reason.",
            done: true,
          },
          {
            id: "elena-rent",
            title: "Reconcile net rent for the last quarter",
            detail: "Repairs and vacancy belong in the number.",
            done: true,
          },
          {
            id: "elena-div",
            title: "Keep dividend withdrawals off the principal",
            detail: "Income can be spent against the plan. Shares stay.",
            done: true,
          },
          {
            id: "elena-gap",
            title: "Name the dollars between here and 62%",
            detail: "One stream, one monthly amount.",
            done: false,
          },
        ],
      },
      {
        id: "elena-studio",
        kind: "personal",
        title: "A studio week for the ceramics practice",
        summary:
          "One unpaid week in the studio, funded from the plan, not from an asset sale.",
        progressSource: "journey",
        targetLabel: "A funded studio week in 2028",
        checkpoints: rail([
          "Week named",
          "Cost written into the plan",
          "Dates held with the family",
          "Cash set aside",
          "A short trial day",
          "The week taken",
        ]),
        steps: [
          {
            id: "elena-cost",
            title: "Price the studio week",
            detail: "Kiln, materials, and the lost week of other plans.",
            done: true,
          },
          {
            id: "elena-hold",
            title: "Hold two candidate weeks on the calendar",
            detail: "Pick later. The hold is the step.",
            done: false,
          },
          {
            id: "elena-cash",
            title: "Move $150 a month to a studio reserve",
            detail: "Separate from the rental operating account.",
            done: false,
          },
          {
            id: "elena-tell",
            title: "Tell Jordan which week is first choice",
            detail: "A date makes the reserve real.",
            done: false,
          },
        ],
      },
    ],
  },
  {
    id: "amina",
    name: "Amina Diallo",
    lastActive: "2026-10-24",
    coachingNote: "A strong year. The next band is 85%, and the plan is the thing to protect.",
    passiveMonthly: 4050,
    expensesMonthly: 5000,
    assetsTotal: 1420000,
    liabilitiesTotal: 540000,
    goals: [
      {
        id: "amina-freedom",
        kind: "wealth",
        title: "Walk up to the line",
        summary:
          "Eighty-one percent is close enough to plan in dollars. The six-year target is a surplus, not a sprint.",
        progressSource: "freedom",
        baseline: 40,
        baselineLabel: "a 40% starting score",
        target: 110,
        targetLabel: "110% Freedom Score by 2031",
        checkpoints: rail(
          ["85% score", "92% score", "98% score", "The line", "106% surplus", "110% surplus"],
          [85, 92, 98, 100, 106, 110],
        ),
        steps: [
          {
            id: "amina-plan",
            title: "Hold the spending plan flat this quarter",
            detail: "No new recurring cost without removing one.",
            done: true,
          },
          {
            id: "amina-map",
            title: "Map the path from here to 85%",
            detail: "Monthly dollars, with Jordan, on one page.",
            done: false,
          },
          {
            id: "amina-tag",
            title: "Reconfirm passive tags after the bonus month",
            detail: "A bonus is not a stream.",
            done: true,
          },
          {
            id: "amina-reserve",
            title: "Keep two months of the plan in cash",
            detail: "Already funded. Leave it alone.",
            done: true,
          },
        ],
      },
      {
        id: "amina-parents",
        kind: "personal",
        title: "Visit parents for three weeks",
        summary: "Travel funded from surplus and a reserve, with the plan still covered while away.",
        progressSource: "journey",
        targetLabel: "The trip in 2028, plan still covered",
        checkpoints: rail([
          "Trip named",
          "Flights priced",
          "Reserve opened",
          "Dates booked",
          "Plan coverage checked",
          "Trip taken",
        ]),
        steps: [
          {
            id: "amina-price",
            title: "Price the three weeks",
            detail: "Flights, the house sitter, and ordinary bills that continue.",
            done: true,
          },
          {
            id: "amina-save",
            title: "Automate the travel reserve",
            detail: "A monthly amount that finishes before the booking date.",
            done: true,
          },
        ],
      },
    ],
  },
  {
    id: "priya",
    name: "Priya Shah",
    lastActive: "2026-10-25",
    coachingNote: "Close to the line. The risk now is a larger plan, not a missing stream.",
    passiveMonthly: 6180,
    expensesMonthly: 6560,
    assetsTotal: 1612000,
    liabilitiesTotal: 372000,
    goals: [
      {
        id: "priya-freedom",
        kind: "wealth",
        title: "Cross the line without enlarging the plan",
        summary:
          "Ninety-four percent is a short dollar gap. The six-year aim is 110% with the same life.",
        progressSource: "freedom",
        baseline: 50,
        baselineLabel: "a 50% starting score",
        target: 110,
        targetLabel: "110% Freedom Score by 2031",
        checkpoints: rail(
          ["95% score", "The line", "103% surplus", "106% surplus", "108% surplus", "110% surplus"],
          [95, 100, 103, 106, 108, 110],
        ),
        steps: [
          {
            id: "priya-gap",
            title: "Write the monthly gap to 100% in dollars",
            detail: "One number, from the current plan, not a new lifestyle.",
            done: true,
          },
          {
            id: "priya-hold",
            title: "Hold the plan flat while the last gap closes",
            detail: "Still open. This is the step that protects the ratio.",
            done: false,
          },
          {
            id: "priya-stream",
            title: "Assign the next distribution to the gap",
            detail: "Interest and dividends already cover most of it.",
            done: true,
          },
          {
            id: "priya-review",
            title: "Review yield on assets with Jordan",
            detail: "Headline yield stays on total assets, not net worth.",
            done: true,
          },
        ],
      },
      {
        id: "priya-book",
        kind: "personal",
        title: "Finish the family history draft",
        summary: "A writing year with two mornings a week, kept off the spending plan as a new cost.",
        progressSource: "journey",
        targetLabel: "A complete draft in 2027",
        checkpoints: rail([
          "Outline finished",
          "Half the chapters drafted",
          "Full draft",
          "Family read-through",
          "Revision pass",
          "Copy set aside for the archive",
        ]),
        steps: [
          {
            id: "priya-mornings",
            title: "Block two mornings a week",
            detail: "On the calendar through December.",
            done: true,
          },
          {
            id: "priya-outline",
            title: "Finish the outline",
            detail: "Chapter list, not prose.",
            done: true,
          },
        ],
      },
    ],
  },
  {
    id: "marcus",
    name: "Marcus Chen",
    lastActive: "2026-10-22",
    coachingNote:
      "Above the line. The remaining work is giving the surplus a job before lifestyle takes it.",
    passiveMonthly: 9450,
    expensesMonthly: 7970,
    assetsTotal: 2650000,
    liabilitiesTotal: 240000,
    goals: [
      {
        id: "marcus-freedom",
        kind: "wealth",
        title: "Keep Freedom+ and assign the surplus",
        summary:
          "The plan is covered. The six-year target is 125%, with surplus named for resilience and giving.",
        progressSource: "freedom",
        baseline: 70,
        baselineLabel: "a 70% starting score",
        target: 125,
        targetLabel: "125% Freedom Score by 2031",
        checkpoints: rail(
          ["110% surplus", "115% surplus", "118% surplus", "120% surplus", "122% surplus", "125% surplus"],
          [110, 115, 118, 120, 122, 125],
        ),
        steps: [
          {
            id: "marcus-job",
            title: "Split surplus into resilience, giving, and time",
            detail: "Three percentages that add to 100.",
            done: true,
          },
          {
            id: "marcus-gift",
            title: "Schedule the annual gift from surplus",
            detail: "A date and an amount, not a leftover.",
            done: true,
          },
          {
            id: "marcus-plan",
            title: "Leave the spending plan unchanged this quarter",
            detail: "Coverage is not a reason to raise the denominator.",
            done: true,
          },
        ],
      },
      {
        id: "marcus-trail",
        kind: "personal",
        title: "Walk the long trail in September",
        summary: "Three weeks on the trail, bills still covered by passive income while away.",
        progressSource: "journey",
        targetLabel: "September 2027, plan still covered",
        checkpoints: rail([
          "Route chosen",
          "Gear from cash, not credit",
          "Time blocked",
          "Bills pre-scheduled",
          "A shakedown weekend",
          "The three weeks walked",
        ]),
        steps: [
          {
            id: "marcus-route",
            title: "Choose the route and the year",
            detail: "September 2027 is the working date.",
            done: true,
          },
          {
            id: "marcus-bills",
            title: "List bills that must run while away",
            detail: "Confirm passive income still covers them.",
            done: true,
          },
        ],
      },
    ],
  },
];

export const memberIds = [
  alexIdentity.id,
  ...staticMembers.map((member) => member.id),
] as const;

export type MemberId = (typeof memberIds)[number];

export function isMemberId(id: string): id is MemberId {
  return (memberIds as readonly string[]).includes(id);
}
