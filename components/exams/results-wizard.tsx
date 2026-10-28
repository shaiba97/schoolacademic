"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Loader2, MoreHorizontal, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { EDUCATION_LEVELS } from "@/components/academics/use-level-grade-track";
import { listExamTypes } from "@/lib/api/exam-types";
import { listTenantResults } from "@/lib/api/students";
import { enterSubjectMarks } from "@/lib/api/exams";
import { studentFullName } from "@/lib/api/mappers";
import { academicErrorMessage } from "@/components/academics/academic-utils";
import type { ApiExamType, ApiTenantResult } from "@/lib/api/types";

const GRADE_CHOICE: Record<string, number[]> = {
  SECONDARY: [1, 2, 3],
  INTERMEDIATE: [6, 7, 8, 9],
};

function toNumber(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function levelLabel(level: string | null | undefined): string {
  if (!level) return "—";
  return level === "SECONDARY" ? "Secondary" : level === "INTERMEDIATE" ? "Intermediate" : level;
}

function subjectOf(result: ApiTenantResult): string {
  return (
    result.examSubject?.classSubject?.subject?.name ??
    result.examSubject?.classSubject?.schoolClass?.className ??
    "—"
  );
}

/** One row of the matrix: the student plus their latest result per subject in scope. */
type StudentRow = {
  student: ApiTenantResult["student"];
  bySubject: Map<string, ApiTenantResult>;
};

/** Per-class subject column with its live marks-book state. */
type ColumnMeta = {
  name: string;
  result: ApiTenantResult;
  submitted: number;
  unmarked: number;
};

/** The matrix is grouped per class so each class keeps its own teachers and marks books. */
type ClassGroup = {
  classId: string;
  className: string;
  rows: StudentRow[];
  columns: ColumnMeta[];
};

function classOf(result: ApiTenantResult): string {
  return result.examSubject?.classSubject?.schoolClass?.id ?? "unassigned";
}

function classLabelOf(result: ApiTenantResult): string {
  return result.examSubject?.classSubject?.schoolClass?.className ?? "Unassigned class";
}

function studentMatches(
  student: ApiTenantResult["student"],
  query: string,
  level: string,
  grade: string,
): boolean {
  if (query && !studentFullName(student).toLowerCase().includes(query)) return false;
  if (level && student.educationLevel !== level) return false;
  if (grade && Number(student.grade) !== Number(grade)) return false;
  return true;
}

export function ResultsWizard() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [level, setLevel] = React.useState("");
  const [grade, setGrade] = React.useState("");
  const [assessmentTypeId, setAssessmentTypeId] = React.useState("all");
  const [examTypes, setExamTypes] = React.useState<ApiExamType[]>([]);
  const [results, setResults] = React.useState<ApiTenantResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  // Edit marks dialog (per student, per subject column)
  const [editTarget, setEditTarget] = React.useState<{ group: ClassGroup; row: StudentRow } | null>(null);
  const [editValues, setEditValues] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [editError, setEditError] = React.useState("");

  // Official single-student result dialog
  const [resultTarget, setResultTarget] = React.useState<{ group: ClassGroup; row: StudentRow } | null>(null);
  const [printAfterOpen, setPrintAfterOpen] = React.useState(false);

  // One batched request per load — the tenant-wide results board.
  async function loadResults() {
    setLoading(true);
    setError("");
    try {
      const data = await listTenantResults();
      setResults(data);
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to load results"));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    listExamTypes()
      .then(setExamTypes)
      .catch(() => setExamTypes([]));
  }, []);

  // Print trigger for "Download Result".
  React.useEffect(() => {
    if (resultTarget && printAfterOpen) {
      const frame = requestAnimationFrame(() => window.print());
      setPrintAfterOpen(false);
      return () => cancelAnimationFrame(frame);
    }
  }, [resultTarget, printAfterOpen]);

  const query = search.trim().toLowerCase();

  // Matrix grouped per class: rows = students of that class, columns = that
  // class's subjects (latest mark per subject within the assessment scope).
  // Columns also carry Draft/Submitted state straight from the marks books.
  const groups = React.useMemo<ClassGroup[]>(() => {
    const map = new Map<
      string,
      {
        className: string;
        rowMap: Map<string, StudentRow>;
        columnLatest: Map<string, ApiTenantResult>;
      }
    >();
    for (const result of results) {
      if (assessmentTypeId !== "all" && result.examSubject?.exam?.examTypeId !== assessmentTypeId) {
        continue;
      }
      if (!result.student || !studentMatches(result.student, query, level, grade)) continue;
      const classKey = classOf(result);
      let group = map.get(classKey);
      if (!group) {
        group = { className: classLabelOf(result), rowMap: new Map(), columnLatest: new Map() };
        map.set(classKey, group);
      }
      let row = group.rowMap.get(result.student.id);
      if (!row) {
        row = { student: result.student, bySubject: new Map() };
        group.rowMap.set(result.student.id, row);
      }
      const subject = subjectOf(result);
      const created = new Date(result.createdAt ?? 0).getTime();
      const existing = row.bySubject.get(subject);
      if (!existing || new Date(existing.createdAt ?? 0).getTime() < created) {
        row.bySubject.set(subject, result);
      }
      const latest = group.columnLatest.get(subject);
      if (!latest || new Date(latest.createdAt ?? 0).getTime() < created) {
        group.columnLatest.set(subject, result);
      }
    }
    const sorted = [...map.entries()].sort((a, b) => a[1].className.localeCompare(b[1].className));
    return sorted.map(([classId, group]) => {
      const rows = [...group.rowMap.values()].sort((a, b) =>
        a.student.roleNumber.localeCompare(b.student.roleNumber, undefined, { numeric: true }),
      );
      const columns: ColumnMeta[] = [...group.columnLatest.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, result]) => ({ name, result, submitted: 0, unmarked: 0 }));
      for (const column of columns) {
        for (const row of rows) {
          const cell = row.bySubject.get(column.name);
          if (!cell) continue;
          if (toNumber(cell.marks) == null) column.unmarked += 1;
          else if (cell.status === "SUBMITTED") column.submitted += 1;
        }
      }
      return { classId, className: group.className, rows, columns };
    });
  }, [results, assessmentTypeId, query, level, grade]);

  const gradeChoices = level ? GRADE_CHOICE[level] ?? [] : [1, 2, 3, 6, 7, 8, 9];

  function openEdit(group: ClassGroup, row: StudentRow) {
    const values: Record<string, string> = {};
    for (const [subject, result] of row.bySubject.entries()) {
      const marks = toNumber(result.marks);
      values[subject] = marks == null ? "" : String(marks);
    }
    setEditValues(values);
    setEditError("");
    setEditTarget({ group, row });
  }

  async function handleSaveMarks(event: React.FormEvent) {
    event.preventDefault();
    if (!editTarget) return;
    const updates: Array<{ examSubjectId: string; marks: number; maxMarks: number | null }> = [];
    for (const [subject, value] of Object.entries(editValues)) {
      const result = editTarget.row.bySubject.get(subject);
      if (!result || value === "") continue;
      const marks = Number(value);
      const max = toNumber(result.examSubject?.maxMarks);
      if (!Number.isFinite(marks) || marks < 0) {
        setEditError(`${subject}: marks must be a non-negative number.`);
        return;
      }
      if (max != null && marks > max) {
        setEditError(`${subject}: marks cannot exceed the max of ${max}.`);
        return;
      }
      updates.push({ examSubjectId: result.examSubjectId, marks, maxMarks: max });
    }
    setSaving(true);
    setEditError("");
    try {
      await Promise.all(
        updates.map((u) =>
          enterSubjectMarks(u.examSubjectId, [{ studentId: editTarget.row.student.id, marks: u.marks }]),
        ),
      );
      setEditTarget(null);
      await loadResults();
    } catch (cause) {
      setEditError(academicErrorMessage(cause, "Marks could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  function openResult(group: ClassGroup, row: StudentRow, straightToPrint = false) {
    setPrintAfterOpen(straightToPrint);
    setResultTarget({ group, row });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Examination Center · Results Wizard</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">Results</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Matrix of obtained marks — students in rows, subjects in columns. Edit marks, view, or download the official result.
        </p>
      </div>

      {/* Filter & search header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Filters</CardTitle>
          <CardDescription>Search students, then narrow by level, grade, and the exam or test they sat.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-56 flex-1">
            <Search size={14} className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student full name…"
              aria-label="Search student full name"
              className="ps-8"
            />
          </div>
          <div className="w-44">
            <Select value={assessmentTypeId} onValueChange={setAssessmentTypeId}>
              <SelectTrigger aria-label="Exam or test" className="w-full">
                <SelectValue placeholder="All exams & tests" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All exams & tests</SelectItem>
                {examTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40">
            <Select value={level} onValueChange={(v) => { setLevel(v); setGrade(""); }}>
              <SelectTrigger aria-label="Educational level" className="w-full">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                {EDUCATION_LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>{levelLabel(l)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-36">
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger aria-label="Grade" className="w-full">
                <SelectValue placeholder="Grade" />
              </SelectTrigger>
              <SelectContent>
                {gradeChoices.map((g) => (
                  <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" onClick={() => void loadResults()} disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" aria-hidden /> Refreshing…
              </>
            ) : (
              "Refresh"
            )}
          </Button>
        </CardContent>
      </Card>

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {/* Master matrix — one table per class, so each class's marks books stay separate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Results matrix</CardTitle>
          <CardDescription>
            {groups.length} class {groups.length === 1 ? "group" : "groups"} — each class lists its own
            students and subjects. Column badges show how many marks books are submitted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2" aria-busy="true">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students match the current search and filters.</p>
          ) : (
            <div className="space-y-8">
              {groups.map((group) => (
                <section key={group.classId} className="space-y-2">
                  <header className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">{group.className}</h3>
                    <p className="text-xs text-muted-foreground">
                      {group.rows.length} student{group.rows.length === 1 ? "" : "s"} ×{" "}
                      {group.columns.length} subject{group.columns.length === 1 ? "" : "s"}
                    </p>
                  </header>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                          <th className="py-2 pe-3 text-start font-medium">Student</th>
                          {group.columns.map((c) => (
                            <th key={c.name} className="py-2 pe-3 align-bottom text-start font-medium">
                              <p className="whitespace-nowrap">{c.name}</p>
                              <p className="mt-0.5 whitespace-nowrap text-[10px] font-normal normal-case tracking-normal">
                                {c.unmarked > 0 ? (
                                  <span className="text-amber-600">{c.unmarked} unmarked</span>
                                ) : (
                                  <span>
                                    {c.submitted}/{group.rows.length} submitted
                                  </span>
                                )}
                              </p>
                            </th>
                          ))}
                          <th className="py-2 text-end font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((row) => {
                          return (
                            <tr key={row.student.id} className="border-b last:border-0">
                              <td className="py-2 pe-3">
                                <p className="font-medium whitespace-nowrap">{studentFullName(row.student)}</p>
                                <p className="text-xs text-muted-foreground">{row.student.roleNumber}</p>
                              </td>
                              {group.columns.map((c) => {
                                const result = row.bySubject.get(c.name);
                                const marks = toNumber(result?.marks);
                                const passMarks = toNumber(result?.examSubject?.passingMarks);
                                const passed = marks == null || passMarks == null || marks >= passMarks;
                                return (
                                  <td key={c.name} className="py-2 pe-3">
                                    {marks == null ? (
                                      <span className="text-muted-foreground">—</span>
                                    ) : passed ? (
                                      marks
                                    ) : (
                                      <span className="text-destructive">{marks}</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="py-2 text-end">
                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    render={
                                      <Button
                                        size="icon-sm"
                                        variant="ghost"
                                        aria-label={`Actions for ${studentFullName(row.student)}`}
                                      >
                                        <MoreHorizontal size={14} />
                                      </Button>
                                    }
                                  />
                                  <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => openEdit(group, row)}>Edit marks</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openResult(group, row)}>View result</DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => router.push(`/exams/results/students/${row.student.id}`)}
                                    >
                                      <Eye size={14} /> Performance report
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openResult(group, row, true)}>Download result</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          );
                        })}
                        <tr>
                          <td className="py-2 pe-3 font-medium">Total marks shown</td>
                          {group.columns.map((c) => (
                            <td key={c.name} className="py-2 pe-3 text-muted-foreground">
                              {group.rows.reduce((acc, row) => acc + (toNumber(row.bySubject.get(c.name)?.marks) ?? 0), 0)}
                            </td>
                          ))}
                          <td />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit marks dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o && !saving) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          {editTarget ? (
            <form onSubmit={(e) => void handleSaveMarks(e)}>
              <DialogHeader>
                <DialogTitle>Edit marks</DialogTitle>
                <DialogDescription>
                  {studentFullName(editTarget.row.student)} · {editTarget.group.className} — updates are
                  saved to this class's marks books.
                </DialogDescription>
              </DialogHeader>
              <div className="my-4 space-y-3">
                {editTarget.group.columns.map((c) => {
                  const result = editTarget.row.bySubject.get(c.name);
                  if (!result) return null;
                  const examName = result.examSubject?.exam?.name;
                  const max = toNumber(result.examSubject?.maxMarks);
                  return (
                    <div key={c.name} className="grid grid-cols-[1fr_7rem] items-center gap-3">
                      <div className="min-w-0">
                        <Label htmlFor={`edit-${c.name}`} className="truncate">{c.name}</Label>
                        <p className="text-xs text-muted-foreground">
                          {examName ? `${examName} · ` : ""}
                          max {max ?? "—"}
                        </p>
                      </div>
                      <Input
                        id={`edit-${c.name}`}
                        inputMode="decimal"
                        value={editValues[c.name] ?? ""}
                        onChange={(e) => setEditValues((current) => ({ ...current, [c.name]: e.target.value }))}
                      />
                    </div>
                  );
                })}
              </div>
              {editError ? (
                <p role="alert" className="mb-3 text-sm text-destructive">{editError}</p>
              ) : null}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setEditTarget(null)} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save marks"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Official single-student result dialog */}
      <Dialog open={!!resultTarget} onOpenChange={(o) => { if (!o) setResultTarget(null); }}>
        <DialogContent className="print:max-w-none sm:max-w-xl max-h-[90vh] overflow-y-auto">
          {resultTarget ? (
            <>
              <DialogHeader>
                <DialogTitle>Official student result</DialogTitle>
                <DialogDescription>
                  {assessmentTypeId === "all"
                    ? "All exams & tests (latest mark per subject)"
                    : examTypes.find((t) => t.id === assessmentTypeId)?.name ?? "Selected assessment"}
                </DialogDescription>
              </DialogHeader>
              <StudentOfficialResult
                row={resultTarget.row}
                className={resultTarget.group.className}
                assessmentLabel={
                  assessmentTypeId === "all"
                    ? "All exams & tests"
                    : examTypes.find((t) => t.id === assessmentTypeId)?.name ?? "—"
                }
              />
              <DialogFooter className="justify-between gap-2 sm:justify-between print:hidden">
                <Link
                  href={`/exams/results/students/${resultTarget.row.student.id}`}
                  className="text-sm font-medium hover:underline"
                >
                  View full performance report →
                </Link>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setResultTarget(null)}>
                    Close
                  </Button>
                  <Button type="button" onClick={() => window.print()}>
                    Download / Print
                  </Button>
                </div>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StudentOfficialResult({
  row,
  className,
  assessmentLabel,
}: {
  row: StudentRow;
  className: string;
  assessmentLabel: string;
}) {
  const entries = [...row.bySubject.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  let totalMax = 0;
  let totalPass = 0;
  let totalObtained = 0;
  for (const [, result] of entries) {
    totalMax += toNumber(result.examSubject?.maxMarks) ?? 0;
    totalPass += toNumber(result.examSubject?.passingMarks) ?? 0;
    totalObtained += toNumber(result.marks) ?? 0;
  }
  const overallPassed = totalPass > 0 ? totalObtained >= totalPass : null;

  return (
    <div className="mt-2 space-y-3">
      <div className="grid gap-1 text-sm sm:grid-cols-2">
        <p><span className="text-muted-foreground">Student: </span><span className="font-medium">{studentFullName(row.student)}</span></p>
        <p><span className="text-muted-foreground">Roll No: </span><span className="font-medium">{row.student.roleNumber}</span></p>
        <p><span className="text-muted-foreground">Class: </span><span className="font-medium">{className}</span></p>
        <p><span className="text-muted-foreground">Assessment: </span><span className="font-medium">{assessmentLabel}</span></p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
            <th className="py-2 pe-3 text-start font-medium">Subject</th>
            <th className="py-2 pe-3 text-end font-medium">Max marks</th>
            <th className="py-2 pe-3 text-end font-medium">Pass marks</th>
            <th className="py-2 text-end font-medium">Obtained</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([name, result]) => {
            const marks = toNumber(result.marks);
            const passValue = toNumber(result.examSubject?.passingMarks);
            const passed = marks != null && passValue != null && marks >= passValue;
            return (
              <tr key={name} className="border-b last:border-0">
                <td className="py-2 pe-3 font-medium">{name}</td>
                <td className="py-2 pe-3 text-end text-muted-foreground">{toNumber(result.examSubject?.maxMarks) ?? "—"}</td>
                <td className="py-2 pe-3 text-end text-muted-foreground">{passValue ?? "—"}</td>
                <td className={`py-2 text-end font-medium ${passed === false ? "text-destructive" : ""}`}>{marks ?? "—"}</td>
              </tr>
            );
          })}
          <tr className="border-t-2">
            <td className="py-2 pe-3 font-semibold">Total</td>
            <td className="py-2 pe-3 text-end font-semibold">{totalMax}</td>
            <td className="py-2 pe-3 text-end font-semibold">{totalPass}</td>
            <td className="py-2 text-end font-semibold">{totalObtained}</td>
          </tr>
        </tbody>
      </table>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Overall result:</span>
        {overallPassed === null ? (
          <Badge variant="outline">Not determined</Badge>
        ) : overallPassed ? (
          <Badge variant="success">Pass</Badge>
        ) : (
          <Badge variant="destructive">Fail</Badge>
        )}
        {totalMax > 0 ? (
          <span className="text-sm text-muted-foreground">
            {Math.round((totalObtained / totalMax) * 1000) / 10}% overall
          </span>
        ) : null}
      </div>
    </div>
  );
}
