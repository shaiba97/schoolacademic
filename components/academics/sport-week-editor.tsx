"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { listSportTimetable } from "@/lib/api/timetable";
import type { ApiSchoolClass, ApiSportTimetableEntry } from "@/lib/api/types";
import { academicErrorMessage } from "./academic-utils";
import { buildWeekDays, type TimetableDay } from "./timetable-utils";
import { TimetableWeekGrid, type WeekGridCell } from "./timetable-week-grid";

const SPORT_SLOT_COUNT = 2;
const DEFAULT_SLOT_BANDS: Record<number, string> = { 1: "14:00 – 15:00", 2: "15:00 – 16:00" };

type Props = { classes: ApiSchoolClass[] };

function SportWeekTable({ title, entries }: { title: string; entries: ApiSportTimetableEntry[] }) {
  const days = React.useMemo(
    () => buildWeekDays(entries.map((entry) => ({ dayOfWeek: entry.day }))),
    [entries],
  );
  const rows = React.useMemo(() => {
    const slots = new Set<number>(
      Array.from({ length: SPORT_SLOT_COUNT }, (_, index) => index + 1),
    );
    entries.forEach((entry) => slots.add(entry.slotNo));
    return [...slots]
      .sort((left, right) => left - right)
      .map((slot) => ({ slot, band: DEFAULT_SLOT_BANDS[slot] ?? "—" }));
  }, [entries]);
  const byDaySlot = React.useMemo(() => {
    const map = new Map<string, ApiSportTimetableEntry>();
    for (const entry of entries) {
      map.set(`${entry.day}:${entry.slotNo}`, entry);
    }
    return map;
  }, [entries]);
  const cellAt = React.useCallback(
    (day: TimetableDay, slot: number): WeekGridCell | undefined => {
      const entry = byDaySlot.get(`${day}:${slot}`);
      if (!entry) return undefined;
      return {
        isBreak: false,
        primary: entry.sport || "Sport",
        secondary: `${entry.startTime}–${entry.endTime}`,
      };
    },
    [byDaySlot],
  );

  return (
    <TimetableWeekGrid
      title={title}
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
      emptyHint="No sport scheduled yet."
    />
  );
}

export function SportWeekEditor({ classes }: Props) {
  const [entries, setEntries] = React.useState<ApiSportTimetableEntry[]>([]);
  const [error, setError] = React.useState("");
  const [requestKey, setRequestKey] = React.useState(0);
  const [completedKey, setCompletedKey] = React.useState(-1);
  const loading = completedKey !== requestKey;

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setError("");
      try {
        const result = await listSportTimetable();
        if (cancelled) return;
        setEntries(result);
      } catch (cause) {
        if (cancelled) return;
        setEntries([]);
        setError(academicErrorMessage(cause, "Unable to load sport timetables"));
      } finally {
        if (!cancelled) setCompletedKey(requestKey);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestKey]);

  const classNameFor = React.useCallback(
    (classId: string): string => {
      const fromEntries = entries.find((entry) => entry.classId === classId)?.schoolClass?.className;
      return fromEntries ?? classes.find((schoolClass) => schoolClass.id === classId)?.className ?? "Class";
    },
    [classes, entries],
  );
  const groups = React.useMemo(() => {
    const map = new Map<string, ApiSportTimetableEntry[]>();
    for (const entry of entries) {
      map.set(entry.classId, [...(map.get(entry.classId) ?? []), entry]);
    }
    return [...map.entries()].sort((left, right) =>
      classNameFor(left[0]).localeCompare(classNameFor(right[0])),
    );
  }, [entries, classNameFor]);

  if (loading && entries.length === 0) {
    return <p role="status" className="text-sm text-muted-foreground">Loading sport timetables…</p>;
  }
  if (error) {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
        <span>{error}</span>
        <Button type="button" variant="outline" size="sm" onClick={() => setRequestKey((key) => key + 1)}>Retry</Button>
      </div>
    );
  }
  if (groups.length === 0) {
    return (
      <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        No sport timetables scheduled yet.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      {groups.map(([classId, classEntries]) => (
        <SportWeekTable key={classId} title={`${classNameFor(classId)} sport`} entries={classEntries} />
      ))}
    </div>
  );
}
