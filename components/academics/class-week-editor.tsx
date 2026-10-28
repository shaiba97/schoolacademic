"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/native-select";
import { saveTimetableBatch } from "@/lib/api/timetable";
import { TIMETABLE_TYPES } from "@/lib/api/types";
import type { ApiClassSubject, ApiSchoolClass, ApiSubject, ApiTeacher, ApiTimetableEntry, SaveTimetableBatchPayload } from "@/lib/api/types";
import { academicErrorMessage } from "./academic-utils";
import {
  MIN_PERIODS_PER_DAY,
  breaksAfterLesson,
  buildWeekDays,
  dayCoverageCaption,
  dayLabel,
  defaultPeriodTimes,
  findCellOverlap,
  incompleteSchoolDays,
  leadingBreaks,
  sequenceDay,
  teacherName,
  type TimetableDay,
} from "./timetable-utils";
import { TimetableWeekGrid, type WeekGridCell, type WeekGridDraft } from "./timetable-week-grid";

type CellState = {
  kind: WeekGridDraft["kind"];
  startTime: string;
  endTime: string;
  subjectId?: string;
  teacherId?: string;
  entryId?: string;
};

type Props = {
  schoolClass: ApiSchoolClass;
  classSubjects: ApiClassSubject[];
  subjects: ApiSubject[];
  teachers: ApiTeacher[];
  initialEntries: ApiTimetableEntry[];
  /** Year-wide entries for cross-class teacher-conflict warnings. Omit to skip the check. */
  allEntries?: ApiTimetableEntry[];
  /**
   * Start from a blank grid instead of stored entries. Nothing is saved until
   * the user fills lessons and saves.
   */
  blankTemplate?: boolean;
  /** Which stored week this editor reads and writes. */
  timetableType?: string;
  examName?: string;
  /** Required lessons per day, from the periods-per-day selector. */
  periodsPerDay?: number;
};

function cellKey(day: TimetableDay, slot: number) {
  return `${day}:${slot}`;
}

function sameCell(left: CellState | undefined, right: CellState | undefined) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return (
    left.kind === right.kind &&
    left.startTime === right.startTime &&
    left.endTime === right.endTime &&
    (left.subjectId ?? "") === (right.subjectId ?? "") &&
    (left.teacherId ?? "") === (right.teacherId ?? "")
  );
}

