export type TaskStatus = "open" | "done";

export interface CoachingNoteView {
  id: string;
  memberId: string;
  guideId: string;
  guideName: string;
  body: string;
  createdAt: string;
}

export interface CoachingTaskView {
  id: string;
  memberId: string;
  guideId: string;
  title: string;
  dueDate: string;
  status: TaskStatus;
  /** Who added the item. Either person can mark it done. */
  source: "guide" | "member";
  createdAt: string;
  updatedAt: string;
}

const MAX_NOTE = 2000;
const MAX_TITLE = 200;

export function parseNoteBody(
  body: string,
): { ok: true; value: string } | { ok: false; message: string } {
  const value = body.trim().replace(/\s+/g, " ");
  if (!value) return { ok: false, message: "Write a note before saving." };
  if (value.length > MAX_NOTE) return { ok: false, message: "Keep the note under 2,000 characters." };
  return { ok: true, value };
}

export function parseTaskDraft(input: {
  title: string;
  dueDate: string;
}): { ok: true; value: { title: string; dueDate: string } } | { ok: false; message: string } {
  const title = input.title.trim().replace(/\s+/g, " ");
  const dueDate = input.dueDate.trim();
  if (!title) return { ok: false, message: "Add a task title." };
  if (title.length > MAX_TITLE) return { ok: false, message: "Keep the task title under 200 characters." };
  if (dueDate && !isIsoDate(dueDate)) {
    return { ok: false, message: "Use a real due date, or leave it blank." };
  }
  return { ok: true, value: { title, dueDate } };
}

export function toNoteView(
  row: {
    id: string;
    memberId: string;
    guideId: string;
    body: string;
    createdAt: Date | string;
  },
  guideName: string,
): CoachingNoteView {
  return {
    id: row.id,
    memberId: row.memberId,
    guideId: row.guideId,
    guideName,
    body: row.body,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  };
}

export function toTaskView(row: {
  id: string;
  memberId: string;
  guideId: string;
  title: string;
  dueDate: string;
  status: string;
  source?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}): CoachingTaskView {
  return {
    id: row.id,
    memberId: row.memberId,
    guideId: row.guideId,
    title: row.title,
    dueDate: row.dueDate,
    status: isTaskStatus(row.status) ? row.status : "open",
    source: row.source === "member" ? "member" : "guide",
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  };
}

export function isTaskStatus(value: string): value is TaskStatus {
  return value === "open" || value === "done";
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
}
