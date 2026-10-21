"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Activity, Clock, GraduationCap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listClasses } from "@/lib/api/classes";
import { listClassSubjects, listSubjects } from "@/lib/api/subjects";
import { listTeachers } from "@/lib/api/teachers";
import { listTimetableForClass, listTimetableForYear } from "@/lib/api/timetable";
import type { ApiClassSubject, ApiSchoolClass, ApiSubject, ApiTeacher, ApiTimetableEntry } from "@/lib/api/types";
import { academicErrorMessage } from "./academic-utils";
import { ClassWeekEditor } from "./class-week-editor";
import { SportWeekEditor } from "./sport-week-editor";
import { TeacherWeekView } from "./teacher-week-view";
import { TimetableScopeControls, type TimetableScope } from "./timetable-scope-controls";

const TABS = [
  { id: "class" as const, label: "Class", icon: GraduationCap },
  { id: "teacher" as const, label: "Teacher", icon: Users },
  { id: "sport" as const, label: "Sport", icon: Activity },
];

type TabId = (typeof TABS)[number]["id"];

export function TimetableClient({
  initialTab = "class",
  initialError = "",
}: {
  initialTab?: TabId;
  initialError?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState<TabId>(
    TABS.some((entry) => entry.id === initialTab) ? initialTab : "class",
  );

  const selectTab = (next: TabId) => {
    setTab(next);
    router.replace(`/academics/timetable?tab=${next}`, { scroll: false });
  };

  const [classes, setClasses] = React.useState<ApiSchoolClass[]>([]);
  const [subjects, setSubjects] = React.useState<ApiSubject[]>([]);
  const [teachers, setTeachers] = React.useState<ApiTeacher[]>([]);
  /** True once the reference fetch settles. Starts false on both server and
      first client render so data-gated attributes hydrate identically. */
  const [refsLoaded, setRefsLoaded] = React.useState(false);
  const [refsError, setRefsError] = React.useState(initialError);
  const [entries, setEntries] = React.useState<ApiTimetableEntry[]>([]);
  const [entriesError, setEntriesError] = React.useState("");
  const [completedRequest, setCompletedRequest] = React.useState("");
  const [reloadToken, setReloadToken] = React.useState(0);
  const entriesRequest = `${reloadToken}`;
  const entriesLoading = Boolean(entriesRequest) && completedRequest !== entriesRequest;

  const [scope, setScope] = React.useState<TimetableScope>({ classId: "", timetableType: "REGULAR", examName: "", periodsPerDay: 7 });
  const [creating, setCreating] = React.useState(false);
  const [classSubjects, setClassSubjects] = React.useState<ApiClassSubject[]>([]);
  const [classEntries, setClassEntries] = React.useState<ApiTimetableEntry[]>([]);
  const [classLoadedFor, setClassLoadedFor] = React.useState("");
  const [classError, setClassError] = React.useState("");
  const classRequestRef = React.useRef(0);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const [classResult, subjectResult, teacherResult] = await Promise.allSettled([
        listClasses({ page: 1, limit: 100 }),
        listSubjects({ page: 1, limit: 100 }),
        listTeachers({ page: 1, limit: 999 }),
      ]);
      if (cancelled) return;
      const messages: string[] = [];
      if (classResult.status === "fulfilled") setClasses(classResult.value.data);
      else {
        setClasses([]);
        messages.push(academicErrorMessage(classResult.reason, "Unable to load classes"));
      }
      if (subjectResult.status === "fulfilled") setSubjects(subjectResult.value.data);
      else {
        setSubjects([]);
        messages.push(academicErrorMessage(subjectResult.reason, "Unable to load subjects"));
      }
      if (teacherResult.status === "fulfilled") setTeachers(teacherResult.value.data);
      else {
        setTeachers([]);
        messages.push(academicErrorMessage(teacherResult.reason, "Unable to load teachers"));
      }
      setRefsError(messages.join(" "));
      setRefsLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  React.useEffect(() => {
    if (!entriesRequest) return;
    let cancelled = false;
    (async () => {
      setEntriesError("");
      try {
        const result = await listTimetableForYear();
        if (cancelled) return;
        setEntries(result);
      } catch (cause) {
        if (cancelled) return;
        setEntries([]);
        setEntriesError(academicErrorMessage(cause, "Unable to load timetables"));
      } finally {
        if (!cancelled) setCompletedRequest(entriesRequest);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entriesRequest]);

  React.useEffect(() => {
    if (!scope.classId) return;
    const requestId = ++classRequestRef.current;
    const examName = scope.timetableType === "EXAMINATION" ? scope.examName.trim() : "";
    const loadedKey = `${scope.classId}:${scope.timetableType}:${examName}`;
    (async () => {
      try {
        const [assignments, nextEntries] = await Promise.all([
          listClassSubjects(scope.classId),
          listTimetableForClass(scope.classId, {
            timetableType: scope.timetableType,
            ...(examName ? { examName } : {}),
          }),
        ]);
        if (requestId !== classRequestRef.current) return;
        setClassSubjects(assignments);
        setClassEntries(nextEntries);
        setClassError("");
      } catch (cause) {
        if (requestId !== classRequestRef.current) return;
        setClassSubjects([]);
        setClassEntries([]);
        setClassError(academicErrorMessage(cause, "Unable to load this class's timetable"));
      } finally {
        if (requestId === classRequestRef.current) setClassLoadedFor(loadedKey);
      }
    })();
    return () => {};
  }, [scope]);

  const selectScope = (next: TimetableScope) => {
    setClassSubjects([]);
    setClassEntries([]);
    setClassLoadedFor("");
    setClassError("");
    setCreating(false);
    setScope(next);
  };

  const scopeKey = `${scope.classId}:${scope.timetableType}:${scope.timetableType === "EXAMINATION" ? scope.examName.trim() : ""}`;
  const selectedClass = classes.find((candidate) => candidate.id === scope.classId);
  const classLoading = Boolean(scope.classId) && classLoadedFor !== scopeKey;
  const reloadAll = () => setReloadToken((token) => token + 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold"><Clock size={20} aria-hidden /> Timetables</h1>
          <p className="mt-1 text-sm text-muted-foreground">Build the week on the Class tab — the Teacher tab is derived from it.</p>
        </div>
      </div>

      <div className="flex w-fit gap-1.5 rounded-lg bg-muted p-1 print:hidden" role="tablist" aria-label="Timetable view">
        {TABS.map((entry) => {
          const active = tab === entry.id;
          const Icon = entry.icon;
          return (
            <button
              key={entry.id}
              id={`timetable-tab-${entry.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`timetable-panel-${entry.id}`}
              onClick={() => selectTab(entry.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${active ? "border bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Icon size={14} aria-hidden /> {entry.label}
            </button>
          );
        })}
      </div>

      {refsError ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive print:hidden">
          <span>{refsError}</span>
          <Button type="button" variant="outline" size="sm" onClick={reloadAll}>Retry</Button>
        </div>
      ) : null}

      <div id={`timetable-panel-${tab}`} role="tabpanel" aria-labelledby={`timetable-tab-${tab}`} className="space-y-4">
        {tab === "class" ? (
          <div className="space-y-4">
            <div className="print:hidden">
              <TimetableScopeControls classes={classes} scope={scope} onChange={selectScope} disabled={!refsLoaded} />
            </div>

            {!selectedClass ? (
              <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Select a class to build its week.</p>
            ) : classLoading ? (
              <p role="status" className="text-sm text-muted-foreground">Loading class timetable…</p>
            ) : classError ? (
              <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <span>{classError}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => selectScope({ ...scope, classId: "" })}>Clear</Button>
              </div>
            ) : classEntries.length === 0 && !creating ? (
              <div className="space-y-3 rounded-lg border bg-card p-6 text-center">
                <p className="text-sm font-medium">No timetable yet for {selectedClass.className}</p>
                <p className="text-sm text-muted-foreground">Create the first week, then fill in the lessons.</p>
                <Button type="button" onClick={() => setCreating(true)}>Create timetable</Button>
              </div>
            ) : (
              <ClassWeekEditor
                key={`${scopeKey}:${creating ? "new" : "saved"}`}
                schoolClass={selectedClass}
                classSubjects={classSubjects}
                subjects={subjects}
                teachers={teachers}
                initialEntries={classEntries}
                allEntries={entries}
                blankTemplate={creating}
                timetableType={scope.timetableType}
                examName={scope.timetableType === "EXAMINATION" ? scope.examName.trim() : ""}
                periodsPerDay={scope.periodsPerDay}
              />
            )}
          </div>
        ) : null}

        {tab === "teacher" ? (
          <TeacherWeekView
            teachers={teachers}
            entries={entries}
            loading={entriesLoading}
            error={entriesError}
            onRetry={reloadAll}
          />
        ) : null}

        {tab === "sport" ? <SportWeekEditor classes={classes} /> : null}
      </div>
    </div>
  );
}
