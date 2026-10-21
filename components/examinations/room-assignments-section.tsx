"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, TriangleAlert, Users } from "lucide-react";
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
  assignExamRoom,
  listExamRooms,
  removeExamRoom,
  reorderRoomStudents,
  updateRoomInvigilators,
} from "@/lib/api/exams";
import { createHall, listHalls } from "@/lib/api/halls";
import { listTeachers, fullName } from "@/lib/api/teachers";
import { listEnrollments } from "@/lib/api/students";
import type {
  ApiEnrollmentRecord,
  ApiExamSubject,
  ApiHall,
  ApiRoomAssignment,
  ApiTeacher,
} from "@/lib/api/types";
import { academicErrorMessage } from "@/components/academics/academic-utils";

function invigilatorNames(room: ApiRoomAssignment): string {
  const names = (room.invigilators ?? [])
    .map((i) => (i.teacher ? fullName(i.teacher) : ""))
    .filter(Boolean);
  return names.join(", ");
}

function studentDisplay(s: { firstName: string; lastName?: string | null; roleNumber?: string | null }): string {
  return `${s.firstName} ${s.lastName ?? ""}`.trim();
}

export function RoomAssignmentsSection({
  examId,
  subjects,
  rooms,
  onRoomsChange,
}: {
  examId: string;
  subjects: ApiExamSubject[];
  rooms: ApiRoomAssignment[];
  onRoomsChange: (rooms: ApiRoomAssignment[]) => void;
}) {
  const [halls, setHalls] = React.useState<ApiHall[]>([]);
  const [teachers, setTeachers] = React.useState<ApiTeacher[]>([]);
  const [enrollments, setEnrollments] = React.useState<ApiEnrollmentRecord[]>([]);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [addOpen, setAddOpen] = React.useState(false);
  const [seatingRoom, setSeatingRoom] = React.useState<ApiRoomAssignment | null>(null);
  const [dutyRoom, setDutyRoom] = React.useState<ApiRoomAssignment | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ApiRoomAssignment | null>(null);
  const [pending, setPending] = React.useState(false);

  // Classes covered by this exam (via its subjects) — seating candidates come
  // from their enrollments.
  const examClassIds = React.useMemo(
    () => [...new Set(subjects.map((s) => s.classSubject?.classId).filter((id): id is string => !!id))],
    [subjects],
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [r, h, t, e] = await Promise.all([
        listExamRooms(examId),
        listHalls(),
        listTeachers({ page: 1, limit: 100 }),
        listEnrollments(),
      ]);
      onRoomsChange(r);
      setHalls(h);
      setTeachers(t.data);
      setEnrollments(e);
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to load rooms"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setPending(true);
    try {
      await removeExamRoom(examId, deleteTarget.id);
      onRoomsChange(rooms.filter((r) => r.id !== deleteTarget.id));
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
        ) : rooms.length === 0 ? (
          <EmptyState
            title="No rooms assigned"
            description="Assign the first hall — students are seated automatically in alphabetical order and the exam structure locks."
            action={subjects.length > 0 ? { label: "Add Room", onClick: () => setAddOpen(true) } : undefined}
          />
        ) : (
          <div className="space-y-2">
            {rooms.map((room) => {
              const studentCount = room.students?.length ?? room._count?.students ?? 0;
              const invigilators = invigilatorNames(room);
              return (
                <div key={room.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{room.hall?.name ?? "Hall"}</span>
                    {room.hall ? (
                      <Badge variant="secondary">cap {room.hall.capacity}</Badge>
                    ) : null}
                    <Badge variant="outline">
                      <Users size={12} className="mr-1" aria-hidden />
                      {studentCount} seated
                    </Badge>
                    {invigilators ? (
                      <Badge variant="outline">{invigilators}</Badge>
                    ) : (
                      <Badge variant="muted">No invigilator</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button type="button" variant="outline" size="sm" onClick={() => setSeatingRoom(room)}>
                      Seating
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setDutyRoom(room)}>
                      {invigilators ? "Invigilators" : "Assign invigilator"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteTarget(room)}
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

      <AssignRoomDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        examId={examId}
        examClassIds={examClassIds}
        halls={halls}
        teachers={teachers}
        enrollments={enrollments}
        onHallsChange={setHalls}
        onCreated={(room) => onRoomsChange([...rooms, room])}
      />

      {seatingRoom ? (
        <SeatingDialog
          room={seatingRoom}
          examId={examId}
          onClose={() => setSeatingRoom(null)}
          onSaved={(room) => {
            onRoomsChange(rooms.map((r) => (r.id === room.id ? room : r)));
            setSeatingRoom(room);
          }}
        />
      ) : null}

      {dutyRoom ? (
        <InvigilatorsDialog
          room={dutyRoom}
          examId={examId}
          teachers={teachers}
          onClose={() => setDutyRoom(null)}
          onSaved={(room) => {
            onRoomsChange(rooms.map((r) => (r.id === room.id ? room : r)));
            setDutyRoom(null);
          }}
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
              The hall assignment, its seating order, and its invigilators will be permanently deleted.
              Removing the last room unlocks the exam structure again. This cannot be undone.
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

function AssignRoomDialog({
  open,
  onOpenChange,
  examId,
  examClassIds,
  halls,
  teachers,
  enrollments,
  onHallsChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: string;
  examClassIds: string[];
  halls: ApiHall[];
  teachers: ApiTeacher[];
  enrollments: ApiEnrollmentRecord[];
  onHallsChange: (halls: ApiHall[]) => void;
  onCreated: (room: ApiRoomAssignment) => void;
}) {
  const [hallId, setHallId] = React.useState("");
  const [newHallMode, setNewHallMode] = React.useState(false);
  const [newHallName, setNewHallName] = React.useState("");
  const [newHallCapacity, setNewHallCapacity] = React.useState("30");
  const [invigilatorIds, setInvigilatorIds] = React.useState<string[]>([]);
  const [customSeats, setCustomSeats] = React.useState(false);
  const [selectedStudents, setSelectedStudents] = React.useState<string[]>([]);
  const [pending, setPending] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setHallId("");
    setNewHallMode(false);
    setNewHallName("");
    setNewHallCapacity("30");
    setInvigilatorIds([]);
    setCustomSeats(false);
    setSelectedStudents([]);
    setFormError("");
  }, [open]);

  const candidates = React.useMemo(
    () =>
      enrollments
        .filter((e) => e.schoolClass && examClassIds.includes(e.schoolClass.id))
        .sort((a, b) =>
          `${a.student.lastName ?? ""} ${a.student.firstName}`.localeCompare(
            `${b.student.lastName ?? ""} ${b.student.firstName}`,
          ),
        ),
    [enrollments, examClassIds],
  );

  React.useEffect(() => {
    setSelectedStudents(candidates.map((e) => e.student.id));
  }, [candidates]);

  const resolvedHall = halls.find((h) => h.id === hallId);
  const seatedCount = customSeats ? selectedStudents.length : candidates.length;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");
    if (customSeats && selectedStudents.length === 0) {
      setFormError("Select at least one student — a room with zero students is meaningless.");
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
      const room = await assignExamRoom(examId, {
        hallId: (hall as ApiHall).id,
        ...(invigilatorIds.length > 0 ? { invigilatorIds } : {}),
        ...(customSeats ? { studentIds: selectedStudents } : {}),
      });
      onOpenChange(false);
      onCreated(room);
    } catch (cause) {
      setFormError(academicErrorMessage(cause, "Unable to add room"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!pending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Room</DialogTitle>
          <DialogDescription>
            Hall, invigilators, and seating. Students seat automatically in alphabetical order unless you pick a custom set.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
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
            {resolvedHall && seatedCount > resolvedHall.capacity ? (
              <p role="note" className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
                <TriangleAlert size={12} className="inline mr-1" aria-hidden />
                {seatedCount} students exceed {resolvedHall.name} capacity ({resolvedHall.capacity}).
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">Invigilators (optional)</span>
            {teachers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No teachers found.</p>
            ) : (
              <div className="max-h-40 overflow-y-auto rounded-lg border divide-y">
                {teachers.map((t) => {
                  const checked = invigilatorIds.includes(t.id);
                  return (
                    <label key={t.id} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setInvigilatorIds((current) =>
                            checked ? current.filter((id) => id !== t.id) : [...current, t.id],
                          )
                        }
                        className="size-4 accent-primary"
                      />
                      <span className="flex-1 truncate">{fullName(t)}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">
              Students ({customSeats ? `${selectedStudents.length} selected` : `${candidates.length} auto-seated`})
            </p>
            {!customSeats ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  Every enrolled student of the exam classes, seated alphabetically.
                </p>
                <Button type="button" variant="outline" size="sm" onClick={() => setCustomSeats(true)}>
                  <Pencil size={14} /> Pick custom set
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
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
                <Button type="button" variant="outline" size="sm" onClick={() => setCustomSeats(false)}>
                  Back to auto-seating
                </Button>
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

type SeatRow = { studentId: string; name: string; roleNumber?: string | null; gender?: string | null };

function toSeatRows(room: ApiRoomAssignment): SeatRow[] {
  return (room.students ?? []).map((s) => ({
    studentId: s.studentId,
    name: s.student ? studentDisplay(s.student) : s.studentId.slice(0, 8),
    roleNumber: s.student?.roleNumber,
    gender: s.student?.gender,
  }));
}

function SeatingDialog({
  room,
  examId,
  onClose,
  onSaved,
}: {
  room: ApiRoomAssignment;
  examId: string;
  onClose: () => void;
  onSaved: (room: ApiRoomAssignment) => void;
}) {
  const [rows, setRows] = React.useState<SeatRow[]>(() => toSeatRows(room));
  const [pending, setPending] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  function sortBy(kind: "name" | "gender" | "roll") {
    setRows((current) => {
      const next = [...current];
      if (kind === "name") next.sort((a, b) => a.name.localeCompare(b.name));
      if (kind === "gender") {
        next.sort((a, b) =>
          `${a.gender ?? "—"} ${a.name}`.localeCompare(`${b.gender ?? "—"} ${b.name}`),
        );
      }
      if (kind === "roll") next.sort((a, b) => `${a.roleNumber ?? ""}`.localeCompare(`${b.roleNumber ?? ""}`));
      return next;
    });
  }

  function move(index: number, delta: -1 | 1) {
    setRows((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const [row] = next.splice(index, 1);
      next.splice(target, 0, row);
      return next;
    });
  }

  async function handleSave() {
    setPending(true);
    setFormError("");
    try {
      const saved = await reorderRoomStudents(examId, room.id, {
        orders: rows.map((r, index) => ({ studentId: r.studentId, seatOrder: index + 1 })),
      });
      onSaved(saved);
    } catch (cause) {
      setFormError(academicErrorMessage(cause, "Unable to save seating order"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!pending && !o) onClose(); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seating · {room.hall?.name ?? "Hall"}</DialogTitle>
          <DialogDescription>
            Seat numbers follow list order. Sort or nudge rows, then save the order.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5">
          <Button type="button" variant="outline" size="sm" onClick={() => sortBy("name")}>Sort: name</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => sortBy("gender")}>Sort: gender</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => sortBy("roll")}>Sort: roll no</Button>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No students seated in this room.</p>
        ) : (
          <ol className="max-h-64 overflow-y-auto rounded-lg border divide-y">
            {rows.map((r, index) => (
              <li key={r.studentId} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                <span className="font-mono text-xs text-muted-foreground w-7 shrink-0">{index + 1}</span>
                <span className="flex-1 truncate">{r.name}</span>
                {r.gender ? (
                  <Badge variant="outline">{r.gender}</Badge>
                ) : null}
                <span className="font-mono text-xs text-muted-foreground">{r.roleNumber}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${r.name} up`}
                >
                  <ArrowUp size={14} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => move(index, 1)}
                  disabled={index === rows.length - 1}
                  aria-label={`Move ${r.name} down`}
                >
                  <ArrowDown size={14} />
                </Button>
              </li>
            ))}
          </ol>
        )}
        {formError ? (
          <p role="alert" className="text-sm text-destructive">{formError}</p>
        ) : null}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={pending || rows.length === 0}>
            {pending ? "Saving…" : "Save order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InvigilatorsDialog({
  room,
  examId,
  teachers,
  onClose,
  onSaved,
}: {
  room: ApiRoomAssignment;
  examId: string;
  teachers: ApiTeacher[];
  onClose: () => void;
  onSaved: (room: ApiRoomAssignment) => void;
}) {
  const [selected, setSelected] = React.useState<string[]>(
    () => (room.invigilators ?? []).map((i) => i.teacherId),
  );
  const [pending, setPending] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  async function handleSave() {
    setPending(true);
    setFormError("");
    try {
      onSaved(await updateRoomInvigilators(examId, room.id, selected));
    } catch (cause) {
      setFormError(academicErrorMessage(cause, "Unable to save invigilators"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!pending && !o) onClose(); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invigilators · {room.hall?.name ?? "Hall"}</DialogTitle>
          <DialogDescription>Checked teachers are on duty in this room.</DialogDescription>
        </DialogHeader>
        {teachers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No teachers found.</p>
        ) : (
          <div className="max-h-64 overflow-y-auto rounded-lg border divide-y">
            {teachers.map((t) => {
              const checked = selected.includes(t.id);
              return (
                <label key={t.id} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setSelected((current) =>
                        checked ? current.filter((id) => id !== t.id) : [...current, t.id],
                      )
                    }
                    className="size-4 accent-primary"
                  />
                  <span className="flex-1 truncate">{fullName(t)}</span>
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
          <Button type="button" onClick={() => void handleSave()} disabled={pending}>
            {pending ? "Saving…" : "Save invigilators"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
