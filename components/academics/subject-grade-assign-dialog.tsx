"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { listClasses } from "@/lib/api/classes";
import type { ApiSchoolClass, ApiSubject } from "@/lib/api/types";
import { academicErrorMessage } from "./academic-utils";
import { EDUCATION_LEVELS, GRADE_LABELS, gradesForLevel } from "./use-level-grade-track";
import { groupSubjectsForGrade, trackScopeForSubject } from "./subject-track-groups";

export function SubjectGradeAssignDialog({
  open,
  onOpenChange,
  subject,
  subjects,
  fixedGrade,
  onSubmit,
  pending,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selected subject. When null, a subject picker is shown (needs `subjects`). */
  subject: ApiSubject | null;
  subjects?: ApiSubject[];
  /** When set, the grade pickers are replaced by a fixed grade label. */
  fixedGrade?: { level: string; grade: string } | null;
  onSubmit: (subjectId: string, classIds: string[]) => Promise<{ assigned: number; total: number }>;
  pending: boolean;
  error: string;
}) {
  const [level, setLevel] = React.useState<(typeof EDUCATION_LEVELS)[number]>("SECONDARY");
  const [grade, setGrade] = React.useState("FIRST");
  const [pickedSubjectId, setPickedSubjectId] = React.useState("");
  const [classes, setClasses] = React.useState<ApiSchoolClass[] | null>(null);
  const [loadError, setLoadError] = React.useState("");
  const [result, setResult] = React.useState("");

  const grades = gradesForLevel(level);
  // Clamp without an effect: a stale grade (after switching level) falls back
  // to the first valid grade for display, filtering, and submission.
  const safeGrade = grades.includes(grade) ? grade : grades[0];

  const activeLevel = fixedGrade?.level ?? level;
  const activeGrade = fixedGrade?.grade ?? safeGrade;
  const activeSubject = subject ?? (subjects ?? []).find((s) => s.id === pickedSubjectId) ?? null;
  const subjectGroups = groupSubjectsForGrade(subjects ?? [], activeLevel, activeGrade, null);

  // States live in promise continuations only — the parent remounts this
  // dialog per subject (key), so fresh state needs no reset effect.
  React.useEffect(() => {
    if (!open) return;
    listClasses({ page: 1, limit: 100 }).then(
      (res) => setClasses(res.data),
      (cause: unknown) => setLoadError(academicErrorMessage(cause, "Unable to load classes")),
    );
  }, [open ]);

  const loadingClasses = open && classes === null && !loadError;

  // Plain derivation (no memo): a tiny filter over at most a page of classes,
  // which also keeps the React Compiler happy about the derived safeGrade.
  // Track restriction: a Science subject attaches only to Science-track
  // classes, an Art subject only to Art-track classes; common subjects (and
  // anything unmatched) go to every class in the grade.
  const subjectScope = activeSubject ? trackScopeForSubject(activeSubject.name) : null;
  const matching = (classes ?? []).filter(
    (c) =>
      c.educationLevel === activeLevel &&
      c.grade === activeGrade &&
      (!subjectScope || c.track === subjectScope),
  );

  const submit = async () => {
    if (pending || matching.length === 0 || !activeSubject) return;
    setResult("");
    try {
      const outcome = await onSubmit(activeSubject.id, matching.map((c) => c.id));
      const skipped = outcome.total - outcome.assigned;
      setResult(
        skipped > 0
          ? `Assigned to ${outcome.assigned} of ${outcome.total} classes (${skipped} already had it).`
          : `Assigned to all ${outcome.total} classes.`,
      );
    } catch {
      // Parent surfaces the error via the error prop.
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!pending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Assign {activeSubject?.name ?? "subject"} to a grade</DialogTitle>
          <DialogDescription>
            Common subjects attach to every class in the grade; Science subjects only to Science classes, Art subjects only to Art classes. No teacher is assigned — do that per class afterwards.
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 pt-0 space-y-4">
          {!subject ? (
            <div className="space-y-1.5">
              <Label htmlFor="grade-assign-subject">Subject</Label>
              <Select id="grade-assign-subject" value={pickedSubjectId} onChange={(event) => setPickedSubjectId(event.target.value)} disabled={pending}>
                <option value="">Select subject</option>
                {subjectGroups.map((group) => (
                  <optgroup key={group.id} label={group.label}>
                    {group.subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </div>
          ) : null}

          {fixedGrade ? (
            <p className="text-sm text-muted-foreground">
              Grade: <span className="font-medium text-foreground">{fixedGrade.level} · {fixedGrade.grade}</span>
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="grade-assign-level">Education level</Label>
                <Select id="grade-assign-level" value={level} onChange={(event) => setLevel(event.target.value as (typeof EDUCATION_LEVELS)[number])} disabled={pending}>
                  {EDUCATION_LEVELS.map((option) => <option key={option} value={option}>{option}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="grade-assign-grade">Grade</Label>
                <Select id="grade-assign-grade" value={safeGrade} onChange={(event) => setGrade(event.target.value)} disabled={pending}>
                  {grades.map((option) => <option key={option} value={option}>{GRADE_LABELS[option as keyof typeof GRADE_LABELS] ?? option}</option>)}
                </Select>
              </div>
            </div>
          )}

          {loadError ? (
            <p role="alert" className="text-sm text-destructive">{loadError}</p>
          ) : loadingClasses ? (
            <Skeleton className="h-16 w-full" />
          ) : matching.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {subjectScope
                ? `No ${subjectScope === "SCIENCE" ? "Science" : "Art"} classes in this grade yet.`
                : "No classes exist in this grade yet."}
            </p>
          ) : (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">
                Will attach to {matching.length} class{matching.length === 1 ? "" : "es"}
                {subjectScope ? ` (${subjectScope === "SCIENCE" ? "Science" : "Art"} only)` : ""}
              </p>
              <ul className="max-h-36 overflow-y-auto rounded-lg border divide-y text-sm">
                {matching.map((c) => (
                  <li key={c.id} className="px-3 py-1.5">{c.className}</li>
                ))}
              </ul>
            </div>
          )}

          {result ? <p role="status" className="text-sm text-muted-foreground">{result}</p> : null}
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Close</Button>
            <Button type="button" onClick={() => void submit()} disabled={pending || loadingClasses || matching.length === 0 || !activeSubject}>
              {pending ? "Assigning…" : `Assign to grade`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
