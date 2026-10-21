import type { ApiTeacher, ApiTimetableEntry } from "@/lib/api/types";

/** Every value the DayOfWeek enum accepts. */
export const ALL_DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
export type DayOfWeek = (typeof ALL_DAYS)[number];

/** The school week the timetable UI is built around: Mon/Tue/Wed/Thu/Sat. */
export const TIMETABLE_DAYS = ["MON", "TUE", "WED", "THU", "SAT"] as const;
export type TimetableDay = DayOfWeek;

/** The grid renders these periods; rows can grow to cover higher periods found in data. */
export const PERIOD_COUNT = 9;
export const PERIOD_START_HOUR = 7;
export const PERIOD_LENGTH_MINUTES = 50;

/** A school day is expected to carry at least this many lesson periods (breaks excluded). */
export const MIN_PERIODS_PER_DAY = 7;

/** Breaks a day is expected to have; used to pre-place the default break cells. */
export const BREAKS_PER_DAY = 2;

/** Where the pre-placed breaks land: mid-morning and mid-afternoon. */
export const BREAK_SLOT_SEEDS = [3, 6] as const;

const DAY_LABELS: Record<DayOfWeek, string> = {
  SUN: "Sun",
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
};

export function dayLabel(day: DayOfWeek) {
  return DAY_LABELS[day] ?? day;
}

/** "1st", "2nd", "3rd" — the row headers the timetable is specified to use. */
export function periodLabel(slot: number) {
  const remainder = slot % 100;
  if (remainder >= 11 && remainder <= 13) return `${slot}th`;
  switch (slot % 10) {
    case 1: return `${slot}st`;
    case 2: return `${slot}nd`;
    case 3: return `${slot}rd`;
    default: return `${slot}th`;
  }
}

type TeacherReference = Pick<ApiTeacher, "id" | "user"> & { employeeNumber?: string | null };

