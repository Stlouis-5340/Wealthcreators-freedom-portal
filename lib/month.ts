/** America/Chicago calendar months. monthKey is YYYY-MM. */

import { chicagoDateParts } from "./week";

export function chicagoMonthKey(date = new Date()): string {
  const { year, month } = chicagoDateParts(date);
  return formatMonthKey(year, month);
}

export function previousMonthKey(monthKey: string): string {
  const { year, month } = readMonthKey(monthKey);
  if (month === 1) return formatMonthKey(year - 1, 12);
  return formatMonthKey(year, month - 1);
}

export function nextMonthKey(monthKey: string): string {
  const { year, month } = readMonthKey(monthKey);
  if (month === 12) return formatMonthKey(year + 1, 1);
  return formatMonthKey(year, month + 1);
}

export function isMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** A check-in belongs to the month of its Monday (weekKey). */
export function weekInMonth(weekKey: string, monthKey: string): boolean {
  return weekKey.slice(0, 7) === monthKey;
}

export function formatMonthLabel(monthKey: string): string {
  const { year, month } = readMonthKey(monthKey);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function formatMonthName(monthKey: string): string {
  const { year, month } = readMonthKey(monthKey);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

/** Noon UTC on the last calendar day of the month. Used for a saved snapshot's clock. */
export function monthEndIso(monthKey: string): string {
  const next = nextMonthKey(monthKey);
  const { year, month } = readMonthKey(next);
  const firstOfNext = new Date(Date.UTC(year, month - 1, 1));
  firstOfNext.setUTCDate(firstOfNext.getUTCDate() - 1);
  const day = String(firstOfNext.getUTCDate()).padStart(2, "0");
  const key = formatMonthKey(firstOfNext.getUTCFullYear(), firstOfNext.getUTCMonth() + 1);
  return `${key}-${day}T18:00:00.000Z`;
}

function formatMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function readMonthKey(monthKey: string): { year: number; month: number } {
  if (!isMonthKey(monthKey)) throw new Error(`Month key must be YYYY-MM, received ${monthKey}.`);
  const [year, month] = monthKey.split("-").map(Number);
  return { year, month };
}
