"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Stepper } from "@/components/ui/stepper";
import { FilePicker } from "@/components/ui/file-picker";
import { listAcademicTerms } from "@/lib/api/academic-years";
import { listClasses } from "@/lib/api/classes";
import { listClassSubjects } from "@/lib/api/subjects";
import { deleteStagedFile, uploadExamSample } from "@/lib/api/storage";
import type {
  ApiAcademicTerm,
  ApiAcademicYear,
  ApiExamType,
  ApiGradingScale,
  ApiSchoolClass,
  ApiClassSubject,
  CreateExamPayload,
  CreateExamSubjectPayload,
} from "@/lib/api/types";
import { academicErrorMessage } from "@/components/academics/academic-utils";

type SubjectRow = CreateExamSubjectPayload & { label: string; classId: string; className: string };

export function ExamWizardDialog({
  open,
  onOpenChange,
  types,
  scales,
  years,
  pending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  types: ApiExamType[];
  scales: ApiGradingScale[];
  years: ApiAcademicYear[];
  pending?: boolean;
  error?: string;
  onSubmit: (payload: CreateExamPayload) => void;
}) {
  const [step, setStep] = React.useState(0);
  const [examTypeId, setExamTypeId] = React.useState("");
  const [name, setName] = React.useState("");
  const [academicYearId, setAcademicYearId] = React.useState("");
  const [termId, setTermId] = React.useState("");
  const [startsOn, setStartsOn] = React.useState("");
  const [endsOn, setEndsOn] = React.useState("");
  const [subjects, setSubjects] = React.useState<SubjectRow[]>([]);
  const [sampleFile, setSampleFile] = React.useState<{ file: File; previewUrl?: string; path: string } | null>(null);
  const [stagedSample, setStagedSample] = React.useState<{ objectKey: string; originalName: string; size: number } | null>(null);
  const [uploadingSample, setUploadingSample] = React.useState(false);
  const [sampleError, setSampleError] = React.useState("");
  const [formError, setFormError] = React.useState("");
  const draftId = React.useMemo(() => crypto.randomUUID(), []);

  const [terms, setTerms] = React.useState<ApiAcademicTerm[]>([]);
  const [classes, setClasses] = React.useState<ApiSchoolClass[]>([]);
  const [classSubjects, setClassSubjects] = React.useState<ApiClassSubject[]>([]);
  const [classId, setClassId] = React.useState("");
  const [loadError, setLoadError] = React.useState("");

  const defaultScaleId = React.useMemo(
    () => scales.find((s) => s.isDefault)?.id ?? "",
    [scales],
  );

  React.useEffect(() => {
    if (!open) return;
    setStep(0);
    setExamTypeId("");
    setName("");
    setAcademicYearId("");
    setTermId("");
    setStartsOn("");
    setEndsOn("");
    setSubjects([]);
    setSampleFile(null);
    setStagedSample(null);
    setSampleError("");
    setFormError("");
    setTerms([]);
    setClasses([]);
    setClassSubjects([]);
    setClassId("");
    setLoadError("");
    listClasses({ page: 1, limit: 100 })
      .then((res) => setClasses(res.data))
      .catch((cause) => setLoadError(academicErrorMessage(cause, "Unable to load classes")));
  }, [open ]);

  React.useEffect(() => {
    if (!open || !academicYearId) {
      setTerms([]);
      return;
    }
    listAcademicTerms(academicYearId)
      .then(setTerms)
      .catch((cause) => setLoadError(academicErrorMessage(cause, "Unable to load terms")));
  }, [open, academicYearId]);

  React.useEffect(() => {
    if (!open || !classId) {
      setClassSubjects([]);
      return;
    }
    listClassSubjects(classId)
      .then(setClassSubjects)
      .catch((cause) => setLoadError(academicErrorMessage(cause, "Unable to load subjects")));
  }, [open, classId]);

  function addSubject(cs: ApiClassSubject) {
    if (subjects.some((s) => s.classSubjectId === cs.id)) return;
    const label =
      cs.subject?.name ??
      `Subject ${cs.subjectId.slice(0, 8)}`;
    setSubjects((current) => [
      ...current,
      {
        classSubjectId: cs.id,
        classId: cs.classId,
        className: cs.schoolClass?.className ?? classes.find((c) => c.id === cs.classId)?.className ?? "Class",
        label,
        maxMarks: 100,
        ...(defaultScaleId ? { gradingScaleId: defaultScaleId } : {}),
      },
    ]);
  }

  function updateSubject(index: number, patch: Partial<SubjectRow>) {
    setSubjects((current) => current.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

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

  const steps = [
    {
      id: "type",
      label: "Type",
      description: "Every exam is an instance of a reusable type.",
      validate: () => {
        if (!examTypeId) return "Select an exam type.";
        if (!name.trim()) return "Give the exam a name.";
        return true;
      },
    },
    {
      id: "term",
      label: "Term & Dates",
      description: "Tie the exam to an academic term and its date window.",
      validate: () => {
        if (!academicYearId) return "Select an academic year.";
        if (!termId) return "Select a term — exams cannot exist without one.";
        return validateDates();
      },
    },
    {
      id: "subjects",
      label: "Subjects",
      description: "Mix subjects from several classes — one exam row is created per class. Subjects can also be added later on the exam page.",
      validate: validateSubjects,
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

  function validateSubjects(): true | string {
    for (const s of subjects) {
      if (!(s.maxMarks > 0)) return `Max marks must be positive for ${s.label}.`;
      if (s.passingMarks != null && s.passingMarks > s.maxMarks) {
        return `Pass marks cannot exceed max marks for ${s.label}.`;
      }
    }
    return true;
  }

  function validateDates(): true | string {
    if (startsOn && endsOn && endsOn < startsOn) return "End date must be on or after the start date.";
    return true;
  }

  function handleComplete() {
    // Re-validate every step: the stepper only gates step-by-step navigation,
    // and the user can go back and change earlier answers.
    for (let i = 0; i < steps.length; i++) {
      const result = steps[i].validate?.();
      if (typeof result === "string") {
        setStep(i);
        setFormError(result);
        return;
      }
    }
    if (uploadingSample) {
      setFormError("Wait for the sample paper to finish uploading.");
      return;
    }
    setFormError("");
    const classIds = [...new Set(subjects.map((s) => s.classId))];
    onSubmit({
      academicYearId,
      termId,
      examTypeId,
      name: name.trim(),
      ...(startsOn ? { startsOn } : {}),
      ...(endsOn ? { endsOn } : {}),
      ...(classIds.length > 0 ? { classIds } : {}),
      ...(stagedSample
        ? {
            sample: {
              objectKey: stagedSample.objectKey,
              originalName: stagedSample.originalName,
              size: stagedSample.size,
            },
          }
        : {}),
      ...(subjects.length > 0
        ? {
            subjects: subjects.map((s) => ({
              classSubjectId: s.classSubjectId,
              ...(s.examDate ? { examDate: s.examDate } : {}),
              maxMarks: s.maxMarks,
              ...(s.passingMarks != null ? { passingMarks: s.passingMarks } : {}),
              ...(s.weight != null ? { weight: s.weight } : {}),
              ...(s.gradingScaleId ? { gradingScaleId: s.gradingScaleId } : {}),
            })),
          }
        : {}),
    });
  }

  const typeName = types.find((t) => t.id === examTypeId)?.name ?? "—";
  const yearName = years.find((y) => y.id === academicYearId)?.name ?? "—";
  const termName = terms.find((t) => t.id === termId)?.name ?? "—";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!pending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Exam</DialogTitle>
          <DialogDescription>Type → term and dates → subjects → sample → review.</DialogDescription>
        </DialogHeader>

        {loadError ? (
          <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {loadError}
          </p>
        ) : null}

        <Stepper steps={steps} active={step} onStepChange={setStep} onComplete={handleComplete}>
          {(active) => (
            <div>
              {active === 0 ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="wizard-type" className="text-sm font-medium">Exam type</label>
                    <Select value={examTypeId} onValueChange={setExamTypeId}>
                      <SelectTrigger><SelectValue placeholder="Select a type…" /></SelectTrigger>
                      <SelectContent>
                        {types.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="wizard-name" className="text-sm font-medium">Exam name</label>
                    <Input
                      id="wizard-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="e.g. Midterm 2026"
                      autoFocus
                    />
                  </div>
                </div>
              ) : null}

              {active === 1 ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="wizard-year" className="text-sm font-medium">Academic year</label>
                      <Select
                        value={academicYearId}
                        onValueChange={(v) => { setAcademicYearId(v); setTermId(""); }}
                      >
                        <SelectTrigger><SelectValue placeholder="Select a year…" /></SelectTrigger>
                        <SelectContent>
                          {years.map((y) => (
                            <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="wizard-term" className="text-sm font-medium">Term</label>
                      <Select value={termId} onValueChange={setTermId}>
                        <SelectTrigger><SelectValue placeholder={academicYearId ? "Select a term…" : "Select a year first"} /></SelectTrigger>
                        <SelectContent>
                          {terms.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="wizard-starts" className="text-sm font-medium">Starts on (optional)</label>
                      <Input
                        id="wizard-starts"
                        type="date"
                        value={startsOn}
                        onChange={(event) => setStartsOn(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="wizard-ends" className="text-sm font-medium">Ends on (optional)</label>
                      <Input
                        id="wizard-ends"
                        type="date"
                        value={endsOn}
                        onChange={(event) => setEndsOn(event.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              {active === 2 ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <span className="text-sm font-medium">Class</span>
                      <Select
                        value={classId}
                        onValueChange={(v) => setClassId(v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Select a class…" /></SelectTrigger>
                        <SelectContent>
                          {classes.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {classId ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Available subjects</p>
                      <p className="text-xs text-muted-foreground">
                        Switch classes to mix subjects — one exam row is created per class.
                      </p>
                      {classSubjects.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No subjects assigned to this class yet.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {classSubjects.map((cs) => {
                            const added = subjects.some((s) => s.classSubjectId === cs.id);
                            return (
                              <Button
                                key={cs.id}
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={added}
                                onClick={() => addSubject(cs)}
                              >
                                <Plus size={14} /> {cs.subject?.name ?? cs.subjectId.slice(0, 8)}
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
                          <div key={s.classSubjectId} className="grid grid-cols-[1fr_80px_80px_auto] gap-2 items-center rounded-lg border p-2">
                            <span className="text-sm font-medium truncate">
                              {s.label}
                              <span className="ml-1.5 rounded border px-1 py-px text-[11px] font-normal text-muted-foreground">
                                {s.className}
                              </span>
                            </span>
                            <Input
                              value={String(s.maxMarks)}
                              onChange={(event) => {
                                const v = Number(event.target.value);
                                updateSubject(i, { maxMarks: Number.isNaN(v) ? 0 : v });
                              }}
                              placeholder="Max"
                              inputMode="decimal"
                              aria-label={`${s.label} max marks`}
                            />
                            <Input
                              value={s.passingMarks != null ? String(s.passingMarks) : ""}
                              onChange={(event) => {
                                const raw = event.target.value.trim();
                                updateSubject(i, raw === "" ? { passingMarks: undefined } : { passingMarks: Number(raw) || 0 });
                              }}
                              placeholder="Pass"
                              inputMode="decimal"
                              aria-label={`${s.label} pass marks`}
                            />
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
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {active === 3 ? (
                <div className="space-y-2">
                  <FilePicker
                    id="wizard-sample"
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

              {active === 4 ? (
                <dl className="space-y-2 text-sm">
                  <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Type</dt><dd className="font-medium">{typeName}</dd></div>
                  <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Name</dt><dd className="font-medium">{name.trim() || "—"}</dd></div>
                  <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Year</dt><dd>{yearName}</dd></div>
                  <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Term</dt><dd>{termName}</dd></div>
                  <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Dates</dt><dd>{startsOn || "—"} → {endsOn || "—"}</dd></div>
                  <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Classes</dt><dd>{[...new Set(subjects.map((s) => s.className))].join(", ") || "None"}</dd></div>
                  <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Subjects</dt><dd>{subjects.length === 0 ? "None (add later on the exam page)" : subjects.map((s) => `${s.label} (${s.className})`).join(", ")}</dd></div>
                  <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Sample</dt><dd>{stagedSample ? stagedSample.originalName : "None"}</dd></div>
                </dl>
              ) : null}

              {error || formError ? (
                <p role="alert" className="text-sm text-destructive mt-4">{error || formError}</p>
              ) : null}
              {pending ? (
                <p role="status" className="text-sm text-muted-foreground mt-2">Creating exam…</p>
              ) : null}
            </div>
          )}
        </Stepper>
      </DialogContent>
    </Dialog>
  );
}
