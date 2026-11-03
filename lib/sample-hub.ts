import { DEMO_SCHEDULING_URL } from "@/lib/hub";

export const demoSchedulingUrl = DEMO_SCHEDULING_URL;

export const alexHubTask = {
  id: "task-alex-lesson",
  memberId: "alex",
  guideId: "jordan",
  title: "Finish the Freedom Score lesson and bring one question",
  dueDate: "2026-11-10",
  status: "open",
  source: "guide",
  createdAt: "2026-10-28T15:00:00.000Z",
  updatedAt: "2026-10-28T15:00:00.000Z",
};

export const alexHubMessages = [
  {
    id: "hub-alex-1",
    memberId: "alex",
    authorId: "jordan",
    body: "Alex, the last check-in named a durable stream of about $200 a month. Bring one question about how you want to talk about that. I will not recommend a product.",
    createdAt: "2026-10-27T16:00:00.000Z",
  },
  {
    id: "hub-alex-2",
    memberId: "alex",
    authorId: "alex",
    body: "I want to walk through the housing line on the spending plan, and what an estimate on the duplex does to the gap. I am not asking you to pick an investment.",
    createdAt: "2026-10-28T16:00:00.000Z",
  },
  {
    id: "hub-alex-3",
    memberId: "alex",
    authorId: "jordan",
    body: "Good. We will stay on the plan and the definitions. Use the scheduling link when you want a time.",
    createdAt: "2026-10-29T16:00:00.000Z",
  },
];

export const alexSessionSummary = {
  id: "session-alex-1",
  memberId: "alex",
  guideId: "jordan",
  summary:
    "We walked through what the Freedom Score measures and which spending-plan lines Alex wants to keep steady. The duplex balance is still an estimate. No product was discussed.",
  nextSteps: "Alex finishes the Freedom Score lesson and brings one agenda item about the estimate.",
  heldAt: "2026-10-22T18:00:00.000Z",
  createdAt: "2026-10-22T19:00:00.000Z",
};

export const alexAgendaItem = {
  id: "agenda-alex-1",
  memberId: "alex",
  body: "How an estimate on the duplex changes the Freedom Gap, without choosing an investment.",
  createdAt: "2026-10-29T17:00:00.000Z",
};