function toTimeLabel(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Start/end the grid pre-fills for a period when there is no stored cell yet. */
export function defaultPeriodTimes(slot: number) {
  const start = PERIOD_START_HOUR * 60 + (slot - 1) * PERIOD_LENGTH_MINUTES;
  return { startTime: toTimeLabel(start), endTime: toTimeLabel(start + PERIOD_LENGTH_MINUTES) };
}

function defaultPeriodBand(slot: number) {
  const { startTime, endTime } = defaultPeriodTimes(slot);
  return `${startTime} – ${endTime}`;
}

/**
 * Period rows for the grid: always the standard periods, plus anything the
 * stored data already uses. A period that exists in data but is dropped from
 * the payload would be deleted on save, so it has to stay visible.
 */
export function buildPeriodRows(entries: Pick<ApiTimetableEntry, "periodNo">[]): { slot: number; band: string }[] {
  const slots = new Set<number>(Array.from({ length: PERIOD_COUNT }, (_, index) => index + 1));
  entries.forEach((entry) => slots.add(entry.periodNo));
  return [...slots].sort((left, right) => left - right).map((slot) => ({ slot, band: defaultPeriodBand(slot) }));
}

/**
 * Columns for the grid: the five school days, plus any other day that already
 * has data so a save cannot silently drop it.
 */
export function buildWeekDays(entries: Pick<ApiTimetableEntry, "dayOfWeek">[]): TimetableDay[] {
  const present = new Set<string>(entries.map((entry) => entry.dayOfWeek));
  const schoolWeek = new Set<string>(TIMETABLE_DAYS);
  const extras = ALL_DAYS.filter((day) => !schoolWeek.has(day) && present.has(day));
  return [...TIMETABLE_DAYS, ...extras];
}

export type PlacedCell<T> = { key: string; cell: T };

export type DaySequence<T> = {
  /** Lessons in time order; the index (+1) is the displayed period number. */
  lessons: Array<PlacedCell<T>>;
  /** Breaks in time order, each rendered attached after its preceding lesson. */
  breaks: Array<PlacedCell<T>>;
};

/**
 * Splits one day's cells into time-ordered lessons and breaks. Lesson columns
 * are numbered by lesson sequence (breaks excluded); breaks attach after the
 * lesson that precedes them in time order. Storage period numbers are left
 * untouched — the save path renumbers deterministically.
 */
export function sequenceDay<T extends { startTime: string }>(
  dayCells: Array<PlacedCell<T>>,
  isBreak: (cell: T) => boolean,
): DaySequence<T> {
  const ordered = [...dayCells].sort((left, right) => left.cell.startTime.localeCompare(right.cell.startTime));
  return {
    lessons: ordered.filter(({ cell }) => !isBreak(cell)),
    breaks: ordered.filter(({ cell }) => isBreak(cell)),
  };
}

/** Breaks rendered attached to a 0-based lesson index: those starting at or after it but before the next lesson. */
export function breaksAfterLesson<T extends { startTime: string }>(
  breaks: Array<PlacedCell<T>>,
  lessons: Array<PlacedCell<T>>,
  lessonIndex: number,
): Array<PlacedCell<T>> {
  const current = lessons[lessonIndex];
  if (!current) return [];
  const next = lessons[lessonIndex + 1];
  return breaks.filter(
    ({ cell }) =>
      cell.startTime >= current.cell.startTime && (!next || cell.startTime < next.cell.startTime),
  );
}

/** Breaks earlier than every lesson of the day render attached to the first lesson cell. */
export function leadingBreaks<T extends { startTime: string }>(
  breaks: Array<PlacedCell<T>>,
  lessons: Array<PlacedCell<T>>,
): Array<PlacedCell<T>> {
  const first = lessons[0];
  if (!first) return breaks;
  return breaks.filter(({ cell }) => cell.startTime < first.cell.startTime);
}

export function teacherName(teacher: TeacherReference | null | undefined) {
  const name = [teacher?.user?.firstName, teacher?.user?.lastName].filter(Boolean).join(" ");
  return name || teacher?.employeeNumber || "Unassigned";
}

export type DayCoverage = { lessons: number; breaks: number; total: number };

/**
 * Counts what each day actually holds. `stateAt` returns null for an empty
 * cell, true for a break and false for a lesson.
 */
export function buildDayCoverage(
  days: readonly TimetableDay[],
  slots: readonly number[],
  stateAt: (day: TimetableDay, slot: number) => boolean | null,
): Map<TimetableDay, DayCoverage> {
  const coverage = new Map<TimetableDay, DayCoverage>();
  for (const day of days) {
    let lessons = 0;
    let breaks = 0;
    for (const slot of slots) {
      const state = stateAt(day, slot);
      if (state === true) breaks += 1;
      else if (state === false) lessons += 1;
    }
    coverage.set(day, { lessons, breaks, total: lessons + breaks });
  }
  return coverage;
}

/**
 * Days that are still under the expected minimum. These are advisory — the grid
 * stays saveable while a week is being built, so this only reports.
 *
 * `count` picks what counts towards the minimum: every scheduled cell on the
 * class tab, or lessons only where a break is not real work (the teacher tab).
 */
export function underMinPeriodWarnings(
  coverage: Map<TimetableDay, DayCoverage>,
  days: readonly TimetableDay[],
  options: { unit?: string; count?: "total" | "lessons" } = {},
): string[] {
  const { unit = "periods", count = "total" } = options;
  return days
    .filter((day) => (count === "lessons" ? (coverage.get(day)?.lessons ?? 0) : (coverage.get(day)?.total ?? 0)) < MIN_PERIODS_PER_DAY)
    .map((day) => {
      const counts = coverage.get(day);
      const measured = count === "lessons" ? (counts?.lessons ?? 0) : (counts?.total ?? 0);
      const parts = [`${measured}/${MIN_PERIODS_PER_DAY} ${unit}`];
      if ((counts?.breaks ?? 0) > 0) parts.push(`${counts?.breaks} break${counts?.breaks === 1 ? "" : "s"}`);
      return `${dayLabel(day)} has ${parts.join(", ")}.`;
    });
}

/** Compact per-day caption for the row header, e.g. "5/7 · 2 breaks". */
export function dayCoverageCaption(counts: DayCoverage | undefined, count: "total" | "lessons" = "total", minimum: number = MIN_PERIODS_PER_DAY) {
  if (!counts) return null;
  const parts = [`${count === "lessons" ? counts.lessons : counts.total}/${minimum}`];
  if (counts.breaks > 0) parts.push(`${counts.breaks} break${counts.breaks === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

/**
 * School days a save is not allowed to leave short. A day holding nothing and a
 * day holding too little are reported the same way, because the server refuses
 * the save either way.
 */
export function incompleteSchoolDays(cells: { day: string }[], minimum: number, unit: string): string[] {
  const counts = new Map<string, number>();
  for (const cell of cells) counts.set(cell.day, (counts.get(cell.day) ?? 0) + 1);
  return TIMETABLE_DAYS.filter((day) => (counts.get(day) ?? 0) < minimum).map(
    (day) => `${dayLabel(day)} has ${counts.get(day) ?? 0}/${minimum} ${unit}.`,
  );
}

/**
 * The first pair of cells in a day that run at the same time, described for the
 * user. Cells may sit in different periods and still clash, so this compares the
 * actual times rather than the period numbers. Breaks use 90+ storage slots
 * that never appear in the UI, so they are labeled as breaks.
 */
export function findCellOverlap(
  cells: { day: string; periodNo: number; isBreak?: boolean; startTime: string; endTime: string }[],
): string | null {
  const label = (cell: { periodNo: number; isBreak?: boolean }) =>
    cell.isBreak || cell.periodNo >= 90 ? "Break" : periodLabel(cell.periodNo);
  const byDay = new Map<string, typeof cells>();
  for (const cell of cells) byDay.set(cell.day, [...(byDay.get(cell.day) ?? []), cell]);

  for (const [day, rows] of byDay) {
    const ordered = [...rows].sort((left, right) => left.startTime.localeCompare(right.startTime));
    for (let index = 1; index < ordered.length; index += 1) {
      const previous = ordered[index - 1];
      const current = ordered[index];
      if (current.startTime < previous.endTime) {
        return `${label(previous)} and ${label(current)} overlap on ${dayLabel(day as DayOfWeek)} (${current.startTime}–${current.endTime}).`;
      }
    }
  }
  return null;
}