export function ClassWeekEditor({ schoolClass, classSubjects, subjects, teachers, initialEntries, allEntries = [], blankTemplate = false, timetableType = "REGULAR", examName = "", periodsPerDay = MIN_PERIODS_PER_DAY }: Props) {
  const [entries, setEntries] = React.useState<ApiTimetableEntry[]>(initialEntries);
  const [cells, setCells] = React.useState<Map<string, CellState>>(() =>
    blankTemplate && initialEntries.length === 0 ? new Map<string, CellState>() : toCellMap(initialEntries),
  );
  const [baseline, setBaseline] = React.useState<Map<string, CellState>>(() =>
    blankTemplate && initialEntries.length === 0 ? new Map<string, CellState>() : toCellMap(initialEntries),
  );
  const [active, setActive] = React.useState<{ day: TimetableDay; slot: number } | null>(null);
  /** Break being edited: breaks attach after a lesson, so they carry a storage key, not a period number. */
  const [activeBreak, setActiveBreak] = React.useState<{ day: TimetableDay; key: string } | null>(null);
  const [draft, setDraft] = React.useState<CellState | null>(null);
  /** Session-unique keys for brand-new cells; the save renumbers everything deterministically. */
  const tempRef = React.useRef(0);
  const [pending, setPending] = React.useState(false);
  const [editorError, setEditorError] = React.useState("");
  const [weekError, setWeekError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  /** Saving an empty week deletes the class timetable, so it takes a second click. */
  const [confirmClear, setConfirmClear] = React.useState(false);

  const clearCell = (day: TimetableDay, lessonNo: number) => {
    if (pending) return;
    const key = lessonKeyAt(day, lessonNo);
    if (!key) return;
    setCells((current) => {
      if (!current.has(key)) return current;
      const next = new Map(current);
      next.delete(key);
      return next;
    });
  };
  // Parent remounts this component via `key` when the class changes,
  // so entry state never has to be resynchronised from props in an effect.

  const assignments = React.useMemo(
    () => classSubjects.filter((assignment) => assignment.classId === schoolClass.id && Boolean(assignment.teacherId)),
    [classSubjects, schoolClass.id],
  );
  const assignedSubjects = React.useMemo(() => {
    const ids = new Set(assignments.map((assignment) => assignment.subjectId));
    return subjects.filter((subject) => ids.has(subject.id));
  }, [assignments, subjects]);
  const subjectById = React.useMemo(() => new Map(subjects.map((subject) => [subject.id, subject])), [subjects]);
  const teacherById = React.useMemo(() => new Map(teachers.map((teacher) => [teacher.id, teacher])), [teachers]);
  const teachersForSubject = React.useMemo(
    () => (subjectId: string) => {
      const subject = subjectById.get(subjectId);
      return assignments.filter((assignment) => {
        if (assignment.subjectId !== subjectId || !assignment.teacherId) return false;
        // Same department as the subject; legacy null-department subjects match
        // nothing and fall through to the "no teacher" hint.
        return teacherById.get(assignment.teacherId)?.departmentId === subject?.departmentId;
      });
    },
    [assignments, subjectById, teacherById],
  );
  const days = React.useMemo(() => buildWeekDays(entries), [entries]);

  const dirtyCount = React.useMemo(() => {
    let count = 0;
    const keys = new Set([...cells.keys(), ...baseline.keys()]);
    keys.forEach((key) => {
      if (!sameCell(cells.get(key), baseline.get(key))) count += 1;
    });
    return count;
  }, [cells, baseline]);

  /**
   * Display addressing: lessons are numbered 1..N in time order per day and
   * breaks never take a period number. Storage keys stay untouched — the save
   * renumbers deterministically, so keys are session identity only.
   */
  const sequence = React.useMemo(() => {
    const map = new Map<TimetableDay, { lessons: Array<{ key: string; cell: CellState }>; breaks: Array<{ key: string; cell: CellState }> }>();
    for (const day of days) {
      const dayCells: Array<{ key: string; cell: CellState }> = [];
      cells.forEach((cell, key) => {
        const [cellDay] = key.split(":");
        if (cellDay !== day || cell.kind === "empty") return;
        dayCells.push({ key, cell });
      });
      const { lessons, breaks } = sequenceDay(dayCells, (entry) => entry.kind === "break");
      map.set(day, { lessons, breaks });
    }
    return map;
  }, [days, cells]);

  /** Period columns: at least the selected count, growing with the longest day. */
  const columns = React.useMemo(() => {
    const longest = Math.max(
      periodsPerDay,
      ...days.map((day) => sequence.get(day)?.lessons.length ?? 0),
    );
    return Array.from({ length: longest }, (_, index) => ({ slot: index + 1, band: "" }));
  }, [days, sequence, periodsPerDay]);

  const coverage = React.useMemo(() => {
    const map = new Map<TimetableDay, { lessons: number; breaks: number; total: number }>();
    for (const day of days) {
      const lessons = sequence.get(day)?.lessons.length ?? 0;
      const breaks = sequence.get(day)?.breaks.length ?? 0;
      map.set(day, { lessons, breaks, total: lessons + breaks });
    }
    return map;
  }, [days, sequence]);

  /** Resolve the storage key behind a displayed lesson number, if one exists yet. */
  const lessonKeyAt = (day: TimetableDay, lessonNo: number): string | undefined =>
    sequence.get(day)?.lessons[lessonNo - 1]?.key;
  const newKey = (day: TimetableDay) => `${day}:tmp-${++tempRef.current}`;

  /** Bulk row/column selection for clearing a whole day or period at once. */
  const [selection, setSelection] = React.useState<{ kind: "day"; day: TimetableDay } | { kind: "slot"; slot: number } | null>(null);

  const toggleDay = (day: TimetableDay) =>
    setSelection((current) => (current?.kind === "day" && current.day === day ? null : { kind: "day", day }));
  const toggleSlot = (slot: number) =>
    setSelection((current) => (current?.kind === "slot" && current.slot === slot ? null : { kind: "slot", slot }));

  const selectionCellCount = React.useMemo(() => {
    if (!selection) return 0;
    if (selection.kind === "day") {
      const seq = sequence.get(selection.day);
      if (!seq) return 0;
      return seq.lessons.length + seq.breaks.length;
    }
    let count = 0;
    for (const day of days) {
      const seq = sequence.get(day);
      if (!seq) continue;
      if (seq.lessons[selection.slot - 1]) count += 1;
      count += breaksAfterLesson(seq.breaks, seq.lessons, selection.slot - 1).length;
      if (selection.slot === 1) count += leadingBreaks(seq.breaks, seq.lessons).length;
    }
    return count;
  }, [selection, days, sequence]);

  const bulkClear = () => {
    if (!selection || pending) return;
    const target = selection;
    const keys = new Set<string>();
    if (target.kind === "day") {
      const seq = sequence.get(target.day);
      seq?.lessons.forEach(({ key }) => keys.add(key));
      seq?.breaks.forEach(({ key }) => keys.add(key));
    } else {
      for (const day of days) {
        const seq = sequence.get(day);
        if (!seq) continue;
        const lesson = seq.lessons[target.slot - 1];
        if (lesson) keys.add(lesson.key);
        for (const placed of breaksAfterLesson(seq.breaks, seq.lessons, target.slot - 1)) keys.add(placed.key);
        if (target.slot === 1) for (const placed of leadingBreaks(seq.breaks, seq.lessons)) keys.add(placed.key);
      }
    }
    setCells((current) => {
      const next = new Map(current);
      for (const key of keys) next.delete(key);
      return next;
    });
    setSelection(null);
  };

  /**
   * The complete grid as it will be sent. Lessons are renumbered 1..N in time
   * order per day; breaks take 90+ slots in time order so they never consume a
   * period number. The save writes exactly this.
   */
  const payload = React.useMemo(() => {
    const list: SaveTimetableBatchPayload["cells"] = [];
    for (const day of days) {
      const dayCells: Array<CellState> = [];
      cells.forEach((cell, key) => {
        const [cellDay] = key.split(":");
        if (cellDay !== day || cell.kind === "empty") return;
        dayCells.push(cell);
      });
      dayCells.sort((left, right) => left.startTime.localeCompare(right.startTime));
      let periodNo = 0;
      const breakCells: Array<CellState> = [];
      for (const cell of dayCells) {
        if (cell.kind === "break") {
          breakCells.push(cell);
          continue;
        }
        periodNo += 1;
        list.push({
          day,
          periodNo,
          isBreak: false,
          subjectId: cell.subjectId as string,
          teacherId: cell.teacherId as string,
          startTime: cell.startTime,
          endTime: cell.endTime,
        });
      }
      breakCells
        .sort((left, right) => left.startTime.localeCompare(right.startTime))
        .forEach((cell, index) => {
          list.push({
            day,
            periodNo: 90 + index,
            isBreak: true,
            startTime: cell.startTime,
            endTime: cell.endTime,
          });
        });
    }
    return list;
  }, [days, cells]);

  /**
   * Everything the server refuses to store, worked out locally so an incomplete
   * week reports all of its problems at once instead of one round trip each.
   * An empty grid is the explicit "clear this week" action, not an incomplete one.
   */
  const unit = timetableType === "EXAMINATION" ? "exams" : "periods";
  const problems = React.useMemo(() => {
    if (payload.length === 0) return [];
    const issues: string[] = [];

    if (timetableType === "EXAMINATION" && !examName.trim()) {
      issues.push("Name the exam before saving this examination timetable.");
    }

    payload.forEach((cell) => {
      const day = cell.day as TimetableDay;
      if (!cell.isBreak && (!cell.subjectId || !cell.teacherId)) {
        issues.push(`${dayLabel(day)} period ${cell.periodNo} is missing a subject or teacher.`);
      }
      if (!cell.startTime || !cell.endTime || cell.endTime <= cell.startTime) {
        issues.push(`${dayLabel(day)} period ${cell.periodNo} needs an end time after its start time.`);
      }
    });

    // Only cells with usable times can be compared for overlap.
    const overlap = findCellOverlap(
      payload.filter((cell) => cell.startTime && cell.endTime && cell.endTime > cell.startTime),
    );
    if (overlap) issues.push(overlap);

    issues.push(...incompleteSchoolDays(payload.filter((cell) => !cell.isBreak), periodsPerDay, unit));
    return issues;
  }, [payload, periodsPerDay, unit, timetableType, examName]);

  /**
   * Non-blocking cross-class check: a teacher scheduled here at the same time
   * they teach another class. Computed against the year-wide entries the
   * wizard already loads; skipped when the parent provides none.
   */
  const conflicts = React.useMemo(() => {
    const keys = new Set<string>();
    const messages: string[] = [];
    for (const cell of payload) {
      if (cell.isBreak || !cell.teacherId) continue;
      const clash = allEntries.find((entry) => {
        if (entry.isBreak) return false;
        const entryTeacherId = entry.teacherId;
        if (!entryTeacherId || entryTeacherId !== cell.teacherId) return false;
        const entryClassId = entry.classId ?? entry.schoolClass?.id;
        if (!entryClassId || entryClassId === schoolClass.id) return false;
        if (entry.dayOfWeek !== cell.day) return false;
        return cell.startTime < entry.endTime && entry.startTime < cell.endTime;
      });
      if (clash) {
        keys.add(`${cell.day}:${cell.periodNo}`);
        const teacher = teacherById.get(cell.teacherId);
        messages.push(
          `${dayLabel(cell.day as TimetableDay)} period ${cell.periodNo}: ${teacher ? teacherName(teacher) : "Teacher"} also teaches ${clash.schoolClass?.className ?? "another class"} at that time.`,
        );
      }
    }
    return { keys, messages };
  }, [payload, allEntries, schoolClass.id, teacherById]);

  const cellAt = (day: TimetableDay, lessonNo: number): WeekGridCell | undefined => {
    const daySeq = sequence.get(day);
    const placed = daySeq?.lessons[lessonNo - 1];
    if (!placed) return undefined;
    const { cell } = placed;
    const subject = cell.subjectId ? subjectById.get(cell.subjectId) : undefined;
    const teacher = cell.teacherId ? teacherById.get(cell.teacherId) : undefined;
    const clashes = conflicts.keys.has(`${day}:${lessonNo}`);
    const lessons = daySeq?.lessons ?? [];
    const chips = [
      ...(lessonNo === 1 ? leadingBreaks(daySeq?.breaks ?? [], lessons) : []),
      ...breaksAfterLesson(daySeq?.breaks ?? [], lessons, lessonNo - 1),
    ].map((placedBreak) => ({
      primary: "Break",
      secondary: `${placedBreak.cell.startTime}–${placedBreak.cell.endTime}`,
      onOpen: () => openBreak(day, placedBreak.key),
    }));
    return {
      isBreak: false,
      primary: subject?.name || "Subject",
      secondary: teacher ? teacherName(teacher) : "Unassigned",
      tertiary: `${cell.startTime}–${cell.endTime}${clashes ? " · Double-booked" : ""}`,
      attached: chips.length > 0 ? chips : undefined,
    };
  };

  const openCell = (day: TimetableDay, lessonNo: number) => {
    if (pending) return;
    const key = lessonKeyAt(day, lessonNo);
    const existing = key ? cells.get(key) : undefined;
    setEditorError("");
    setDraft(existing ?? { kind: "empty", ...defaultPeriodTimes(lessonNo) });
    setActiveBreak(null);
    setActive({ day, slot: lessonNo });
  };

  const openBreak = (day: TimetableDay, key: string) => {
    if (pending) return;
    const existing = cells.get(key);
    if (!existing || existing.kind !== "break") return;
    setEditorError("");
    setDraft({ ...existing });
    setActive(null);
    setActiveBreak({ day, key });
  };

  const closeCell = () => {
    if (pending) return;
    setActive(null);
    setActiveBreak(null);
    setDraft(null);
    setEditorError("");
  };

  const patch = (next: Partial<CellState>) => setDraft((current) => (current ? { ...current, ...next } : current));

  const copyToAllDays = () => {
    if (!active || !draft || draft.kind === "empty") return;
    const snapshot = sequence;
    const targets = days.map(
      (day) => snapshot.get(day)?.lessons[active.slot - 1]?.key ?? newKey(day),
    );
    setCells((current) => {
      const next = new Map(current);
      for (const key of targets) next.set(key, { ...draft });
      return next;
    });
    setEditorError("");
    setConfirmClear(false);
  };

  /** Adds a break after the lesson currently open in the dialog. Times are adjustable afterwards. */
  const addBreakAfter = () => {
    if (pending || activeBreak || !active || !draft || draft.kind !== "lesson" || !draft.endTime) return;
    const [hours, minutes] = draft.endTime.split(":").map(Number);
    const total = hours * 60 + minutes + 30;
    const endTime = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    const key = newKey(active.day);
    setCells((current) =>
      new Map(current).set(key, { kind: "break", startTime: draft.endTime, endTime }),
    );
    setActive(null);
    setDraft(null);
    setEditorError("");
    setNotice("Break added after the period — click it to adjust the time.");
  };

  const saveCell = async () => {
    if ((!active && !activeBreak) || !draft) return;
    if (draft.kind === "lesson" && (!draft.subjectId || !draft.teacherId)) {
      setEditorError("Pick a subject and a teacher, or switch this cell to Break.");
      return;
    }
    if (draft.kind !== "empty" && (!draft.startTime || !draft.endTime)) {
      setEditorError("Set a start and end time.");
      return;
    }
    if (draft.kind !== "empty" && draft.startTime && draft.endTime && draft.endTime <= draft.startTime) {
      setEditorError("End time must be after start time.");
      return;
    }
    let key: string | undefined;
    if (activeBreak) key = activeBreak.key;
    else if (active) key = lessonKeyAt(active.day, active.slot) ?? newKey(active.day);
    if (!key) return;
    setPending(true);
    setEditorError("");
    setCells((current) => {
      const next = new Map(current);
      if (draft.kind === "empty") next.delete(key);
      else next.set(key, { ...draft });
      return next;
    });
    setActive(null);
    setActiveBreak(null);
    setDraft(null);
    setPending(false);
    setConfirmClear(false);
    setNotice("");
    setWeekError("");
  };

  const saveWeek = async () => {
    if (problems.length > 0) {
      setWeekError(`This week is not ready to save: ${problems[0]}`);
      return;
    }
    // An empty grid clears the class timetable, so it is confirmed rather than sent.
    if (payload.length === 0 && baseline.size > 0 && !confirmClear) {
      setConfirmClear(true);
      setWeekError('Saving an empty week deletes every period for this class. Choose "Confirm clear week" to continue.');
      return;
    }

    setPending(true);
    setWeekError("");
    setNotice("");
    try {
      const saved = await saveTimetableBatch({
        classId: schoolClass.id,
        timetableType,
        ...(examName.trim() ? { examName: examName.trim() } : {}),
        periodsPerDay,
        cells: payload,
      });
      const nextMap = toCellMap(saved);
      setEntries(saved);
      setCells(nextMap);
      setBaseline(nextMap);
      setConfirmClear(false);
      setNotice(payload.length === 0 ? "Week cleared." : "Timetable saved.");
    } catch (cause) {
      setWeekError(academicErrorMessage(cause, "Unable to save timetable"));
    } finally {
      setPending(false);
    }
  };

  const subjectOptions = draft ? teachersForSubject(draft.subjectId ?? "") : [];
  const noTeacherForSubject = Boolean(draft?.kind === "lesson" && draft.subjectId && subjectOptions.length === 0);
  const typeLabel = TIMETABLE_TYPES.find((type) => type.id === timetableType)?.label ?? timetableType;
  const gridTitle = `${schoolClass.className} · ${typeLabel}${timetableType === "EXAMINATION" && examName.trim() ? ` · ${examName.trim()}` : ""}`;

  return (
    <TimetableWeekGrid
      title={gridTitle}
      days={days}
      rows={columns}
      dayMeta={(day) => dayCoverageCaption(coverage.get(day), "total", periodsPerDay)}
      cellAt={cellAt}
      active={active ?? (activeBreak ? { day: activeBreak.day, slot: -1 } : null)}
      dialogTitle={activeBreak ? "Break" : undefined}
      showEmptyGrid={blankTemplate}
      draft={draft}
      onOpen={openCell}
      onClose={closeCell}
      onPatch={patch}
      onSaveCell={() => void saveCell()}
      onCopyToAllDays={copyToAllDays}
      selectedDay={selection?.kind === "day" ? selection.day : null}
      selectedSlot={selection?.kind === "slot" ? selection.slot : null}
      onSelectDay={toggleDay}
      onSelectSlot={toggleSlot}
      onClearSelection={() => setSelection(null)}
      onBulkClear={bulkClear}
      bulkClearLabel={selectionCellCount > 0 ? `Clear ${selectionCellCount} cell${selectionCellCount === 1 ? "" : "s"}` : "Clear selection"}
      onClearCell={clearCell}
      dirtyCount={dirtyCount}
      onSaveWeek={() => void saveWeek()}
      saveLabel={confirmClear ? "Confirm clear week" : "Save timetable"}
      onPrint={() => window.print()}
      pending={pending}
      editorPending={pending}
      editorError={editorError}
      weekError={weekError}
      problems={problems}
      warnings={conflicts.messages}
      notice={notice}
      emptyHint="No periods scheduled yet. Click any cell to start building the week."
      renderEditor={({ draft: current, patch: apply }) => (
        <div className="space-y-4">
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">Cell type</legend>
            <div className="flex gap-2">
              {([["lesson", "Lesson"], ["break", "Break"], ["empty", "Empty"]] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => apply({ kind: value })}
                  aria-pressed={current.kind === value}
                  className={`rounded-full border px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                    current.kind === value ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-accent"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          {current.kind !== "empty" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cell-start" className="text-sm">Start</Label>
                <input
                  id="cell-start"
                  type="time"
                  value={current.startTime}
                  onChange={(event) => apply({ startTime: event.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  disabled={pending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cell-end" className="text-sm">End</Label>
                <input
                  id="cell-end"
                  type="time"
                  value={current.endTime}
                  onChange={(event) => apply({ endTime: event.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  disabled={pending}
                />
              </div>
            </div>
          ) : null}

          {current.kind === "lesson" ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="cell-subject" className="text-sm">Subject</Label>
                <Select id="cell-subject" value={current.subjectId ?? ""} onChange={(event) => apply({ subjectId: event.target.value, teacherId: "" })} disabled={pending}>
                  <option value="">{assignedSubjects.length === 0 ? "No subjects assigned to this class" : "Select subject"}</option>
                  {assignedSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cell-teacher" className="text-sm">Teacher</Label>
                <Select id="cell-teacher" value={current.teacherId ?? ""} onChange={(event) => apply({ teacherId: event.target.value })} disabled={pending || !current.subjectId}>
                  <option value="">{current.subjectId ? "Select teacher" : "Select a subject first"}</option>
                  {subjectOptions.map((assignment) => {
                    const teacher = teacherById.get(assignment.teacherId ?? "");
                    return <option key={assignment.id} value={assignment.teacherId ?? ""}>{teacher ? teacherName(teacher) : assignment.teacherId}</option>;
                  })}
                </Select>
              </div>
              {noTeacherForSubject ? (
                <p className="text-xs text-muted-foreground">No teacher is assigned to this subject for this class — add one on the Subjects tab.</p>
              ) : null}
              {!activeBreak ? (
                <button
                  type="button"
                  onClick={() => void addBreakAfter()}
                  disabled={pending}
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
                >
                  Add a break after this period
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    />
  );
}

function toCellMap(entries: ApiTimetableEntry[]): Map<string, CellState> {
  const map = new Map<string, CellState>();
  for (const entry of entries) {
    const day = entry.dayOfWeek as TimetableDay;
    const key = cellKey(day, entry.periodNo);
    map.set(key, {
      kind: entry.isBreak ? "break" : "lesson",
      startTime: entry.startTime,
      endTime: entry.endTime,
      subjectId: entry.subjectId ?? undefined,
      teacherId: entry.teacherId ?? undefined,
      entryId: entry.id,
    });
  }
  return map;
}
