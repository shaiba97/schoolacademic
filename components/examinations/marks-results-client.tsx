"use client";

import * as React from "react";
import { PenLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { enterSubjectMarks, getExam, listExams, publishExamResults } from "@/lib/api/exams";
import { listEnrollments } from "@/lib/api/students";
import type { ApiEnrollmentRecord, ApiExam, ApiExamSubject } from "@/lib/api/types";
import { academicErrorMessage } from "@/components/academics/academic-utils";

function subjectLabel(s: ApiExamSubject): string {
  const subjectName = s.classSubject?.subject?.name ?? "Subject";
  const className = s.classSubject?.schoolClass?.className;
  return className ? `${subjectName} · ${className}` : subjectName;
}

type MarkRow = {
  studentId: string;
  name: string;
  roleNumber: string;
  marks: string;
  remarks: string;
  grade?: string | null;
  status?: string;
};

export function MarksResultsClient() {
  const [exams, setExams] = React.useState<ApiExam[]>([]);
  const [examId, setExamId] = React.useState("");
  const [exam, setExam] = React.useState<ApiExam | null>(null);
  const [subjectId, setSubjectId] = React.useState("");
  const [enrollments, setEnrollments] = React.useState<ApiEnrollmentRecord[]>([]);
  const [rows, setRows] = React.useState<MarkRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [examLoading, setExamLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [error, setError] = React.useState("");
  const [formError, setFormError] = React.useState("");
  const [savedNote, setSavedNote] = React.useState("");

  React.useEffect(() => {
    Promise.all([listExams({ page: 1, limit: 100 }), listEnrollments()])
      .then(([res, list]) => {
        setExams(res.data);
        setEnrollments(list);
      })
      .catch((cause) => setError(academicErrorMessage(cause, "Unable to load exams")))
      .finally(() => setLoading(false));
  }, []);

  async function handleExamChange(id: string) {
    setExamId(id);
    setExam(null);
    setSubjectId("");
    setRows([]);
    setFormError("");
    setSavedNote("");
    if (!id) return;
    setExamLoading(true);
    try {
      const full = await getExam(id);
      setExam(full);
      const first = full.examSubjects?.[0];
      if (first) handleSubjectChange(full, first.id);
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to load exam"));
    } finally {
      setExamLoading(false);
    }
  }

  function handleSubjectChange(current: ApiExam, id: string) {
    setSubjectId(id);
    setFormError("");
    setSavedNote("");
    const subject = current.examSubjects?.find((s) => s.id === id);
    if (!subject) {
      setRows([]);
      return;
    }
    const classId = subject.classSubject?.classId;
    const results = new Map((subject.results ?? []).map((r) => [r.studentId, r]));
    setRows(
      enrollments
        .filter((e) => e.schoolClass?.id === classId)
        .map((e) => e.student)
        .sort((a, b) =>
          `${a.lastName ?? ""} ${a.firstName}`.localeCompare(`${b.lastName ?? ""} ${b.firstName}`),
        )
        .map((s) => {
          const existing = results.get(s.id);
          return {
            studentId: s.id,
            name: `${s.firstName} ${s.lastName ?? ""}`.trim(),
            roleNumber: s.roleNumber,
            marks: existing?.marks != null ? String(Number(existing.marks)) : "",
            remarks: existing?.remarks ?? "",
            grade: existing?.grade,
            status: existing?.status,
          };
        }),
    );
  }

  const subject = exam?.examSubjects?.find((s) => s.id === subjectId);
  const maxMarks = subject ? Number(subject.maxMarks) : 0;
  const enteredCount = rows.filter((r) => r.marks.trim() !== "").length;

  function updateRow(studentId: string, patch: Partial<MarkRow>) {
    setRows((current) => current.map((r) => (r.studentId === studentId ? { ...r, ...patch } : r)));
  }

  async function handleSave() {
    if (!subject) return;
    const records: Array<{ studentId: string; marks: number; remarks?: string }> = [];
    for (const r of rows) {
      const raw = r.marks.trim();
      if (!raw) continue;
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0) {
        setFormError(`Marks must be a number ≥ 0 for ${r.name}.`);
        return;
      }
      if (maxMarks > 0 && value > maxMarks) {
        setFormError(`Marks cannot exceed max ${maxMarks} for ${r.name}.`);
        return;
      }
      records.push({
        studentId: r.studentId,
        marks: value,
        ...(r.remarks.trim() ? { remarks: r.remarks.trim() } : {}),
      });
    }
    if (records.length === 0) {
      setFormError("Enter marks for at least one student.");
      return;
    }
    setSaving(true);
    setFormError("");
    setSavedNote("");
    try {
      await enterSubjectMarks(subject.id, records);
      setSavedNote(`Saved ${records.length} record${records.length === 1 ? "" : "s"} as draft.`);
      const full = await getExam(examId);
      setExam(full);
      if (subjectId) handleSubjectChange(full, subjectId);
    } catch (cause) {
      setFormError(academicErrorMessage(cause, "Unable to save marks"));
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      await publishExamResults(examId);
      setPublishOpen(false);
      setExam(await getExam(examId));
      setSavedNote("Results published.");
    } catch (cause) {
      setFormError(academicErrorMessage(cause, "Unable to publish results"));
      setPublishOpen(false);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Examination Center · Marks & Results
        </p>
        <h1 className="text-xl font-semibold tracking-tight mt-1">Marks & Results</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Draft entry per subject, then publish per exam. Publishing is staff-admin only.
        </p>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-12 w-full" />
        </div>
      ) : exams.length === 0 ? (
        <EmptyState
          title="No exams yet"
          description="Create an exam with subjects before entering marks."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
<div className="space-y-2">
              <span className="text-sm font-medium">Exam</span>
              <Select value={examId} onValueChange={(v) => void handleExamChange(v)}>
                <SelectTrigger><SelectValue placeholder="Select an exam…" /></SelectTrigger>
                <SelectContent>
                  {exams.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {examId && (
                <p className="text-sm text-muted-foreground mt-1">
                  Selected: {exams.find((e) => e.id === examId)?.name ?? "—"}
                </p>
              )}
            </div>
          <div className="space-y-2">
            <span className="text-sm font-medium">Subject</span>
            {!exam || examLoading ? (
              <div className="flex h-9 w-full items-center rounded-lg border border-input bg-muted px-3 py-1 text-sm text-muted-foreground">
                {!exam ? "Select an exam first" : "Loading…"}
              </div>
            ) : (
              <Select
                value={subjectId}
                onValueChange={(v) => { if (exam) handleSubjectChange(exam, v); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a subject…" />
                </SelectTrigger>
                <SelectContent>
                  {(exam?.examSubjects ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{subjectLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      )}

      {subject ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap gap-3 justify-between items-center">
              <CardTitle className="text-sm flex items-center gap-2">
                <PenLine size={14} className="text-muted-foreground" aria-hidden />
                {subjectLabel(subject)}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Max {String(subject.maxMarks)}</Badge>
                {subject.passingMarks != null ? (
                  <Badge variant="outline">Pass {String(subject.passingMarks)}</Badge>
                ) : null}
                <Badge variant="secondary">{enteredCount}/{rows.length} entered</Badge>
                {exam?.status ? <Badge variant={exam.status === "PUBLISHED" ? "success" : "muted"}>{exam.status}</Badge> : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No enrolled students found for this class.</p>
            ) : (
              <div className="rounded-lg border divide-y">
                <div className="grid grid-cols-[1fr_110px_1fr_auto] gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  <span>Student</span>
                  <span>Marks</span>
                  <span>Remarks</span>
                  <span className="w-16 text-right">Grade</span>
                </div>
                {rows.map((r) => (
                  <div key={r.studentId} className="grid grid-cols-[1fr_110px_1fr_auto] gap-2 px-3 py-1.5 items-center">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{r.roleNumber}</p>
                    </div>
                    <Input
                      value={r.marks}
                      onChange={(event) => updateRow(r.studentId, { marks: event.target.value })}
                      placeholder="—"
                      inputMode="decimal"
                      aria-label={`${r.name} marks`}
                    />
                    <Input
                      value={r.remarks}
                      onChange={(event) => updateRow(r.studentId, { remarks: event.target.value })}
                      placeholder="Optional"
                      aria-label={`${r.name} remarks`}
                    />
                    <span className="w-16 text-right text-sm text-muted-foreground">
                      {r.grade ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {formError ? (
              <p role="alert" className="text-sm text-destructive">{formError}</p>
            ) : null}
            {savedNote ? (
              <p role="status" className="text-sm text-muted-foreground">{savedNote}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void handleSave()} disabled={saving || rows.length === 0}>
                {saving ? "Saving…" : "Save drafts"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPublishOpen(true)}
                disabled={publishing || !examId}
              >
                {publishing ? "Publishing…" : "Publish exam results"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <AlertDialog open={publishOpen} onOpenChange={(o) => { if (!publishing && !o) setPublishOpen(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish results?</AlertDialogTitle>
            <AlertDialogDescription>
              Every draft result in this exam becomes PUBLISHED and visible. This is the release gate —
              continue only when entry and review are complete.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPublishOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handlePublish()}>
              {publishing ? "Publishing…" : "Publish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
