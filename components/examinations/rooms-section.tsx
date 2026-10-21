"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Pencil, Plus, Printer, Trash2, TriangleAlert, Users } from "lucide-react";
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
import {
  assignDuty,
  createSlot,
  deleteSlot,
  listExamSlots,
  listSlotSeats,
  removeDuty,
  setSlotSeats,
  slotsOverlap,
  updateSlot,
  type CreateSlotPayload,
} from "@/lib/api/scheduling";
import { createHall, listHalls } from "@/lib/api/halls";
import { listTeachers, fullName } from "@/lib/api/teachers";
import { listEnrollments } from "@/lib/api/students";
import type {
  ApiEnrollmentRecord,
  ApiExamSubject,
  ApiHall,
  ApiTeacher,
  ApiTimetableSlot,
} from "@/lib/api/types";
import { academicErrorMessage } from "@/components/academics/academic-utils";

function slotLabel(slot: ApiTimetableSlot) {
  return slot.examSubject?.classSubject?.subject?.name ?? "Subject";
}

function dutyTeacherName(slot: ApiTimetableSlot): string {
  const duty = slot.invigilationDuties?.[0];
  const user = duty?.teacher?.user;
  if (!user) return "";
  return [user.firstName, user.lastName].filter(Boolean).join(" ");
}

function findOverlaps(
  teacherId: string,
  candidate: { date: string; startTime: string; endTime: string },
  slots: ApiTimetableSlot[],
  excludeSlotId?: string,
): ApiTimetableSlot[] {
  return slots.filter(
    (s) =>
      s.id !== excludeSlotId &&
      (s.invigilationDuties ?? []).some((d) => d.teacherId === teacherId) &&
      slotsOverlap(candidate, { date: s.date, startTime: s.startTime, endTime: s.endTime }),
  );
}

