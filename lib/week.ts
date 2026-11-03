/** America/Chicago calendar weeks. Monday is the first day. weekKey is that Monday, YYYY-MM-DD. */

const CHICAGO = "America/Chicago";

const WEEKDAY: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export interface ChicagoDate {
  year: number;
  month: number;
  day: number;
  /** 0 Sunday through 6 Saturday, in America/Chicago. */
  weekday: number;
}

export function chicagoDateParts(date = new Date()): ChicagoDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const weekday = WEEKDAY[read("weekday")];
  const year = Number(read("year"));
  const month = Number(read("month"));
  const day = Number(read("day"));
  if (weekday == null || !year || !month || !day) {
    throw new Error("Could not read the America/Chicago calendar date.");
  }
  return { year, month, day, weekday };
}

export function chicagoDateISO(date = new Date()): string {
  const { year, month, day } = chicagoDateParts(date);
  return formatISO(year, month, day);
}

export function addCalendarDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return formatISO(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate());
}

/** Monday of the America/Chicago week that contains `date`. */
export function chicagoWeekKey(date = new Date()): string {
  const { year, month, day, weekday } = chicagoDateParts(date);
  const offset = weekday === 0 ? 6 : weekday - 1;
  return addCalendarDays(formatISO(year, month, day), -offset);
}

export function previousWeekKey(weekKey: string): string {
  return addCalendarDays(weekKey, -7);
}

export function formatWeekSpan(weekKey: string): string {
  const end = addCalendarDays(weekKey, 6);
  return `${formatLongDate(weekKey)} – ${formatLongDate(end)}`;
}

export function formatChicagoDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function formatISO(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatLongDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
