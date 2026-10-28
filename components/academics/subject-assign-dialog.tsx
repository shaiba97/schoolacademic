"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ApiSubject, ApiTeacher } from "@/lib/api/types";
import { groupSubjectsForTrack } from "./subject-track-groups";

export type SubjectAssignmentValues = { subjectId: string; teacherId?: string };

const mobileMediaQuery = "(max-width: 639px)";

function subscribeToMobile(onStoreChange: () => void) {
  const media = window.matchMedia(mobileMediaQuery);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getMobileSnapshot() {
  return window.matchMedia(mobileMediaQuery).matches;
}

function getServerMobileSnapshot() {
  return false;
}

function teacherLabel(teacher: ApiTeacher) {
  return [teacher.user?.firstName, teacher.user?.lastName].filter(Boolean).join(" ") || teacher.employeeNumber || "Teacher";
}

export function SubjectAssignDialog({
  open,
  onOpenChange,
  subjects,
  assignedSubjectIds,
  teachers,
  onSubmit,
  pending,
  error,
  editing = null,
  track = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: ApiSubject[];
  assignedSubjectIds: Set<string>;
  teachers: ApiTeacher[];
  onSubmit: (values: SubjectAssignmentValues) => void | Promise<void>;
  pending: boolean;
  error: string;
  /** Update mode: subject locked, only the teacher changes. */
  editing?: { subjectId: string; teacherId?: string | null } | null;
  /** Class track for grouped subject options (SECOND/THIRD Secondary). Null = flat list. */
  track?: string | null;
}) {
  const [subjectId, setSubjectId] = React.useState(editing?.subjectId ?? "");
  const [teacherId, setTeacherId] = React.useState(editing?.teacherId ?? "");
  const [submitError, setSubmitError] = React.useState("");
  const isMobile = React.useSyncExternalStore(subscribeToMobile, getMobileSnapshot, getServerMobileSnapshot);

  const availableSubjects = React.useMemo(
    () => subjects.filter((subject) => !assignedSubjectIds.has(subject.id)),
    [subjects, assignedSubjectIds],
  );
  const subjectGroups = groupSubjectsForTrack(availableSubjects, track ?? null);
  const editingSubject = editing ? subjects.find((subject) => subject.id === editing.subjectId) : undefined;
  const selectedSubject = editingSubject ?? availableSubjects.find((subject) => subject.id === subjectId);
  const teacherOptions = React.useMemo(() => {
    if (!selectedSubject?.departmentId) return teachers;
    return teachers.filter((teacher) => teacher.departmentId === selectedSubject.departmentId);
  }, [selectedSubject, teachers]);

  const submit = async () => {
    if (pending || !subjectId) return;
    setSubmitError("");
    try {
      await onSubmit({ subjectId, teacherId: teacherId || undefined });
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : "Unable to assign subject");
    }
  };

  const visibleError = submitError || error;
  const dialogTitle = editing ? "Update subject teacher" : "Assign subject";
  const dialogDescription = editing
    ? "Change the teacher for this subject."
    : "Attach an existing subject to this class.";
  const submitLabel = pending ? (editing ? "Saving…" : "Assigning…") : editing ? "Save" : "Assign subject";
  const form = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="assign-subject">Subject *</Label>
        {editing ? (
          <p id="assign-subject" className="flex h-9 items-center text-sm font-medium">{editingSubject?.name ?? "Subject"}</p>
        ) : (
          <Select
            id="assign-subject"
            value={subjectId}
            onChange={(event) => {
              setSubjectId(event.target.value);
              setTeacherId("");
            }}
            disabled={pending || availableSubjects.length === 0}
          >
            {availableSubjects.length === 0 ? <option value="">No unassigned subjects</option> : <option value="">Select subject</option>}
            {subjectGroups.map((group) =>
              subjectGroups.length > 1 ? (
                <optgroup key={group.id} label={group.label}>
                  {group.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                </optgroup>
              ) : (
                group.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)
              ),
            )}
          </Select>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="assign-teacher">Teacher <span className="font-normal text-muted-foreground">(optional)</span></Label>
        <Select
          id="assign-teacher"
          value={teacherId}
          onChange={(event) => setTeacherId(event.target.value)}
          disabled={pending || !subjectId}
        >
          <option value="">{subjectId ? "No teacher" : "Select a subject first"}</option>
          {teacherOptions.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacherLabel(teacher)}</option>)}
        </Select>
        {subjectId && teacherOptions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No teacher in this subject&apos;s department — assign one on the Teachers page or continue without.</p>
        ) : null}
      </div>
      {visibleError ? <p role="alert" className="text-sm text-destructive">{visibleError}</p> : null}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
        <Button type="button" onClick={() => void submit()} disabled={pending || !subjectId}>{submitLabel}</Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>{dialogTitle}</SheetTitle>
            <SheetDescription>{dialogDescription}</SheetDescription>
          </SheetHeader>
          {form}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="p-6 pt-0">{form}</div>
      </DialogContent>
    </Dialog>
  );
}
