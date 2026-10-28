"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Paperclip, UserRound, Upload, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { EDUCATION_LEVELS, GRADE_LABELS, useLevelGradeTrack, type EducationLevel } from "@/components/academics/use-level-grade-track";
import { listAcademicYears } from "@/lib/api/academic-years";
import { listClasses } from "@/lib/api/classes";
import { listClassSubjects } from "@/lib/api/subjects";
import { listHalls } from "@/lib/api/halls";
import { assignExamRoom, createExam } from "@/lib/api/exams";
import { deleteStagedFile, uploadExamSample } from "@/lib/api/storage";
import { academicErrorMessage } from "@/components/academics/academic-utils";
import type { ApiAcademicYear, ApiClassSubject, ApiHall, ApiSchoolClass } from "@/lib/api/types";

type StagedSample = { objectKey: string; originalName: string; size: number };

type SubjectSelection = {
  cs: ApiClassSubject;
  maxMarks: string;
  passMarks: string;
};

function teacherDisplayName(cs: ApiClassSubject): string {
  const user = cs.teacher?.user;
  if (!user) return "";
  return [user.firstName, user.lastName].filter(Boolean).join(" ");
}

function trackLabel(c: ApiSchoolClass): string {
  return c.track ? ` · ${c.track}` : "";
}

