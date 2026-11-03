/**
 * Member–Guide collaboration hub.
 *
 * A short shared workspace: action items, a message thread, session notes,
 * and agenda items. It is not a live chat product, and it does not carry
 * bank names, account numbers, or connection tokens.
 */

export const DEMO_SCHEDULING_URL = "https://calendly.com/wealthcreators-demo/coaching";

export type TaskSource = "guide" | "member";

export interface HubTaskView {
  id: string;
  title: string;
  dueDate: string;
  status: "open" | "done";
  source: TaskSource;
}

export interface HubMessageView {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: "member" | "guide";
  body: string;
  createdAt: string;
}

export interface SessionSummaryView {
  id: string;
  guideName: string;
  summary: string;
  nextSteps: string;
  heldAt: string;
}

export interface AgendaItemView {
  id: string;
  body: string;
  createdAt: string;
}

export interface HubModel {
  memberId: string;
  memberName: string;
  guideName: string | null;
  schedulingUrl: string;
  viewerRole: "member" | "guide";
  tasksShared: boolean;
  tasks: HubTaskView[];
  messages: HubMessageView[];
  sessions: SessionSummaryView[];
  agenda: AgendaItemView[];
}

const MAX_MESSAGE = 500;
const MAX_SUMMARY = 2000;
const MAX_NEXT = 1000;
const MAX_AGENDA = 300;
const MAX_URL = 300;

export function parseHubMessage(
  body: string,
): { ok: true; value: string } | { ok: false; message: string } {
  const value = body.trim().replace(/\s+/g, " ");
  if (!value) return { ok: false, message: "Write a short note before sending." };
  if (value.length > MAX_MESSAGE) return { ok: false, message: "Keep the note under 500 characters." };
  return { ok: true, value };
}

export function parseSessionDraft(input: {
  summary: string;
  nextSteps: string;
  heldAt: string;
}): { ok: true; value: { summary: string; nextSteps: string; heldAt: string } } | { ok: false; message: string } {
  const summary = input.summary.trim().replace(/\s+/g, " ");
  const nextSteps = input.nextSteps.trim().replace(/\s+/g, " ");
  const heldAt = input.heldAt.trim();
  if (!summary) return { ok: false, message: "Write a short summary of the session." };
  if (summary.length > MAX_SUMMARY) return { ok: false, message: "Keep the summary under 2,000 characters." };
  if (nextSteps.length > MAX_NEXT) return { ok: false, message: "Keep the next steps under 1,000 characters." };
  if (!isIsoDate(heldAt)) return { ok: false, message: "Choose the date the session was held." };
  return { ok: true, value: { summary, nextSteps, heldAt } };
}

export function parseAgendaItem(
  body: string,
): { ok: true; value: string } | { ok: false; message: string } {
  const value = body.trim().replace(/\s+/g, " ");
  if (!value) return { ok: false, message: "Write the agenda item first." };
  if (value.length > MAX_AGENDA) return { ok: false, message: "Keep the agenda item under 300 characters." };
  return { ok: true, value };
}

export function parseSchedulingUrl(
  raw: string,
): { ok: true; value: string } | { ok: false; message: string } {
  const value = raw.trim();
  if (!value) return { ok: true, value: "" };
  if (value.length > MAX_URL) return { ok: false, message: "Keep the scheduling link under 300 characters." };
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, message: "Use a full https link, or leave it blank." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, message: "Use an http or https link." };
  }
  return { ok: true, value: url.toString() };
}

/** Profile link wins. The public env value is the fallback for a program-wide page. */
export function resolveSchedulingUrl(profileUrl: string, envUrl = process.env.NEXT_PUBLIC_GUIDE_SCHEDULING_URL ?? ""): string {
  const profile = profileUrl.trim();
  if (profile) return profile;
  return envUrl.trim();
}

export function taskSource(value: string): TaskSource {
  return value === "member" ? "member" : "guide";
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
}
