import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Standard Monday-to-Sunday weekly day names used across FitLab.
 */
export const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

/**
 * Returns a YYYY-MM-DD string representing the local calendar date.
 * Avoids the UTC-boundary shift bug caused by `new Date().toISOString().slice(0, 10)`
 * where local dates after midnight in UTC+ timezones (e.g. IST UTC+5:30) incorrectly
 * resolve to yesterday's date.
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns an offset local date (e.g. -1 for yesterday, 1 for tomorrow).
 */
export function getLocalDateOffset(offsetDays: number, baseDate: Date = new Date()): string {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + offsetDays);
  return getLocalDateString(d);
}

/**
 * Returns the Monday-first day index (0 = Monday, ..., 6 = Sunday).
 */
export function getMondayFirstDayIndex(d: Date = new Date()): number {
  return d.getDay() === 0 ? 6 : d.getDay() - 1;
}

/**
 * Returns the day name (e.g. "Monday", "Sunday") for a given date.
 */
export function getDayName(d: Date = new Date()): DayOfWeek {
  return DAYS_OF_WEEK[getMondayFirstDayIndex(d)];
}

/**
 * Returns the day name for a YYYY-MM-DD local date string.
 * Uses noon local time to prevent any DST or midnight boundary shift.
 */
export function getDayNameFromDateKey(dateKey: string): DayOfWeek {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
  return getDayName(date);
}