export function CreateExamForm() {
  const router = useRouter();
  const cascade = useLevelGradeTrack();

  const [years, setYears] = React.useState<ApiAcademicYear[]>([]);
  const [classes, setClasses] = React.useState<ApiSchoolClass[]>([]);
  const [rooms, setRooms] = React.useState<ApiHall[]>([]);
  const [loadError, setLoadError] = React.useState("");

  const [name, setName] = React.useState("");
  const [classId, setClassId] = React.useState("");
  const [subjectsByClass, setSubjectsByClass] = React.useState<Record<string, ApiClassSubject[]>>({});
  const [subjects, setSubjects] = React.useState<SubjectSelection[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = React.useState<string[]>([]);

  const [previewFiles, setPreviewFiles] = React.useState<Record<string, File | null>>({});
  const [previewStaged, setPreviewStaged] = React.useState<Record<string, StagedSample>>({});
  const [previewBusy, setPreviewBusy] = React.useState<Record<string, boolean>>({});
  const [previewError, setPreviewError] = React.useState<Record<string, string>>({});

  const [pending, setPending] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  React.useEffect(() => {
    Promise.all([listAcademicYears({ page: 1, limit: 100 }), listClasses({ page: 1, limit: 100 }), listHalls()])
      .then(([y, c, r]) => {
        setYears(y.data);
        setClasses(c.data);
        setRooms(r);
      })
      .catch((cause) => setLoadError(academicErrorMessage(cause, "Reference data could not be loaded.")));
  }, []);

  const currentYear = React.useMemo(() => years.find((y) => y.isCurrent) ?? years[0], [years]);

  const availableClasses = React.useMemo(
    () =>
      classes.filter(
        (c) =>
          c.educationLevel === cascade.educationLevel &&
          c.grade === cascade.grade &&
          (cascade.needsTrack ? c.track === cascade.track : true),
      ),
    [classes, cascade.educationLevel, cascade.grade, cascade.needsTrack, cascade.track],
  );

  // "All classes of this grade" → the whole grade's subject catalog (union).
  // A real class → that class's assigned subjects only.
  const subjectSourceClasses = React.useMemo(
    () => (classId && classId !== "none" ? availableClasses.filter((c) => c.id === classId) : availableClasses),
    [classId, availableClasses],
  );

  React.useEffect(() => {
    if (availableClasses.length === 1 && !classId) {
      setClassId(availableClasses[0].id);
    }
  }, [availableClasses, classId]);

  React.useEffect(() => {
    setSubjects((current) =>
      current.filter((s) => subjectSourceClasses.some((c) => c.id === s.cs.classId)),
    );
  }, [subjectSourceClasses]);

  React.useEffect(() => {
    if (subjectSourceClasses.length === 0) {
      setSubjectsByClass({});
      return;
    }
    let cancelled = false;
    // Every class keeps its own subject list: the same subject under one grade
    // must appear once per class so each class builds its own exam subjects.
    Promise.all(subjectSourceClasses.map((c) => listClassSubjects(c.id).catch(() => [] as ApiClassSubject[])))
      .then((lists) => {
        if (cancelled) return;
        const groups: Record<string, ApiClassSubject[]> = {};
        subjectSourceClasses.forEach((c, index) => {
          groups[c.id] = lists[index].filter((cs) => cs.subject);
        });
        setSubjectsByClass(groups);
      })
      .catch((cause) => setFormError(academicErrorMessage(cause, "Unable to load the class subjects.")));
    return () => {
      cancelled = true;
    };
  }, [subjectSourceClasses]);

  const classSubjects = React.useMemo(
    () => Object.values(subjectsByClass).flat(),
    [subjectsByClass],
  );

  const allSelected = classSubjects.length > 0 && subjects.length === classSubjects.length;

  function toggleClassSubjects(targetClassId: string, checked: boolean) {
    const list = subjectsByClass[targetClassId] ?? [];
    if (!checked) {
      for (const cs of list) clearSubjectPreview(cs.id);
      setSubjects((current) => current.filter((s) => s.cs.classId !== targetClassId));
      return;
    }
    setSubjects((current) => {
      const keep = current.filter((s) => s.cs.classId !== targetClassId);
      const byId = new Map<string, SubjectSelection>();
      for (const cs of list) byId.set(cs.id, { cs, maxMarks: "100", passMarks: "50" });
      for (const s of current) if (s.cs.classId === targetClassId) byId.set(s.cs.id, s);
      return [...keep, ...Array.from(byId.values())];
    });
  }

  function toggleSubject(cs: ApiClassSubject, checked: boolean) {
    setSubjects((current) => {
      if (checked) {
        if (current.some((s) => s.cs.id === cs.id)) return current;
        return [...current, { cs, maxMarks: "100", passMarks: "50" }];
      }
      clearSubjectPreview(cs.id);
      return current.filter((s) => s.cs.id !== cs.id);
    });
  }

  function toggleAllSubjects(checked: boolean) {
    if (!checked) {
      for (const s of subjects) clearSubjectPreview(s.cs.id);
      setSubjects([]);
      return;
    }
    setSubjects(
      classSubjects
        .filter((cs) => cs.subject)
        .map((cs) => ({ cs, maxMarks: "100", passMarks: "50" })),
    );
  }

  function updateSubject(csId: string, patch: Partial<Pick<SubjectSelection, "maxMarks" | "passMarks">>) {
    setSubjects((current) => current.map((s) => (s.cs.id === csId ? { ...s, ...patch } : s)));
  }

  function toggleRoom(roomId: string, checked: boolean) {
    setSelectedRoomIds((current) =>
      checked ? [...current, roomId] : current.filter((id) => id !== roomId),
    );
  }

  async function attachSubjectPreview(cs: ApiClassSubject, file: File) {
    setPreviewFiles((current) => ({ ...current, [cs.id]: file }));
    setPreviewError((current) => ({ ...current, [cs.id]: "" }));
    setPreviewBusy((current) => ({ ...current, [cs.id]: true }));
    try {
      const previous = previewStaged[cs.id];
      if (previous) void deleteStagedFile(previous.objectKey).catch(() => undefined);
      const staged = await uploadExamSample({ file, draftId: crypto.randomUUID() });
      setPreviewStaged((current) => ({ ...current, [cs.id]: staged }));
    } catch (cause) {
      setPreviewFiles((current) => ({ ...current, [cs.id]: null }));
      setPreviewError((current) => ({
        ...current,
        [cs.id]: academicErrorMessage(cause, "The preview file could not be uploaded."),
      }));
    } finally {
      setPreviewBusy((current) => ({ ...current, [cs.id]: false }));
    }
  }

  function clearSubjectPreview(csId: string) {
    const staged = previewStaged[csId];
    if (staged) void deleteStagedFile(staged.objectKey).catch(() => undefined);
    setPreviewFiles((current) => ({ ...current, [csId]: null }));
    setPreviewStaged((current) => {
      const next = { ...current };
      delete next[csId];
      return next;
    });
    setPreviewError((current) => ({ ...current, [csId]: "" }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const validation = cascade.validate();
    if (validation) {
      setFormError(validation);
      return;
    }
    if (!name.trim()) {
      setFormError("Exam name is required.");
      return;
    }
    if (!currentYear) {
      setFormError("No active academic year — create one first.");
      return;
    }
    if (!classId) {
      setFormError("Select a class so subjects can be attached.");
      return;
    }
    if (subjects.length === 0) {
      setFormError("Select at least one subject for the exam.");
      return;
    }
    for (const s of subjects) {
      const max = Number(s.maxMarks);
      const pass = s.passMarks.trim() === "" ? null : Number(s.passMarks);
      if (!Number.isFinite(max) || max <= 0) {
        setFormError(`Max marks for ${s.cs.subject?.name ?? "subject"} must be a positive number.`);
        return;
      }
      if (pass != null && (!Number.isFinite(pass) || pass < 0)) {
        setFormError(`Pass marks for ${s.cs.subject?.name ?? "subject"} must be a number.`);
        return;
      }
      if (pass != null && pass > max) {
        setFormError(`Pass marks cannot exceed max marks for ${s.cs.subject?.name ?? "subject"}.`);
        return;
      }
    }
    setPending(true);
    setFormError("");
    try {
      const created = await createExam({
        name: name.trim(),
        academicYearId: currentYear.id,
        classIds: subjectSourceClasses.map((c) => c.id),
        subjects: subjects.map((s) => ({
          classSubjectId: s.cs.id,
          maxMarks: Number(s.maxMarks),
          ...(s.passMarks.trim() !== "" ? { passingMarks: Number(s.passMarks) } : {}),
          ...(previewStaged[s.cs.id] ? { sample: previewStaged[s.cs.id] } : {}),
        })),
      });
      const createdExam = Array.isArray(created) ? created[0] : created;
      const roomIdList = selectedRoomIds;
      for (const hallId of roomIdList) {
        await assignExamRoom(createdExam.id, { hallId }).catch(() => undefined);
      }
      router.push(`/exams/${createdExam.id}`);
    } catch (cause) {
      setFormError(academicErrorMessage(cause, "The exam could not be created."));
      setPending(false);
    }
  }

  if (loadError) {
    return (
      <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        {loadError}
      </div>
    );
  }

  const anyPreviewBusy = Object.values(previewBusy).some(Boolean);
  const submitting = pending || anyPreviewBusy;

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {/* Step 1 — identity */}
      <Card>
        <CardHeader>
          <CardTitle>Exam identity</CardTitle>
          <CardDescription>Name the exam and pick its level, grade, and class.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="exam-name">Exam name</Label>
            <Input
              id="exam-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First Term Final Examination"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Educational level</Label>
            <Select
              value={cascade.educationLevel}
              onValueChange={(v) => cascade.setEducationLevel(v as EducationLevel)}
            >
              <SelectTrigger aria-label="Educational level"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EDUCATION_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level === "SECONDARY" ? "Secondary" : "Intermediate"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Grade</Label>
            <Select value={cascade.grade} onValueChange={(v) => cascade.setGrade(v)}>
              <SelectTrigger aria-label="Grade"><SelectValue /></SelectTrigger>
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
              <Label>Track</Label>
              <Select value={cascade.track ?? ""} onValueChange={(v) => cascade.setTrack(v)}>
                <SelectTrigger aria-label="Track"><SelectValue placeholder="Select track…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ART">Art</SelectItem>
                  <SelectItem value="SCIENCE">Science</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>Class</Label>
            {availableClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No classes registered for this level/grade yet.</p>
            ) : (
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger aria-label="Class">
                  <SelectValue placeholder={availableClasses.length === 1 ? "All classes of this grade" : "Select class…"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All classes of this grade (auto)</SelectItem>
                  {availableClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.className}
                      {trackLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 2 — subjects, grouped per class */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Subjects</CardTitle>
              <CardDescription>
                Subjects are grouped per class — the same subject repeats for every class in the grade, and each class builds its own exam subject list.
              </CardDescription>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="size-4 rounded border"
                checked={allSelected}
                onChange={(e) => toggleAllSubjects(e.target.checked)}
                disabled={classSubjects.length === 0}
              />
              Select all
            </label>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {classSubjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {classId ? "No subjects assigned to the class yet." : "Pick a class to list its subjects."}
            </p>
          ) : (
            subjectSourceClasses.map((c) => {
              const list = subjectsByClass[c.id] ?? [];
              if (list.length === 0) return null;
              const sectionSelected =
                list.length > 0 && list.every((cs) => subjects.some((s) => s.cs.id === cs.id));
              return (
                <section key={c.id} className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-1.5">
                    <h3 className="flex flex-wrap items-baseline gap-2 text-sm font-semibold">
                      {c.className}
                      {trackLabel(c)}
                      <span className="text-xs font-normal text-muted-foreground">
                        {list.filter((cs) => subjects.some((s) => s.cs.id === cs.id)).length}/{list.length} selected
                      </span>
                    </h3>
                    <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <input
                        type="checkbox"
                        className="size-3.5 rounded border"
                        checked={sectionSelected}
                        onChange={(e) => toggleClassSubjects(c.id, e.target.checked)}
                      />
                      Select all for this class
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7">
                    {list.map((cs) => {
                      const selected = subjects.find((s) => s.cs.id === cs.id);
                      return (
                        <div
                          key={cs.id}
                          className={selected ? "rounded-lg border-2 border-primary bg-primary/5 p-2.5" : "rounded-lg border p-2.5"}
                        >
                    <label
                      className="flex min-h-9 items-start gap-2 text-sm font-medium"
                      title={cs.subject?.name ?? undefined}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4 shrink-0 rounded border"
                        checked={!!selected}
                        onChange={(e) => toggleSubject(cs, e.target.checked)}
                        aria-label={cs.subject?.name ?? "Subject"}
                      />
                      <span className="min-w-0 text-[13px] leading-snug">{cs.subject?.name ?? cs.subjectId}</span>
                    </label>
                    <p className="ms-6 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <UserRound size={11} aria-hidden />
                      {teacherDisplayName(cs) || "No teacher"}
                    </p>
                    {selected ? (
                      <div className="mt-2 space-y-2">
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label htmlFor={`max-${cs.id}`} className="mb-0.5 block text-[10px] font-medium text-muted-foreground">
                              Max
                            </label>
                            <Input
                              id={`max-${cs.id}`}
                              inputMode="numeric"
                              value={selected.maxMarks}
                              onChange={(e) => updateSubject(cs.id, { maxMarks: e.target.value })}
                              className="h-7 px-2 text-xs"
                              aria-label={`Max marks for ${cs.subject?.name ?? "subject"}`}
                            />
                          </div>
                          <div>
                            <label htmlFor={`pass-${cs.id}`} className="mb-0.5 block text-[10px] font-medium text-muted-foreground">
                              Pass
                            </label>
                            <Input
                              id={`pass-${cs.id}`}
                              inputMode="numeric"
                              value={selected.passMarks}
                              onChange={(e) => updateSubject(cs.id, { passMarks: e.target.value })}
                              className="h-7 px-2 text-xs"
                              aria-label={`Pass marks for ${cs.subject?.name ?? "subject"}`}
                            />
                          </div>
                        </div>
                        <div className="border-t pt-1.5">
                          {previewBusy[cs.id] ? (
                            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Loader2 size={11} className="animate-spin" aria-hidden /> Uploading preview…
                            </p>
                          ) : previewFiles[cs.id] ? (
                            <p className="flex min-w-0 items-center gap-1 text-[11px]">
                              <Paperclip size={11} className="shrink-0 text-muted-foreground" aria-hidden />
                              <span className="min-w-0 truncate">{previewFiles[cs.id]!.name}</span>
                              <button
                                type="button"
                                className="ms-auto shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={() => clearSubjectPreview(cs.id)}
                                aria-label={`Remove preview for ${cs.subject?.name ?? "subject"}`}
                              >
                                <X size={11} />
                              </button>
                            </p>
                          ) : (
                            <>
                              <label
                                htmlFor={`preview-${cs.id}`}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium hover:bg-muted/50"
                              >
                                <Upload size={11} aria-hidden /> Exam preview
                              </label>
                              <input
                                id={`preview-${cs.id}`}
                                type="file"
                                accept="application/pdf,image/*"
                                className="sr-only"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  e.target.value = "";
                                  if (file) void attachSubjectPreview(cs, file);
                                }}
                              />
                            </>
                          )}
                          {previewError[cs.id] ? (
                            <p role="alert" className="mt-1 text-[10px] text-destructive">
                              {previewError[cs.id]}
                            </p>
                          ) : null}
                        </div>
                      </div>
                        ) : null}
                      </div>
                    );
                  })}
                  </div>
                </section>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Step 3 — rooms */}
      <Card>
        <CardHeader>
          <CardTitle>Exam rooms</CardTitle>
          <CardDescription>Checkbox select one or more rooms — candidates are allocated across them.</CardDescription>
        </CardHeader>
        <CardContent>
          {rooms.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rooms registered yet — create rooms in the Room Wizard first.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((r) => (
                <label
                  key={r.id}
                  className="flex items-center gap-2 rounded-lg border p-3 text-sm font-medium"
                >
                  <input
                    type="checkbox"
                    className="size-4 rounded border"
                    checked={selectedRoomIds.includes(r.id)}
                    onChange={(e) => toggleRoom(r.id, e.target.checked)}
                  />
                  <span className="truncate">
                    {r.name}
                    {r.roomNumber ? <span className="text-muted-foreground"> · №{r.roomNumber}</span> : null}
                  </span>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sample file */}
      <p className="text-xs text-muted-foreground">
        Each selected subject can carry its own exam preview (PDF or image, max 10&nbsp;MB) — upload it in the subject's tile above.
      </p>

      {formError ? (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push("/exams")} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {pending ? (
            <>
              <Loader2 size={14} className="animate-spin" aria-hidden /> Creating exam…
            </>
          ) : (
            "Create exam"
          )}
        </Button>
      </div>
    </form>
  );
}