export function RoomsSection({ examId, subjects }: { examId: string; subjects: ApiExamSubject[] }) {
  const router = useRouter();
  const [slots, setSlots] = React.useState<ApiTimetableSlot[]>([]);
  const [halls, setHalls] = React.useState<ApiHall[]>([]);
  const [teachers, setTeachers] = React.useState<ApiTeacher[]>([]);
  const [enrollments, setEnrollments] = React.useState<ApiEnrollmentRecord[]>([]);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [addOpen, setAddOpen] = React.useState(false);
  const [editingSlot, setEditingSlot] = React.useState<ApiTimetableSlot | null>(null);
  const [seatsSlot, setSeatsSlot] = React.useState<ApiTimetableSlot | null>(null);
  const [dutySlot, setDutySlot] = React.useState<ApiTimetableSlot | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ApiTimetableSlot | null>(null);
  const [pending, setPending] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [s, h, t, e] = await Promise.all([
        listExamSlots(examId),
        listHalls(),
        listTeachers({ page: 1, limit: 100 }),
        listEnrollments(),
      ]);
      setSlots(s);
      setHalls(h);
      setTeachers(t.data);
      setEnrollments(e);
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to load rooms"));
    } finally {
      setLoading(false);
    }
  }, [examId]);

  React.useEffect(() => {
    void load();
  }, [load ]);

  async function refreshSlots() {
    try {
      setSlots(await listExamSlots(examId));
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to refresh rooms"));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setPending(true);
    try {
      await deleteSlot(deleteTarget.id);
      setSlots((current) => current.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to delete room"));
      setDeleteTarget(null);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap gap-3 justify-between items-center">
          <CardTitle className="text-sm">Exam Rooms</CardTitle>
          <Button
            type="button"
            size="sm"
            onClick={() => setAddOpen(true)}
            disabled={subjects.length === 0}
            title={subjects.length === 0 ? "Add an exam subject first" : undefined}
          >
            <Plus size={14} /> Add Room
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <span>{error}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              Retry
            </Button>
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-16 w-full" />
          </div>
        ) : slots.length === 0 ? (
          <EmptyState
            title="No rooms assigned"
            description="Scheduling and marks entry stay gated until at least one room exists. Add the first room to unlock them."
            action={subjects.length > 0 ? { label: "Add Room", onClick: () => setAddOpen(true) } : undefined}
          />
        ) : (
          <div className="space-y-2">
            {slots.map((slot) => {
              const seatCount = slot._count?.seatAssignments ?? 0;
              const teacher = dutyTeacherName(slot);
              return (
                <div key={slot.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CalendarDays size={14} className="text-muted-foreground" aria-hidden />
                    <span className="text-sm font-medium">{slotLabel(slot)}</span>
                    <Badge variant="outline">
                      {slot.date.slice(0, 10)} · {slot.startTime}–{slot.endTime}
                    </Badge>
                    {slot.hall ? (
                      <Badge variant="secondary">{slot.hall.name}</Badge>
                    ) : (
                      <Badge variant="muted">No hall</Badge>
                    )}
                    <Badge variant="outline">
                      <Users size={12} className="mr-1" aria-hidden />
                      {seatCount} seated
                    </Badge>
                    {teacher ? (
                      <Badge variant="outline">{teacher}</Badge>
                    ) : (
                      <Badge variant="muted">No invigilator</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {slot.hallId ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/examinations/exam-setup/${examId}/rooms/${slot.hallId}`)}
                      >
                        <Printer size={14} /> Print card
                      </Button>
                    ) : null}
                    <Button type="button" variant="outline" size="sm" onClick={() => setSeatsSlot(slot)} disabled={!slot.hallId}>
                      Seats
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setDutySlot(slot)}>
                      {teacher ? "Invigilator" : "Assign invigilator"}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditingSlot(slot)}>
                      <Pencil size={14} /> Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteTarget(slot)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <AddRoomDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        examId={examId}
        subjects={subjects}
        halls={halls}
        teachers={teachers}
        enrollments={enrollments}
        slots={slots}
        onHallsChange={setHalls}
        onCreated={() => void refreshSlots()}
      />

      {editingSlot ? (
        <EditSlotDialog
          slot={editingSlot}
          halls={halls}
          onClose={() => setEditingSlot(null)}
          onSaved={() => { setEditingSlot(null); void refreshSlots(); }}
        />
      ) : null}

      {seatsSlot ? (
        <SeatsDialog
          slot={seatsSlot}
          enrollments={enrollments}
          onClose={() => setSeatsSlot(null)}
          onSaved={() => { setSeatsSlot(null); void refreshSlots(); }}
        />
      ) : null}

      {dutySlot ? (
        <DutyDialog
          slot={dutySlot}
          teachers={teachers}
          slots={slots}
          onClose={() => setDutySlot(null)}
          onSaved={() => { setDutySlot(null); void refreshSlots(); }}
        />
      ) : null}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !pending) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete room?</AlertDialogTitle>
            <AlertDialogDescription>
              This session, its seat assignments, and its invigilation duties will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>
              {pending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function AddRoomDialog({
  open,
  onOpenChange,
  examId,
  subjects,
  halls,
  teachers,
  enrollments,
  slots,
  onHallsChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: string;
  subjects: ApiExamSubject[];
  halls: ApiHall[];
  teachers: ApiTeacher[];
  enrollments: ApiEnrollmentRecord[];
  slots: ApiTimetableSlot[];
  onHallsChange: (halls: ApiHall[]) => void;
  onCreated: () => void;
}) {
  const [subjectId, setSubjectId] = React.useState("");
  const [date, setDate] = React.useState("");
  const [startTime, setStartTime] = React.useState("09:00");
  const [endTime, setEndTime] = React.useState("11:00");
  const [hallId, setHallId] = React.useState("");
  const [newHallMode, setNewHallMode] = React.useState(false);
  const [newHallName, setNewHallName] = React.useState("");
  const [newHallCapacity, setNewHallCapacity] = React.useState("30");
  const [teacherId, setTeacherId] = React.useState("");
  const [selectedStudents, setSelectedStudents] = React.useState<string[]>([]);
  const [pending, setPending] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setSubjectId("");
    setDate("");
    setStartTime("09:00");
    setEndTime("11:00");
    setHallId("");
    setNewHallMode(false);
    setNewHallName("");
    setNewHallCapacity("30");
    setTeacherId("");
    setSelectedStudents([]);
    setFormError("");
  }, [open ]);

  const classId = subjects.find((s) => s.id === subjectId)?.classSubject?.classId ?? "";
  const candidates = React.useMemo(
    () => enrollments.filter((e) => e.schoolClass?.id === classId),
    [enrollments, classId],
  );

  React.useEffect(() => {
    setSelectedStudents(candidates.map((e) => e.student.id));
  }, [candidates]);

  const resolvedHall = halls.find((h) => h.id === hallId);
  const overlaps = teacherId
    ? findOverlaps(teacherId, { date, startTime, endTime }, slots)
    : [];

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");
    if (!subjectId) {
      setFormError("Select an exam subject.");
      return;
    }
    if (!date) {
      setFormError("Pick a session date.");
      return;
    }
    if (selectedStudents.length === 0) {
      setFormError("Select at least one student — a room with zero students is meaningless.");
      return;
    }
    if (!teacherId) {
      setFormError("Assign an invigilator.");
      return;
    }
    setPending(true);
    try {
      let hall: ApiHall | undefined = resolvedHall;
      if (newHallMode || !hall) {
        if (!newHallMode) {
          setFormError("Select a hall or create a new one.");
          setPending(false);
          return;
        }
        if (!newHallName.trim()) {
          setFormError("Give the new hall a name.");
          setPending(false);
          return;
        }
        const capacity = Number(newHallCapacity);
        if (Number.isNaN(capacity) || capacity < 1) {
          setFormError("Hall capacity must be at least 1.");
          setPending(false);
          return;
        }
        hall = await createHall({ name: newHallName.trim(), capacity });
        onHallsChange([...halls, hall]);
      }
      const payload: CreateSlotPayload = {
        examSubjectId: subjectId,
        date,
        startTime,
        endTime,
        hallId: (hall as ApiHall).id,
      };
      const slot = await createSlot(examId, payload);
      try {
        await setSlotSeats(slot.id, { hallId: (hall as ApiHall).id, studentIds: selectedStudents });
      } catch (cause) {
        throw new Error(
          `Room created, but seating failed: ${academicErrorMessage(cause, "unknown error")}. Use Seats to retry.`,
        );
      }
      try {
        await assignDuty(slot.id, { teacherId, hallId: (hall as ApiHall).id });
      } catch (cause) {
        throw new Error(
          `Room and seats saved, but invigilator assignment failed: ${academicErrorMessage(cause, "unknown error")}. Use Invigilator to retry.`,
        );
      }
      onOpenChange(false);
      onCreated();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : academicErrorMessage(cause, "Unable to add room"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!pending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Room</DialogTitle>
          <DialogDescription>Session, hall, invigilator, and students — saved step by step.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2">
            <span className="text-sm font-medium">Exam subject</span>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.classSubject?.subject?.name ?? "Subject"}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="room-date" className="text-sm font-medium">Date</label>
              <Input id="room-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <label htmlFor="room-start" className="text-sm font-medium">Start</label>
              <Input id="room-start" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <label htmlFor="room-end" className="text-sm font-medium">End</label>
              <Input id="room-end" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">Hall</span>
            {!newHallMode ? (
              <Select value={hallId} onValueChange={setHallId}>
                <SelectTrigger><SelectValue placeholder="Select a hall…" /></SelectTrigger>
                <SelectContent>
                  {halls.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name} · cap {h.capacity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            {!newHallMode ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setNewHallMode(true)}>
                <Plus size={14} /> New hall instead
              </Button>
            ) : (
              <div className="grid gap-2 sm:grid-cols-[1fr_100px_auto] items-end rounded-lg border p-2">
                <div className="space-y-1">
                  <label htmlFor="new-hall-name" className="text-xs font-medium">Hall name</label>
                  <Input id="new-hall-name" value={newHallName} onChange={(event) => setNewHallName(event.target.value)} placeholder="e.g. Room 4" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="new-hall-cap" className="text-xs font-medium">Capacity</label>
                  <Input id="new-hall-cap" value={newHallCapacity} onChange={(event) => setNewHallCapacity(event.target.value)} inputMode="numeric" />
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setNewHallMode(false)}>
                  Use list
                </Button>
              </div>
            )}
            {resolvedHall && selectedStudents.length > resolvedHall.capacity ? (
              <p role="note" className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
                <TriangleAlert size={12} className="inline mr-1" aria-hidden />
                {selectedStudents.length} students exceed {resolvedHall.name} capacity ({resolvedHall.capacity}).
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">Invigilator</span>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger><SelectValue placeholder="Select a teacher…" /></SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{fullName(t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {overlaps.length > 0 ? (
              <p role="note" className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
                <TriangleAlert size={12} className="inline mr-1" aria-hidden />
                Already on duty in {overlaps.length} overlapping session{overlaps.length === 1 ? "" : "s"} that day — allowed, flagged for review.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">
              Students ({selectedStudents.length}
              {candidates.length > 0 ? ` of ${candidates.length} enrolled` : ""})
            </p>
            {candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {subjectId ? "No enrollments found for this class — pick students after choosing a subject with enrollments, or add them here once enrolled." : "Select a subject to load its enrolled students."}
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-lg border divide-y">
                {candidates.map((e) => {
                  const checked = selectedStudents.includes(e.student.id);
                  return (
                    <label key={e.student.id} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedStudents((current) =>
                            checked ? current.filter((id) => id !== e.student.id) : [...current, e.student.id],
                          )
                        }
                        className="size-4 accent-primary"
                      />
                      <span className="flex-1 truncate">
                        {e.student.firstName} {e.student.lastName ?? ""}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">{e.student.roleNumber}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {formError ? (
            <p role="alert" className="text-sm text-destructive">{formError}</p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Add room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditSlotDialog({
  slot,
  halls,
  onClose,
  onSaved,
}: {
  slot: ApiTimetableSlot;
  halls: ApiHall[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = React.useState(slot.date.slice(0, 10));
  const [startTime, setStartTime] = React.useState(slot.startTime);
  const [endTime, setEndTime] = React.useState(slot.endTime);
  const [hallId, setHallId] = React.useState(slot.hallId ?? "");
  const [pending, setPending] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setFormError("");
    try {
      await updateSlot(slot.id, {
        date,
        startTime,
        endTime,
        hallId: hallId === "" ? null : hallId,
      });
      onSaved();
    } catch (cause) {
      setFormError(academicErrorMessage(cause, "Unable to update room"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!pending && !o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit room</DialogTitle>
          <DialogDescription>Session time and hall assignment.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2">
            <label htmlFor="edit-slot-date" className="text-sm font-medium">Date</label>
            <Input id="edit-slot-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="edit-slot-start" className="text-sm font-medium">Start</label>
              <Input id="edit-slot-start" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-slot-end" className="text-sm font-medium">End</label>
              <Input id="edit-slot-end" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium">Hall</span>
            <Select value={hallId} onValueChange={setHallId}>
              <SelectTrigger><SelectValue placeholder="No hall" /></SelectTrigger>
              <SelectContent>
                {halls.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name} · cap {h.capacity}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {formError ? (
            <p role="alert" className="text-sm text-destructive">{formError}</p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SeatsDialog({
  slot,
  enrollments,
  onClose,
  onSaved,
}: {
  slot: ApiTimetableSlot;
  enrollments: ApiEnrollmentRecord[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    listSlotSeats(slot.id)
      .then((rows) => {
        if (!cancelled) {
          setSelected(rows.map((r) => r.studentId));
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [slot.id]);

  const classId = slot.examSubject?.classSubject?.classId ?? "";
  const candidates = React.useMemo(
    () => enrollments.filter((e) => e.schoolClass?.id === classId),
    [enrollments, classId],
  );

  async function handleSave() {
    if (!slot.hallId) {
      setFormError("Assign a hall to this room first (Edit).");
      return;
    }
    if (selected.length === 0) {
      setFormError("Select at least one student — a room with zero students is meaningless.");
      return;
    }
    setPending(true);
    setFormError("");
    try {
      await setSlotSeats(slot.id, { hallId: slot.hallId, studentIds: selected });
      onSaved();
    } catch (cause) {
      setFormError(academicErrorMessage(cause, "Unable to save seats"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!pending && !o) onClose(); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seats ({selected.length})</DialogTitle>
          <DialogDescription>Checked students sit this session in {slot.hall?.name ?? "the assigned hall"}.</DialogDescription>
        </DialogHeader>
        {!loaded ? (
          <p role="status" className="text-sm text-muted-foreground">Loading current seats…</p>
        ) : candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No enrollments found for this class.</p>
        ) : (
          <div className="max-h-64 overflow-y-auto rounded-lg border divide-y">
            {candidates.map((e) => {
              const checked = selected.includes(e.student.id);
              return (
                <label key={e.student.id} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setSelected((current) =>
                        checked ? current.filter((id) => id !== e.student.id) : [...current, e.student.id],
                      )
                    }
                    className="size-4 accent-primary"
                  />
                  <span className="flex-1 truncate">
                    {e.student.firstName} {e.student.lastName ?? ""}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{e.student.roleNumber}</span>
                </label>
              );
            })}
          </div>
        )}
        {formError ? (
          <p role="alert" className="text-sm text-destructive">{formError}</p>
        ) : null}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={pending || !loaded}>
            {pending ? "Saving…" : "Save seats"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DutyDialog({
  slot,
  teachers,
  slots,
  onClose,
  onSaved,
}: {
  slot: ApiTimetableSlot;
  teachers: ApiTeacher[];
  slots: ApiTimetableSlot[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [teacherId, setTeacherId] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const current = slot.invigilationDuties?.[0];

  const overlaps = teacherId
    ? findOverlaps(teacherId, { date: slot.date, startTime: slot.startTime, endTime: slot.endTime }, slots, slot.id)
    : [];

  async function handleAssign(event: React.FormEvent) {
    event.preventDefault();
    if (!teacherId || !slot.hallId) {
      setFormError(!slot.hallId ? "Assign a hall to this room first (Edit)." : "Select a teacher.");
      return;
    }
    setPending(true);
    setFormError("");
    try {
      await assignDuty(slot.id, { teacherId, hallId: slot.hallId });
      onSaved();
    } catch (cause) {
      setFormError(academicErrorMessage(cause, "Unable to assign invigilator"));
    } finally {
      setPending(false);
    }
  }

  async function handleRemove() {
    if (!current) return;
    setPending(true);
    setFormError("");
    try {
      await removeDuty(current.id);
      onSaved();
    } catch (cause) {
      setFormError(academicErrorMessage(cause, "Unable to remove invigilator"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!pending && !o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invigilator</DialogTitle>
          <DialogDescription>
            {current
              ? `Currently on duty: ${current.teacher?.user ? [current.teacher.user.firstName, current.teacher.user.lastName].filter(Boolean).join(" ") : "—"}`
              : "No invigilator assigned yet."}
          </DialogDescription>
        </DialogHeader>
        {current ? (
          <Button type="button" variant="outline" onClick={() => void handleRemove()} disabled={pending}>
            <Trash2 size={14} /> {pending ? "Removing…" : "Remove from duty"}
          </Button>
        ) : (
          <form className="space-y-4" onSubmit={(event) => void handleAssign(event)}>
            <div className="space-y-2">
              <span className="text-sm font-medium">Teacher</span>
              <Select value={teacherId} onValueChange={setTeacherId}>
                <SelectTrigger><SelectValue placeholder="Select a teacher…" /></SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{fullName(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {overlaps.length > 0 ? (
                <p role="note" className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
                  <TriangleAlert size={12} className="inline mr-1" aria-hidden />
                  Already on duty in {overlaps.length} overlapping session{overlaps.length === 1 ? "" : "s"} — allowed, flagged for review.
                </p>
              ) : null}
            </div>
            {formError ? (
              <p role="alert" className="text-sm text-destructive">{formError}</p>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !teacherId}>
                {pending ? "Assigning…" : "Assign"}
              </Button>
            </DialogFooter>
          </form>
        )}
        {formError && current ? (
          <p role="alert" className="text-sm text-destructive">{formError}</p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
