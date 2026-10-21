"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { TIMETABLE_TYPES } from "@/lib/api/types";
import type { ApiTeacher, ApiTimetableEntry } from "@/lib/api/types";
import {
  buildPeriodRows,
  buildWeekDays,
  teacherName,
  type TimetableDay,
} from "./timetable-utils";
import { TimetableWeekGrid, type WeekGridCell } from "./timetable-week-grid";

type Props = {
  teachers: ApiTeacher[];
  entries: ApiTimetableEntry[];
  loading: boolean;
  error: string;
  onRetry: () => void;
};

function teacherIdOf(entry: ApiTimetableEntry): string | undefined {
  return entry.teacherId ?? entry.teacher?.id;
}

function TeacherWeekTable({
  teacherName,
  entries,
}: {
  teacherName: string;
  entries: ApiTimetableEntry[];
}) {
  const days = React.useMemo(() => buildWeekDays(entries), [entries]);
  const rows = React.useMemo(() => buildPeriodRows(entries), [entries]);
  const byDayPeriod = React.useMemo(() => {
    const map = new Map<string, ApiTimetableEntry>();
    for (const entry of entries) {
      map.set(`${entry.dayOfWeek}:${entry.periodNo}`, entry);
    }
    return map;
  }, [entries]);
  const cellAt = React.useCallback(
    (day: TimetableDay, slot: number): WeekGridCell | undefined => {
      const entry = byDayPeriod.get(`${day}:${slot}`);
      if (!entry) return undefined;
      if (entry.isBreak) {
        return { isBreak: true, primary: "Break", secondary: `${entry.startTime}–${entry.endTime}` };
      }
      const subject = entry.subject;
      const className = entry.schoolClass?.className ?? "Class";
      return {
        isBreak: false,
        primary: subject?.name || "Subject",
        secondary: className,
        tertiary: `${entry.startTime}–${entry.endTime}`,
      };
    },
    [byDayPeriod],
  );

  return (
    <TimetableWeekGrid
      title={teacherName}
      days={days}
      rows={rows}
      cellAt={cellAt}
      active={null}
      draft={null}
      onOpen={() => {}}
      onClose={() => {}}
      onPatch={() => {}}
      onSaveCell={() => {}}
      readOnly
      emptyHint="No lessons scheduled for this teacher yet."
    />
  );
}

export function TeacherWeekView({ teachers, entries, loading, error, onRetry }: Props) {
  const teacherNameFor = React.useCallback(
    (teacherId: string, groupEntries: ApiTimetableEntry[]): string => {
      const fromEntries =
        groupEntries.map((entry) => entry.teacher ?? null).find(Boolean) ?? null;
      const teacher = fromEntries ?? teachers.find((candidate) => candidate.id === teacherId) ?? null;
      return teacher ? teacherName(teacher) : "Teacher";
    },
    [teachers],
  );
  const groupTitleFor = React.useCallback(
    (teacherId: string, groupEntries: ApiTimetableEntry[]): string => {
      const name = teacherNameFor(teacherId, groupEntries);
      const first = groupEntries[0];
      const typeLabel = TIMETABLE_TYPES.find((type) => type.id === (first?.timetableType ?? "REGULAR"))?.label ?? first?.timetableType ?? "Regular";
      const exam = first?.timetableType === "EXAMINATION" && first?.examName ? ` · ${first.examName}` : "";
      return `${name} · ${typeLabel}${exam}`;
    },
    [teacherNameFor],
  );
  const groups = React.useMemo(() => {
    const map = new Map<string, ApiTimetableEntry[]>();
    for (const entry of entries) {
      if (entry.isBreak) continue;
      const teacherId = teacherIdOf(entry);
      if (!teacherId) continue;
      const key = `${teacherId}:${entry.timetableType ?? "REGULAR"}:${entry.timetableType === "EXAMINATION" ? (entry.examName ?? "") : ""}`;
      map.set(key, [...(map.get(key) ?? []), entry]);
    }
    return [...map.entries()].sort((left, right) =>
      groupTitleFor(left[0].split(":")[0], left[1]).localeCompare(groupTitleFor(right[0].split(":")[0], right[1])),
    );
  }, [entries, groupTitleFor]);

  if (loading && entries.length === 0) {
    return <p role="status" className="text-sm text-muted-foreground">Loading teacher timetables…</p>;
  }
  if (error) {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
        <span>{error}</span>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>Retry</Button>
      </div>
    );
  }
  if (groups.length === 0) {
    return (
      <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        No teacher timetables for the selected year.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      {groups.map(([groupKey, teacherEntries]) => {
        const teacherId = groupKey.split(":")[0];
        return (
          <TeacherWeekTable key={groupKey} teacherName={groupTitleFor(teacherId, teacherEntries)} entries={teacherEntries} />
        );
      })}
    </div>
  );
}
