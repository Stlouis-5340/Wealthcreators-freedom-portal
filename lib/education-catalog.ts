import type { LessonLevel } from "@/lib/education";

export interface CatalogQuestion {
  id: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
}

export interface CatalogLesson {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  level: LessonLevel;
  body: string;
  exercise: string;
  questions: CatalogQuestion[];
}

export interface CatalogPath {
  id: string;
  title: string;
  summary: string;
  lessons: CatalogLesson[];
}

function lesson(
  input: Omit<CatalogLesson, "questions" | "exercise"> & {
    exercise?: string;
    questions?: CatalogQuestion[];
  },
): CatalogLesson {
  return {
    ...input,
    exercise: input.exercise ?? "",
    questions: input.questions ?? [],
  };
}

export const educationCatalog: CatalogPath[] = [
  {
    id: "path-foundations",
    title: "Freedom foundations",
    summary: "What this portal means by financial freedom, the spending plan, and the Freedom Score.",
    lessons: [
      lesson({
        id: "lesson-freedom-meaning",
        title: "What financial freedom means here",
        summary: "Freedom is the spending plan covered by passive income, not a net-worth trophy.",
        minutes: 8,
        level: "beginner",
        exercise:
          "On your next weekly check-in, write one sentence for the commitment that matches a goal you already have. Checking this box means you wrote it. It does not change the goal.",
        body: [
          "Wealth Creators uses a plain definition. Financial freedom, in this portal, means passive income covers the spending plan you chose. The Freedom Score is that coverage, written as a percent. It can pass 100% when passive income is larger than the plan.",
          "A large net worth and a high score are different facts. Assets can be valuable and still produce little cash flow. Liabilities can be large and still sit beside income that covers the plan. The score does not rank your worth as a person, and it does not say you have 'made it' in every part of life.",
          "The work is a practice: know the plan, know which income the portal counts, and know the next step on a goal you already set. A lesson can make those words clearer. It cannot choose the step for you.",
          "This lesson is educational. It is not a forecast, and it is not advice to change a job, a property, or an account.",
        ].join("\n\n"),
      }),
      lesson({
        id: "lesson-spending-plan",
        title: "The spending plan",
        summary: "The plan is the denominator of the Freedom Score. It is intentional, not a dump of every card swipe.",
        minutes: 10,
        level: "beginner",
        exercise:
          "Before your next check-in, name one spending-plan line you will look at again. Checking this box means you did that. It does not edit the plan.",
        body: [
          "The spending plan is the monthly life you are measuring against. Housing, food, and the other lines you keep on purpose all sit in that total. The Freedom Score divides passive income by that total.",
          "A card statement and a spending plan are not the same document. A statement shows what already happened. The plan is the number you are willing to use as the denominator. If the plan is missing a real bill, the score looks better than the life. If the plan includes a wish, the score looks worse.",
          "Changing a line is a member decision inside the portal. Nothing in this lesson says which line to cut or which one to protect. The useful habit is to look at one line before the next check-in and say whether it still matches the life you are building.",
          "Your Wealth Guide can see the plan total only when you leave totals on. Category lines stay off. Guides do not see bank names or account numbers.",
        ].join("\n\n"),
      }),
      lesson({
        id: "lesson-freedom-score",
        title: "How to read your Freedom Score",
        summary: "The score is coverage. Movement comes from the plan, the streams, or both. It is a snapshot.",
        minutes: 12,
        level: "beginner",
        exercise:
          "In the same words you would use on a check-in, say what your Freedom Score is measuring this month. Checking this box means you said it out loud or wrote it down.",
        body: [
          "Freedom Score = monthly passive income ÷ monthly spending plan, then × 100. If passive income is $4,000 and the plan is $10,000, the score is 40%. The Freedom Gap is the other $6,000 a month. Those are descriptions of the current plan, not a promise about next year.",
          "A higher score can come from more qualifying passive income or from a smaller plan. The portal does not tell you which path is right. It shows the arithmetic so you and your Guide can talk about a goal you already wrote down.",
          "Wages and active self-employment do not count as passive income here. A one-time sale of an asset does not count. A gift, a refund, a transfer, and money drawn from debt do not count. Dividends, interest, net rent, royalties, and similar tagged streams can count. Whether a gray area counts is a labeling choice, not a product recommendation.",
          "Freedom Quality is a second number. It asks how concentrated or fragile the coverage looks. It does not replace the Freedom Score. Yield on assets asks how much income the assets produce. It is not total return, and it is not a rate anyone is promising you.",
          "The monthly report compares a saved month with an earlier one when that earlier snapshot exists. If it does not, the report says First report instead of inventing a change.",
        ].join("\n\n"),
        questions: [
          {
            id: "q-score-1",
            prompt: "What is the Freedom Score in this portal?",
            choices: [
              "Monthly passive income divided by the spending plan, as a percent",
              "Net worth divided by your age",
              "A credit score from a bureau",
              "A promised future return",
            ],
            answerIndex: 0,
          },
          {
            id: "q-score-2",
            prompt: "A score above 100% means which of these?",
            choices: [
              "Passive income is larger than the spending plan. It is not a promise of returns.",
              "Every asset is safe",
              "You should stop tracking the plan",
              "The portal will invest the surplus for you",
            ],
            answerIndex: 0,
          },
          {
            id: "q-score-3",
            prompt: "Which of these does not count as passive income here?",
            choices: [
              "Wages from a job",
              "Dividends you have tagged as passive",
              "Net rent you have tagged as passive",
              "Interest you have tagged as passive",
            ],
            answerIndex: 0,
          },
          {
            id: "q-score-4",
            prompt: "What can move the score?",
            choices: [
              "A change in qualifying passive income, the spending plan, or both",
              "Only a change in the stock market, which the portal predicts",
              "Only paying a specific debt the lesson names",
              "Nothing. The score is fixed for the year.",
            ],
            answerIndex: 0,
          },
        ],
      }),
    ],
  },
  {
    id: "path-capital",
    title: "Income and capital",
    summary: "How the portal separates streams that pay you, balances you own, and balances you owe.",
    lessons: [
      lesson({
        id: "lesson-passive-types",
        title: "Types of passive income",
        summary: "A short map of what can count, what does not, and what stays a gray area.",
        minutes: 11,
        level: "beginner",
        body: [
          "Passive income, in this portal, is recurring cash flow you have tagged as passive. The sample kinds are dividends and interest, net rent, royalties or a silent share, lending yield, and pension or annuity-like income when you tag it that way.",
          "These labels are for the Freedom Score. They are not a list of things to buy. A dividend can be cut. Rent can go vacant. Interest can change. The portal records the monthly number you enter or refresh. It does not promise that the number continues.",
          "What does not count: wages, active self-employment, selling an asset (that is principal, not income), gifts, refunds, transfers between your own accounts, and draws from debt.",
          "Gray areas stay out of the sample score until you and the program decide how to label them. Social Security, dividend reinvestment, and a business that still needs your labor are examples. Leaving them out is a clarity choice, not a judgment that they are bad.",
          "When you talk with your Guide, name the stream and the monthly amount. You do not need to name a product.",
        ].join("\n\n"),
        questions: [
          {
            id: "q-passive-1",
            prompt: "Which description fits passive income in this portal?",
            choices: [
              "Recurring cash flow you tag as passive, such as dividends, interest, or net rent",
              "Any deposit, including a gift or a transfer",
              "The sale price of something you own",
              "Your paycheck",
            ],
            answerIndex: 0,
          },
          {
            id: "q-passive-2",
            prompt: "A one-time sale of an asset is treated as what?",
            choices: [
              "Principal, not passive income",
              "Passive income for the month of the sale",
              "A required addition to the spending plan",
              "Proof the Freedom Score will rise forever",
            ],
            answerIndex: 0,
          },
          {
            id: "q-passive-3",
            prompt: "What is true about a stream that counts today?",
            choices: [
              "The portal records the amount. It does not promise the amount continues.",
              "The portal locks that amount for six years",
              "The stream is insured by the lesson",
              "Counting it means a Guide has endorsed the payer",
            ],
            answerIndex: 0,
          },
          {
            id: "q-passive-4",
            prompt: "A gift from family is counted as passive income. True or false, by these rules?",
            choices: [
              "False. A gift does not count.",
              "True. Every gift counts.",
              "True, but only above a dollar amount the lesson sets",
              "True when a Guide marks it done",
            ],
            answerIndex: 0,
          },
        ],
      }),
      lesson({
        id: "lesson-debt-capital",
        title: "Debt and capital",
        summary: "Money you owe and money that can work are different lines. This lesson does not pick a payoff order.",
        minutes: 12,
        level: "intermediate",
        exercise:
          "Look at your six-year goals and notice which ones are about income and which are about balances you owe. Checking this box means you looked. It is not a payoff plan.",
        body: [
          "Capital, in ordinary language here, is money or property you own that can sit on the asset side of net worth. Debt is a balance you owe. It sits on the liability side. Net worth is assets minus liabilities. None of those sentences tells you to borrow or to pay something off.",
          "A liability can be consumer debt, a mortgage, or another balance. The portal can list them. It does not rank which one to pay first, and this lesson will not either. Interest is a cost. That fact is not an instruction.",
          "Paying down a balance can change cash flow if the payment was in the spending plan, or it can change net worth if the balance falls and assets stay put. Those are arithmetic effects to look at with your own numbers. They are not a rule that every dollar of debt is a mistake or that every dollar of debt is useful.",
          "Capital that produces no cash flow still counts in net worth. It does not, by itself, raise the Freedom Score. The score moves when qualifying passive income or the spending plan moves. Yield on assets asks a different question: how much income the assets are producing. It is not the same as price going up.",
          "Bring the distinction to a goal you already have. A goal about a balance you owe and a goal about income are both allowed. This checkbox is only a look, not a new plan.",
        ].join("\n\n"),
        questions: [
          {
            id: "q-debt-1",
            prompt: "How does this portal describe net worth?",
            choices: [
              "Assets minus liabilities",
              "Passive income times your age",
              "The Freedom Score itself",
              "Only the cash in checking",
            ],
            answerIndex: 0,
          },
          {
            id: "q-debt-2",
            prompt: "What does this lesson tell you to do with debt?",
            choices: [
              "It explains the difference between a balance you owe and capital. It does not pick what to pay or whether to borrow.",
              "Pay the smallest balance first, always",
              "Never pay interest",
              "Borrow against the spending plan",
            ],
            answerIndex: 0,
          },
          {
            id: "q-debt-3",
            prompt: "An asset that produces no cash flow does what to the Freedom Score by itself?",
            choices: [
              "Nothing, until qualifying passive income or the spending plan changes",
              "It raises the score automatically",
              "It sets Freedom Quality to 100",
              "It removes the need for a spending plan",
            ],
            answerIndex: 0,
          },
        ],
      }),
      lesson({
        id: "lesson-cash-flow",
        title: "Cash flow and appreciation",
        summary: "Income the asset pays you and a change in its price are different ideas.",
        minutes: 10,
        level: "intermediate",
        body: [
          "Cash flow is money the asset pays you on a schedule: rent after the costs you count, a dividend, interest, a distribution. Appreciation is the price of the asset going up. You can have one without the other.",
          "The Freedom Score uses cash flow you have tagged as passive, measured against the spending plan. A higher price does not enter that formula unless you turn it into income or you sell, and a sale is principal, not passive income.",
          "Yield on assets is annual passive income divided by assets. Wealth efficiency in this portal uses net worth as a second look. Neither number is total return. Total return would mix income, price change, and other pieces. This lesson does not estimate a future price.",
          "An illustration in the forecast or the decision simulator is an assumption you can edit. It is labeled as an illustration. It is not a promise that a property, a business, or a market will do what the boxes say.",
          "When you review an asset with your Guide, separate three sentences: what it pays now, what you think the price might do, and what would have to be true for that to matter to the spending plan. Keep the product name out of it if you do not need it.",
        ].join("\n\n"),
      }),
    ],
  },
  {
    id: "path-guide",
    title: "Guide partnership",
    summary: "How to use the shared workspace, a session, and the monthly rhythm without handing over the bank login.",
    lessons: [
      lesson({
        id: "lesson-guide-partnership",
        title: "Working with your Wealth Guide",
        summary: "Your Guide coaches from what you share. Bank names and connection tokens stay off their screen.",
        minutes: 8,
        level: "beginner",
        exercise:
          "Add one agenda item on your Guide page for the next session. Checking this box means you added it, or you already have one waiting.",
        body: [
          "A Wealth Guide is a coach on this portal, not a substitute for a licensed adviser when the question is regulated. You choose what they can see: the Freedom Score and gap, totals, six-year goals, weekly check-ins, and learning progress. Coaching tasks stay visible so a follow-up is not lost. Category spending and transactions stay off.",
          "Guides never receive bank names, account numbers, or the tokens that connect an account. Do not paste those into a message, a session note, or an agenda item. The shared workspace is for the plan, the goal, and the next conversation.",
          "The Guide page holds four simple things. Action items either of you can mark done. A short message thread for between sessions, not a live chat. Session notes your Guide writes after you meet. Agenda items you propose for next time. A scheduling link opens a calendar page when your Guide has added one.",
          "A good agenda item is one sentence. 'Walk through how an estimate changes the gap' is enough. 'Tell me what to buy' is a different kind of question, and this portal is not the place that answers it.",
        ].join("\n\n"),
      }),
      lesson({
        id: "lesson-monthly-rhythm",
        title: "Your monthly rhythm",
        summary: "Check-in, goals, lessons, and the Freedom Report are one loop. Completion is not the point. A clearer next step is.",
        minutes: 9,
        level: "intermediate",
        exercise:
          "Open this month's Freedom Report and your latest check-in, then name one goal the report still ties to. Checking this box means you did that review.",
        body: [
          "The weekly check-in is short on purpose. A win, a challenge, whether the priority action happened, the next commitment, and whether you want your Guide. It saves a snapshot of the score that week. It does not predict the next month.",
          "The monthly Freedom Report gathers the score, the gap, yield, goals, milestones, and three educational next steps. It also shows learning progress: how many lessons are finished and which titles. That section describes study. It does not grade you as a client, and it does not change the Freedom Score.",
          "Lessons, the quiz, and the action checkbox are there so a definition sticks. The checkbox is a reflection tied to check-in or goal language. Marking it does not edit the spending plan, a balance, or a goal step.",
          "Use the loop in order that fits the week: look at the report, do one lesson or one checkbox, write the check-in, and leave your Guide one agenda item if you want company. Skip the parts that are noise. The aim is a next step you can actually do.",
        ].join("\n\n"),
      }),
    ],
  },
];

