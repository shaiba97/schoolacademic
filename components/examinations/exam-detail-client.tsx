"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Download, FileText, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { addExamSubject, publishExamResults, removeExamSubject, updateExam } from "@/lib/api/exams";
import { deleteStagedFile, downloadExamSampleFile, friendlyFileName, uploadExamSample } from "@/lib/api/storage";
import { RoomAssignmentsSection } from "@/components/examinations/room-assignments-section";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FilePicker } from "@/components/ui/file-picker";
import { listClasses } from "@/lib/api/classes";
import { listClassSubjects } from "@/lib/api/subjects";
import type {
  ApiExam,
  ApiExamSubject,
  ApiExamType,
  ApiGradingScale,
  ApiRoomAssignment,
  ApiSchoolClass,
  ApiClassSubject,
} from "@/lib/api/types";
import { academicErrorMessage } from "@/components/academics/academic-utils";

const EXAM_STATUS_OPTIONS: ReadonlyArray<readonly [string, string]> = [
  ["DRAFT", "Draft"],
  ["SCHEDULED", "Scheduled"],
  ["ONGOING", "Ongoing"],
  ["MARKS_OPEN", "Marks open"],
  ["MODERATION", "Moderation"],
  ["COMPLETED", "Completed"],
  ["PROCESSED", "Processed"],
  ["PUBLISHED", "Published"],
  ["CLOSED", "Closed"],
];

