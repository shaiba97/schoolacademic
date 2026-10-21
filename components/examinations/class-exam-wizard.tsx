"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Trash2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Stepper } from "@/components/ui/stepper";
import { FilePicker } from "@/components/ui/file-picker";
import { useLevelGradeTrack, GRADE_LABELS, validateLevelGradeTrack } from "@/components/academics/use-level-grade-track";
import { listAcademicTerms } from "@/lib/api/academic-years";
import { listClasses } from "@/lib/api/classes";
import { listClassSubjects } from "@/lib/api/subjects";
import { createExam } from "@/lib/api/exams";
import { deleteStagedFile, uploadExamSample } from "@/lib/api/storage";
import type {
  ApiAcademicTerm,
  ApiAcademicYear,
  ApiGradingScale,
  ApiSchoolClass,
  ApiClassSubject,
  CreateExamSubjectPayload,
} from "@/lib/api/types";
import { academicErrorMessage } from "@/components/academics/academic-utils";

type SubjectRow = CreateExamSubjectPayload & { label: string; teacherName: string };

function teacherDisplayName(cs: ApiClassSubject): string {
  const user = cs.teacher?.user;
  if (!user) return "";
  return [user.firstName, user.lastName].filter(Boolean).join(" ");
}

export function ClassExamWizard({
  years,
  scales,
}: {
  years: ApiAcademicYear[];
  scales: ApiGradingScale[];
}) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [name, setName] = React.useState("");
  const [subjects, setSubjects] = React.useState<SubjectRow[]>([]);
  const [sampleFile, setSampleFile] = React.useState<{ file: File; previewUrl?: string; path: string } | null>(null);
  const [stagedSample, setStagedSample] = React.useState<{ objectKey: string; originalName: string; size: number } | null>(null);
  const [uploadingSample, setUploadingSample] = React.useState(false);
  const [sampleError, setSampleError] = React.useState("");
  const draftId = React.useMemo(() => crypto.randomUUID(), []);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loadError, setLoadError] = React.useState("");

  const cascade = useLevelGradeTrack();
  const [classId, setClassId] = React.useState("");

  const [terms, setTerms] = React.useState<ApiAcademicTerm[]>([]);
  const [classes, setClasses] = React.useState<ApiSchoolClass[]>([]);
  const [classSubjects, setClassSubjects] = React.useState<ApiClassSubject[]>([]);

  const currentYear = React.useMemo(
    () => years.find((y) => y.isCurrent) ?? years[0],
    [years],
  );

  const defaultScaleId = React.useMemo(
    () => scales.find((s) => s.isDefault)?.id ?? "",
    [scales],
  );

  React.useEffect(() => {
    listClasses({ page: 1, limit: 100 })
      .then((res) => setClasses(res.data))
      .catch((cause) => setLoadError(academicErrorMessage(cause, "Unable to load classes")));
  }, []);

  React.useEffect(() => {
    if (!currentYear) {
      setTerms([]);
      return;
    }
    listAcademicTerms(currentYear.id)
      .then((list) => setTerms([...list].sort((a, b) => a.sequenceNo - b.sequenceNo)))
      .catch((cause) => setLoadError(academicErrorMessage(cause, "Unable to load terms")));
  }, [currentYear]);

  React.useEffect(() => {
    if (!classId) {
      setClassSubjects([]);
      return;
    }
    listClassSubjects(classId)
      .then(setClassSubjects)
      .catch((cause) => setLoadError(academicErrorMessage(cause, "Unable to load subjects")));
  }, [classId]);


  const matchingClasses = React.useMemo(
    () =>
      classes.filter(
        (c) =>
          c.educationLevel === cascade.educationLevel &&
          c.grade === cascade.grade &&
          (cascade.needsTrack ? c.track === cascade.track : true),
      ),
    [classes, cascade.educationLevel, cascade.grade, cascade.needsTrack, cascade.track],
  );

  function addSubject(cs: ApiClassSubject) {
    if (subjects.some((s) => s.classSubjectId === cs.id)) return;
    setSubjects((current) => [
      ...current,
      {
        classSubjectId: cs.id,
        label: cs.subject?.name ?? "Subject",
        teacherName: teacherDisplayName(cs),
        maxMarks: 100,
        ...(defaultScaleId ? { gradingScaleId: defaultScaleId } : {}),
      },
    ]);
  }

  function updateSubject(index: number, patch: Partial<SubjectRow>) {
    setSubjects((current) => current.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  const defaultTerm = terms[0];

  async function handleSampleChange(value: { file: File; previewUrl?: string; path: string } | null) {
    setSampleFile(value);
    setSampleError("");
    if (stagedSample) {
      const old = stagedSample;
      setStagedSample(null);
      await deleteStagedFile(old.objectKey).catch(() => undefined);
    }
    if (!value) return;
    setUploadingSample(true);
    try {
      const stored = await uploadExamSample({ file: value.file, draftId });
      setStagedSample({ objectKey: stored.objectKey, originalName: stored.originalName, size: stored.size });
    } catch (cause) {
      setSampleError(academicErrorMessage(cause, "Unable to upload sample paper"));
      setSampleFile(null);
    } finally {
      setUploadingSample(false);
    }
  }

  function validateSubjects(): true | string {
    if (subjects.length === 0) return "Add at least one subject.";
    for (const s of subjects) {
      if (!(s.maxMarks > 0)) return `Max marks must be a positive number for ${s.label}.`;
      if (s.passingMarks != null && s.passingMarks > s.maxMarks) {
        return `Pass marks cannot exceed max marks for ${s.label}.`;
      }
    }
    return true;
  }

  const steps = [
    {
      id: "details",
      label: "Exam Details",
      description: "Name the exam, then narrow down to the class and subject.",
      validate: () => {
        if (!name.trim()) return "Give the exam a name.";
        const cascadeError = validateLevelGradeTrack(cascade.educationLevel, cascade.grade, cascade.track);
        if (cascadeError) return cascadeError;
        if (!classId) return "Select a class.";
        return validateSubjects();
      },
    },
    {
      id: "sample",
      label: "Sample",
      description: "Optional reference paper (PDF). Upload now or attach later on the exam page.",
    },
    {
      id: "review",
      label: "Review",
      description: "Confirm everything, then create the exam.",
    },
  ];

  async function handleComplete() {
    // Re-validate every step: the stepper only gates step-by-step navigation,
    // and the user can go back and change earlier answers.
    for (let i = 0; i < steps.length; i++) {
      const result = steps[i].validate?.();
      if (typeof result === "string") {
        setStep(i);
        setError(result);
        return;
      }
    }
    if (uploadingSample) {
      setError("Wait for the sample paper to finish uploading.");
      return;
    }
    if (!currentYear || !defaultTerm) {
      setError(
        currentYear
          ? "No default term is set for the current academic year."
          : "No academic year exists yet.",
      );
      return;
    }
    setPending(true);
    setError("");
    try {
      const created = await createExam({
        academicYearId: currentYear.id,
        termId: defaultTerm.id,
        name: name.trim(),
        classIds: [classId],
        ...(stagedSample
          ? {
              sample: {
                objectKey: stagedSample.objectKey,
                originalName: stagedSample.originalName,
                size: stagedSample.size,
              },
            }
          : {}),
        subjects: subjects.map((s) => ({
          classSubjectId: s.classSubjectId,
          maxMarks: s.maxMarks,
          ...(s.passingMarks != null ? { passingMarks: s.passingMarks } : {}),
          ...(s.gradingScaleId ? { gradingScaleId: s.gradingScaleId } : {}),
        })),
      });
      // Single-class payloads always resolve to one standalone exam row.
      const row = Array.isArray(created) ? created[0] : created;
      router.push(`/examinations/exam-setup/${row.id}`);
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to create exam"));
    } finally {
      setPending(false);
    }
  }

  if (!currentYear) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">New Class Exam</h1>
        <div role="alert" className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm">
          <p className="font-medium">No academic year exists yet</p>
          <p className="mt-1">
            Exams are created inside the current academic year, which is provisioned automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/examinations" className="hover:text-foreground">Examination Center</Link>
        <ChevronRight size={14} />
        <Link href="/examinations/exam-setup" className="hover:text-foreground">Exams</Link>
        <ChevronRight size={14} />
        <span className="text-foreground font-medium">New Class Exam</span>
      </nav>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">New Class Exam</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {currentYear.name} · {defaultTerm ? defaultTerm.name : "no term yet"} · exam type can be assigned later on the exam page.
        </p>
      </div>

      {loadError ? (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : null}

      {!defaultTerm ? (
        <p role="note" className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          {currentYear.name} has no terms yet — add one before creating exams.
        </p>
      ) : null}

      <Stepper steps={steps} active={step} onStepChange={setStep} onComplete={() => void handleComplete()}>
        {(active) => (
          <div>
            {active === 0 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="cx-name" className="text-sm font-medium">Exam name</label>
                  <Input
                    id="cx-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Chapter 3 Quiz"
                    autoFocus
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Education level</span>
                    <Select value={cascade.educationLevel} onValueChange={(v) => cascade.setEducationLevel(v as "SECONDARY" | "INTERMEDIATE")}>
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SECONDARY">Secondary</SelectItem>
                        <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Grade</span>
                    <Select value={cascade.grade} onValueChange={cascade.setGrade}>
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        {cascade.grades.map((g) => (
                          <SelectItem key={g} value={g}>
                            {GRADE_LABELS[g as keyof typeof GRADE_LABELS] ?? g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {cascade.needsTrack ? (
                    <div className="space-y-2">
                      <span className="text-sm font-medium">Track</span>
                      <Select value={cascade.track ?? ""} onValueChange={(v) => cascade.setTrack(v || null)}>
                        <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ART">Art</SelectItem>
                          <SelectItem value="SCIENCE">Science</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Class</span>
                    <Select
                      value={classId}
                      onValueChange={(v) => setClassId(v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select level, grade and track first" /></SelectTrigger>
                      <SelectContent>
                        {matchingClasses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {matchingClasses.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No classes match this combination yet.</p>
                    ) : null}
                  </div>
                </div>

                {classId ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Available subjects — click to add</p>
                    {classSubjects.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No subjects assigned to this class yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {classSubjects.map((cs) => {
                          const added = subjects.some((s) => s.classSubjectId === cs.id);
                          const teacher = teacherDisplayName(cs);
                          return (
                            <Button
                              key={cs.id}
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={added}
                              onClick={() => addSubject(cs)}
                              title={teacher ? `Teacher: ${teacher}` : "No teacher assigned"}
                            >
                              {cs.subject?.name ?? "Subject"}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}

                {subjects.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Selected ({subjects.length})</p>
                    <div className="space-y-1.5">
                      {subjects.map((s, i) => (
                        <div key={s.classSubjectId} className="rounded-lg border p-2 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium flex-1 truncate">{s.label}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSubjects((current) => current.filter((_, j) => j !== i))}
                              aria-label={`Remove ${s.label}`}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <UserCheck size={12} aria-hidden />
                            {s.teacherName ? (
                              <>Teacher: <span className="font-medium text-foreground">{s.teacherName}</span> (assigned — read-only)</>
                            ) : (
                              <>No teacher assigned yet</>
                            )}
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              value={String(s.maxMarks)}
                              onChange={(event) => {
                                const v = Number(event.target.value);
                                updateSubject(i, { maxMarks: Number.isNaN(v) ? 0 : v });
                              }}
                              placeholder="Max marks"
                              inputMode="decimal"
                              aria-label={`${s.label} max marks`}
                            />
                            <Input
                              value={s.passingMarks != null ? String(s.passingMarks) : ""}
                              onChange={(event) => {
                                const raw = event.target.value.trim();
                                updateSubject(i, raw === "" ? { passingMarks: undefined } : { passingMarks: Number(raw) || 0 });
                              }}
                              placeholder="Pass marks (optional)"
                              inputMode="decimal"
                              aria-label={`${s.label} pass marks`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {active === 1 ? (
              <div className="space-y-2">
                <FilePicker
                  id="cx-sample"
                  label="Reference paper (PDF, optional)"
                  accept="application/pdf"
                  maxSizeMB={10}
                  value={sampleFile}
                  onChange={(value) => void handleSampleChange(value)}
                  helperText="A sample or reference paper attached to the exam record."
                  error={sampleError || undefined}
                />
                {uploadingSample ? (
                  <p role="status" className="text-sm text-muted-foreground">Uploading sample…</p>
                ) : null}
              </div>
            ) : null}

            {active === 2 ? (
              <dl className="space-y-2 text-sm">
                <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Name</dt><dd className="font-medium">{name.trim() || "—"}</dd></div>
                <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Year / Term</dt><dd>{currentYear.name} / {defaultTerm?.name ?? "—"}</dd></div>
                <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Class</dt><dd>{classes.find((c) => c.id === classId)?.className ?? "—"}</dd></div>
                  <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Subjects</dt><dd>{subjects.map((s) => `${s.label}${s.teacherName ? ` (${s.teacherName})` : ""}`).join(", ")}</dd></div>
                  <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Sample</dt><dd>{stagedSample ? stagedSample.originalName : "None"}</dd></div>
              </dl>
            ) : null}

            {error ? (
              <p role="alert" className="text-sm text-destructive mt-4">{error}</p>
            ) : null}
            {pending ? (
              <p role="status" className="text-sm text-muted-foreground mt-2">Creating exam…</p>
            ) : null}
          </div>
        )}
      </Stepper>
    </div>
  );
}
