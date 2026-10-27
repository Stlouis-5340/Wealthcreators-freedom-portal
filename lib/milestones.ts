export interface MilestoneBand {
  threshold: number;
  title: string;
  meaning: string;
  education: string;
}

export const foundation = {
  title: "Foundation",
  meaning: "Less than a quarter of the spending plan is covered.",
  education:
    "Start with two decisions: a spending plan you intend to live on, and one stream that truly counts as passive. A clear denominator beats a dramatic projection.",
};

export const bands: MilestoneBand[] = [
  {
    threshold: 25,
    title: "First light",
    meaning: "A quarter of the spending plan arrives without a paycheck.",
    education:
      "Get precise about what counts. Dividends, interest, net rent, royalties, lending yield, and pension-like income can count. Salary, gifts, and selling principal do not. Definition comes before a bigger spreadsheet.",
  },
  {
    threshold: 50,
    title: "Half covered",
    meaning: "Half of the plan is funded by passive income.",
    education:
      "This is where a larger life usually erases the gain. Review the spending plan before chasing a higher yield. The denominator is a decision you can revisit on purpose.",
  },
  {
    threshold: 75,
    title: "Within reach",
    meaning: "The remaining gap has a size. It is a project.",
    education:
      "One durable stream usually closes more of the gap than squeezing a higher rate out of money you already hold. Name the stream, the monthly dollars, and the date.",
  },
  {
    threshold: 100,
    title: "The line",
    meaning: "Passive income matches the spending plan.",
    education:
      "Freedom here is a ratio you maintain. Keep the plan honest. Build a surplus before you enlarge the life the plan is funding.",
  },
  {
    threshold: 125,
    title: "Freedom+",
    meaning: "A quarter of passive income is surplus.",
    education:
      "Give the surplus a job: resilience, generosity, or time. Write that choice with your Wealth Guide so it does not leak back into unplanned spending.",
  },
];

export function stageFor(score: number | null): {
  current: MilestoneBand | null;
  next: MilestoneBand | null;
  foundation: boolean;
  unavailable: boolean;
} {
  if (score == null) {
    return {
      current: null,
      next: bands[0],
      foundation: false,
      unavailable: true,
    };
  }
  if (score < bands[0].threshold) {
    return {
      current: null,
      next: bands[0],
      foundation: true,
      unavailable: false,
    };
  }
  const current =
    [...bands].reverse().find((band) => score >= band.threshold) ?? null;
  const next = bands.find((band) => score < band.threshold) ?? null;
  return { current, next, foundation: false, unavailable: false };
}

export function stageTitle(score: number | null): string {
  const stage = stageFor(score);
  if (stage.unavailable) return "Score needs a plan";
  if (stage.foundation) return foundation.title;
  return stage.current?.title ?? "Freedom Score";
}

export function stageCopy(score: number | null): string {
  const stage = stageFor(score);
  if (stage.unavailable) {
    return "Add a spending plan above zero so Freedom Score has a denominator.";
  }
  if (stage.foundation) return foundation.education;
  return stage.current?.education ?? "";
}