export function ExamDetailClient({
  exam,
  types,
  scales,
}: {
  exam: ApiExam;
  types: ApiExamType[];
  scales: ApiGradingScale[];
}) {
  const router = useRouter();
  const [subjects, setSubjects] = React.useState<ApiExamSubject[]>(exam.examSubjects ?? []);
  const [rooms, setRooms] = React.useState<ApiRoomAssignment[]>(exam.examRoomAssignments ?? []);
  const [tab, setTab] = React.useState("subjects");
  const [error, setError] = React.useState("");
  const [editOpen, setEditOpen] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ApiExamSubject | null>(null);
  const [pending, setPending] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [sampleBusy, setSampleBusy] = React.useState(false);
  const [sampleError, setSampleError] = React.useState("");
  const sampleDraftId = React.useMemo(() => crypto.randomUUID(), []);
  const [loadError, setLoadError] = React.useState("");

  // Exam status: local so select changes reflect instantly and revert on failure.
  const [status, setStatus] = React.useState(exam.status);
  const [statusBusy, setStatusBusy] = React.useState(false);
  const [statusError, setStatusError] = React.useState("");

  async function handleStatusChange(next: string) {
    if (next === status) return;
    setStatusBusy(true);
    setStatusError("");
    try {
      // PUBLISHED goes through the dedicated publish route so publishedAt
      // and its side effects stay intact; everything else is a plain PUT.
      if (next === "PUBLISHED") {
        await publishExamResults(exam.id);
      } else {
        await updateExam(exam.id, { status: next });
      }
      setStatus(next);
    } catch (cause) {
      setStatusError(academicErrorMessage(cause, "Unable to change the exam status"));
    } finally {
      setStatusBusy(false);
    }
  }

  const [editName, setEditName] = React.useState(exam.name);
  const [editTypeId, setEditTypeId] = React.useState(exam.examTypeId ?? "");
  const [editStartsOn, setEditStartsOn] = React.useState(exam.startsOn?.slice(0, 10) ?? "");
  const [editEndsOn, setEditEndsOn] = React.useState(exam.endsOn?.slice(0, 10) ?? "");

  const [classes, setClasses] = React.useState<ApiSchoolClass[]>([]);
  const [classSubjects, setClassSubjects] = React.useState<ApiClassSubject[]>([]);
  const [classId, setClassId] = React.useState("");
  const [pickedId, setPickedId] = React.useState("");
  const [maxMarks, setMaxMarks] = React.useState("100");
  const [passingMarks, setPassingMarks] = React.useState("");
  const [scaleId, setScaleId] = React.useState("");

  React.useEffect(() => {
    if (!addOpen) return;
    setLoadError("");
    listClasses({ page: 1, limit: 100 })
      .then((res) => setClasses(res.data))
      .catch((cause) => setLoadError(academicErrorMessage(cause, "Unable to load classes")));
  }, [addOpen]);

  React.useEffect(() => {
    if (!addOpen || !classId) {
      setClassSubjects([]);
      return;
    }
    listClassSubjects(classId)
      .then(setClassSubjects)
      .catch((cause) => setLoadError(academicErrorMessage(cause, "Unable to load subjects")));
  }, [addOpen, classId]);

  async function handleEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editName.trim()) return;
    if (editStartsOn && editEndsOn && editEndsOn < editStartsOn) {
      setFormError("End date must be on or after the start date.");
      return;
    }
    setPending(true);
    setFormError("");
    try {
      await updateExam(exam.id, {
        name: editName.trim(),
        ...(editTypeId ? { examTypeId: editTypeId } : {}),
        ...(editStartsOn ? { startsOn: editStartsOn } : {}),
        ...(editEndsOn ? { endsOn: editEndsOn } : {}),
      });
      router.refresh();
      setEditOpen(false);
    } catch (cause) {
      setFormError(academicErrorMessage(cause, "Unable to update exam"));
    } finally {
      setPending(false);
    }
  }

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!pickedId) return;
    const max = Number(maxMarks);
    if (Number.isNaN(max) || max <= 0) {
      setFormError("Max marks must be a positive number.");
      return;
    }
    const pass = passingMarks.trim() ? Number(passingMarks) : null;
    if (pass != null && (Number.isNaN(pass) || pass < 0)) {
      setFormError("Pass marks must be a number.");
      return;
    }
    if (pass != null && pass > max) {
      setFormError("Pass marks cannot exceed max marks.");
      return;
    }
    setPending(true);
    setFormError("");
    try {
      const added = await addExamSubject(exam.id, {
        classSubjectId: pickedId,
        maxMarks: max,
        ...(pass != null ? { passingMarks: pass } : {}),
        ...(scaleId ? { gradingScaleId: scaleId } : {}),
      });
      setSubjects((current) => [...current, added]);
      setAddOpen(false);
      setPickedId("");
      router.refresh();
    } catch (cause) {
      setFormError(academicErrorMessage(cause, "Unable to add subject"));
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setPending(true);
    setError("");
    try {
      await removeExamSubject(exam.id, deleteTarget.id);
      setSubjects((current) => current.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
      router.refresh();
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to remove subject"));
      setDeleteTarget(null);
    } finally {
      setPending(false);
    }
  }

  function subjectLabel(s: ApiExamSubject) {
    return s.classSubject?.subject?.name ?? "Subject";
  }

  const authorLabel = exam.author
    ? [exam.author.firstName, exam.author.lastName].filter(Boolean).join(" ")
    : "";
  const roomLocked = rooms.length > 0;

function sampleFileName() {
  return friendlyFileName(exam.sampleObjectKey ?? "", "sample.pdf");
}

  async function handleSamplePick(value: { file: File; previewUrl?: string; path: string } | null) {
    if (!value) return;
    setSampleBusy(true);
    setSampleError("");
    let staged: string | null = null;
    try {
      const stored = await uploadExamSample({ file: value.file, draftId: sampleDraftId });
      staged = stored.objectKey;
      await updateExam(exam.id, {
        sample: { objectKey: stored.objectKey, originalName: stored.originalName, size: stored.size },
      });
      router.refresh();
    } catch (cause) {
      if (staged) await deleteStagedFile(staged).catch(() => undefined);
      setSampleError(academicErrorMessage(cause, "Unable to attach sample paper"));
    } finally {
      setSampleBusy(false);
    }
  }

  async function handleSampleRemove() {
    setSampleBusy(true);
    setSampleError("");
    try {
      await updateExam(exam.id, { sample: null });
      router.refresh();
    } catch (cause) {
      setSampleError(academicErrorMessage(cause, "Unable to remove sample paper"));
    } finally {
      setSampleBusy(false);
    }
  }

  async function handleSampleDownload() {
    if (!exam.sampleObjectKey) return;
    setSampleBusy(true);
    setSampleError("");
    try {
      await downloadExamSampleFile(exam.sampleObjectKey);
    } catch (cause) {
      setSampleError(academicErrorMessage(cause, "Unable to download sample paper"));
    } finally {
      setSampleBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card>
        <CardContent className="p-6">
          <nav className="flex items-center gap-1.5 mb-5 text-sm text-muted-foreground" aria-label="Breadcrumb">
            <Link href="/examinations" className="hover:text-foreground">Examination Center</Link>
            <ChevronRight size={14} />
            <Link href="/examinations/exam-setup" className="hover:text-foreground">Exams</Link>
            <ChevronRight size={14} />
            <span className="text-foreground font-medium truncate">{exam.name}</span>
          </nav>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold tracking-tight">{exam.name}</h1>
              <p className="text-sm text-muted-foreground mt-2 flex flex-wrap gap-2 items-center">
                {exam.examType ? <Badge variant="outline">{exam.examType.name}</Badge> : null}
                <Badge variant={status === "PUBLISHED" ? "success" : status === "DRAFT" ? "muted" : "secondary"}>
                  {status}
                </Badge>
                <span className="inline-flex items-center gap-1">
                  {statusBusy ? <Loader2 size={12} className="animate-spin" aria-hidden /> : null}
                  <Select
                    value={status}
                    onValueChange={(v) => void handleStatusChange(v)}
                    disabled={statusBusy}
                  >
                    <SelectTrigger className="h-6 px-2 text-xs" aria-label="Change exam status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXAM_STATUS_OPTIONS.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </span>
                <Badge variant="secondary">{subjects.length} subject{subjects.length === 1 ? "" : "s"}</Badge>
                {exam.examGroupId ? (
                  <Badge variant="outline" title="Created together with one row per class">Grouped</Badge>
                ) : null}
                {authorLabel ? (
                  <Badge variant="outline" title="Exam author">By {authorLabel}</Badge>
                ) : null}
                {roomLocked ? (
                  <Badge variant="secondary" title="Rooms are assigned — subjects can no longer change">Room-locked</Badge>
                ) : null}
              </p>
              {statusError ? (
                <p role="alert" className="mt-2 text-xs text-destructive">{statusError}</p>
              ) : null}
              <p className="text-xs text-muted-foreground mt-1">
                {exam.startsOn?.slice(0, 10) ?? "—"} → {exam.endsOn?.slice(0, 10) ?? "—"}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => { setFormError(""); setEditOpen(true); }}>
                <Pencil size={14} /> Edit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Reference Sample Paper</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sampleError ? (
            <p role="alert" className="text-sm text-destructive">{sampleError}</p>
          ) : null}
          {exam.sampleObjectKey ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
              <span className="inline-flex size-10 items-center justify-center rounded-lg border bg-muted shrink-0">
                <FileText size={16} className="text-muted-foreground" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{sampleFileName()}</p>
                <p className="text-xs text-muted-foreground">PDF reference attached to this exam</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => void handleSampleDownload()} disabled={sampleBusy}>
                <Download size={14} /> {sampleBusy ? "Working…" : "Download"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => void handleSampleRemove()} disabled={sampleBusy}>
                <Trash2 size={14} />
              </Button>
            </div>
          ) : null}
          <FilePicker
            id="exam-sample"
            label={exam.sampleObjectKey ? "Replace sample paper" : "Attach sample paper"}
            accept="application/pdf"
            maxSizeMB={10}
            value={null}
            onChange={(value) => void handleSamplePick(value)}
            helperText="PDF only, max 10MB. Picking a file uploads and attaches it immediately."
            error={undefined}
          />
          {sampleBusy ? (
            <p role="status" className="text-xs text-muted-foreground">Working on the sample paper…</p>
          ) : null}
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="rooms">Rooms{roomLocked ? ` (${rooms.length})` : ""}</TabsTrigger>
        </TabsList>
        <TabsContent value="subjects">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <CardTitle className="text-sm">Exam Subjects</CardTitle>
            <Button type="button" size="sm" onClick={() => { setFormError(""); setPickedId(""); setAddOpen(true); }} disabled={roomLocked} title={roomLocked ? "Rooms are assigned — subjects are locked" : undefined}>
              <Plus size={14} /> Add Subject
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {subjects.length === 0 ? (
            <EmptyState
              title="No subjects configured"
              description="Marks entry stays blocked until this exam has at least one subject. Add the first one to unlock scheduling and marks."
            />
          ) : (
            <div className="space-y-2">
              {subjects.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{subjectLabel(s)}</p>
                    <p className="text-xs text-muted-foreground">
                      Max {String(s.maxMarks)}
                      {s.passingMarks != null ? ` · Pass ${String(s.passingMarks)}` : ""}
                      {s.gradingScale ? ` · ${s.gradingScale.name}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { if (!pending) setDeleteTarget(s); }}
                    disabled={roomLocked}
                    title={roomLocked ? "Rooms are assigned — subjects are locked" : undefined}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>
        <TabsContent value="rooms">
          <RoomAssignmentsSection examId={exam.id} subjects={subjects} rooms={rooms} onRoomsChange={setRooms} />
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={(o) => { if (!pending) setEditOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit exam</DialogTitle>
            <DialogDescription>Rename, retarget, or reschedule this exam.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(event) => void handleEdit(event)}>
            <div className="space-y-2">
              <label htmlFor="exam-edit-name" className="text-sm font-medium">Name</label>
              <Input id="exam-edit-name" value={editName} onChange={(event) => setEditName(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Type</span>
              <Select value={editTypeId} onValueChange={setEditTypeId}>
                <SelectTrigger><SelectValue placeholder="Select a type…" /></SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="exam-edit-starts" className="text-sm font-medium">Starts on</label>
                <Input id="exam-edit-starts" type="date" value={editStartsOn} onChange={(event) => setEditStartsOn(event.target.value)} />
              </div>
              <div className="space-y-2">
                <label htmlFor="exam-edit-ends" className="text-sm font-medium">Ends on</label>
                <Input id="exam-edit-ends" type="date" value={editEndsOn} onChange={(event) => setEditEndsOn(event.target.value)} />
              </div>
            </div>
            {formError ? (
              <p role="alert" className="text-sm text-destructive">{formError}</p>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !editName.trim()}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={(o) => { if (!pending) setAddOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add subject</DialogTitle>
            <DialogDescription>Pick a section subject and its marks configuration.</DialogDescription>
          </DialogHeader>
          {loadError ? (
            <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {loadError}
            </p>
          ) : null}
          <form className="space-y-4" onSubmit={(event) => void handleAdd(event)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <span className="text-sm font-medium">Class</span>
                <Select value={classId} onValueChange={(v) => { setClassId(v); setPickedId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Subject</span>
              <Select value={pickedId} onValueChange={setPickedId}>
                <SelectTrigger><SelectValue placeholder={classId ? "Select…" : "Class first"} /></SelectTrigger>
                <SelectContent>
                  {classSubjects.map((cs) => (
                    <SelectItem key={cs.id} value={cs.id}>
                      {cs.subject?.name ?? cs.subjectId.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="add-max" className="text-sm font-medium">Max marks</label>
                <Input id="add-max" value={maxMarks} onChange={(event) => setMaxMarks(event.target.value)} inputMode="decimal" required />
              </div>
              <div className="space-y-2">
                <label htmlFor="add-pass" className="text-sm font-medium">Pass marks (optional)</label>
                <Input id="add-pass" value={passingMarks} onChange={(event) => setPassingMarks(event.target.value)} inputMode="decimal" />
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Grading scale (optional)</span>
              <Select value={scaleId} onValueChange={setScaleId}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {scales.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formError ? (
              <p role="alert" className="text-sm text-destructive">{formError}</p>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !pickedId}>
                {pending ? "Adding…" : "Add subject"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !pending) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove subject?</AlertDialogTitle>
            <AlertDialogDescription>
              This exam subject will be removed. Subjects with entered marks cannot be removed — delete the marks first.
              Subjects are also locked while rooms are assigned — remove the rooms first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>
              {pending ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