export function catalogLessons(): { path: CatalogPath; lesson: CatalogLesson; sort: number }[] {
  const rows: { path: CatalogPath; lesson: CatalogLesson; sort: number }[] = [];
  let sort = 0;
  for (const path of educationCatalog) {
    for (const item of path.lessons) {
      rows.push({ path, lesson: item, sort });
      sort += 1;
    }
  }
  return rows;
}

export interface SeededProgress {
  id: string;
  memberId: string;
  lessonId: string;
  status: "inProgress" | "completed";
  completedAt: string | null;
  exerciseDone: boolean;
}

export interface SeededAttempt {
  id: string;
  memberId: string;
  lessonId: string;
  score: number;
  correct: number;
  total: number;
  createdAt: string;
}

export const alexLessonProgress: SeededProgress[] = [
  {
    id: "progress-alex-meaning",
    memberId: "alex",
    lessonId: "lesson-freedom-meaning",
    status: "completed",
    completedAt: "2026-10-18T15:00:00.000Z",
    exerciseDone: true,
  },
  {
    id: "progress-alex-plan",
    memberId: "alex",
    lessonId: "lesson-spending-plan",
    status: "completed",
    completedAt: "2026-10-25T15:00:00.000Z",
    exerciseDone: true,
  },
  {
    id: "progress-alex-score",
    memberId: "alex",
    lessonId: "lesson-freedom-score",
    status: "inProgress",
    completedAt: null,
    exerciseDone: false,
  },
];

export const alexQuizAttempt: SeededAttempt = {
  id: "attempt-alex-score",
  memberId: "alex",
  lessonId: "lesson-freedom-score",
  score: 75,
  correct: 3,
  total: 4,
  createdAt: "2026-10-26T18:00:00.000Z",
};
