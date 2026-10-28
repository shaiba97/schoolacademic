"use client";

import * as React from "react";
import Link from "next/link";
import { DoorOpen, Plus, Trash2 } from "lucide-react";
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
import { createHall, deleteHall, listHalls } from "@/lib/api/halls";
import { listClasses } from "@/lib/api/classes";
import { listExams } from "@/lib/api/exams";
import type { ApiExam, ApiHall, ApiSchoolClass } from "@/lib/api/types";
import { academicErrorMessage } from "@/components/academics/academic-utils";

function roomNumberOf(hallName: string): number | null {
  const match = hallName.match(/ Room (\d+)$/);
  const n = match ? Number(match[1]) : NaN;
  return Number.isInteger(n) ? n : null;
}

function classOfRoom(hallName: string): string {
  return hallName.replace(/ Room \d+$/, "") || hallName;
}

function nextRoomNumber(className: string, halls: ApiHall[]): number {
  const prefix = `${className} Room `;
  let max = 0;
  for (const hall of halls) {
    if (hall.name.startsWith(prefix)) {
      const n = roomNumberOf(hall.name) ?? 0;
      if (n > max) max = n;
    }
  }
  return max + 1;
}

export function RoomsClient() {
  const [rooms, setRooms] = React.useState<ApiHall[]>([]);
  const [exams, setExams] = React.useState<ApiExam[]>([]);
  const [classes, setClasses] = React.useState<ApiSchoolClass[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ApiHall | null>(null);
  const [pending, setPending] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [classId, setClassId] = React.useState("");
  const [capacity, setCapacity] = React.useState("30");

  React.useEffect(() => {
    Promise.all([listHalls(), listExams({ page: 1, limit: 100 }), listClasses({ page: 1, limit: 100 })])
      .then(([r, ex, cl]) => {
        setRooms(r);
        setExams(ex.data);
        setClasses(cl.data);
      })
      .catch((cause) => setError(academicErrorMessage(cause, "Unable to load rooms")))
      .finally(() => setLoading(false));
  }, []);

  const selectedClass = classes.find((c) => c.id === classId) ?? null;
  const autoRoomNumber = selectedClass ? nextRoomNumber(selectedClass.className, rooms) : null;
  const roomName = selectedClass && autoRoomNumber ? `${selectedClass.className} Room ${autoRoomNumber}` : "";

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const name = roomName.trim();
    const cap = Number(capacity);
    if (!classId || !selectedClass || !autoRoomNumber) {
      setFormError("Select the class this room serves.");
      return;
    }
    if (!name) {
      setFormError("Room name could not be derived — pick the class again.");
      return;
    }
    if (!Number.isFinite(cap) || cap < 1) {
      setFormError("Capacity must be at least 1.");
      return;
    }
    setPending(true);
    setFormError("");
    try {
      const room = await createHall({ name, capacity: cap });
      setRooms((current) => [...current, room]);
      setCreateOpen(false);
      setClassId("");
      setCapacity("30");
    } catch (cause) {
      setFormError(academicErrorMessage(cause, `Unable to create room — ${name} may already exist`));
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setPending(true);
    try {
      await deleteHall(deleteTarget.id);
      setRooms((current) => current.filter((h) => h.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to delete room"));
      setDeleteTarget(null);
    } finally {
      setPending(false);
    }
  }

  const assignedExams = exams.filter((e) => (e._count?.examRoomAssignments ?? 0) > 0);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Examination Center · Rooms
        </p>
        <h1 className="text-xl font-semibold tracking-tight mt-1">Rooms</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Room registry — pick a class and rooms get numbered automatically. Open a room to seat students for its exam.
        </p>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <CardTitle className="text-sm flex items-center gap-2">
              <DoorOpen size={14} className="text-muted-foreground" aria-hidden />
              Rooms
            </CardTitle>
            <Button type="button" size="sm" onClick={() => { setFormError(""); setCreateOpen(true); }}>
              <Plus size={14} /> Add Room
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3" aria-busy="true">
              <Skeleton className="h-12 w-full" />
            </div>
          ) : rooms.length === 0 ? (
            <EmptyState
              title="No rooms yet"
              description="Create the first exam room — pick the class it serves and the room number is calculated for you."
              action={{ label: "Add Room", onClick: () => setCreateOpen(true) }}
            />
          ) : (
            <div className="space-y-2">
              {rooms.map((h) => {
                const cls = classOfRoom(h.name);
                const roomNo = roomNumberOf(h.name);
                const classScoped = roomNo !== null;
                return (
                  <div key={h.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                    <div className="flex-1 min-w-0">
                      {classScoped ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="muted">{cls}</Badge>
                          <Link href={`/exams/rooms/${h.id}`} className="text-sm font-medium hover:underline">
                            Room {roomNo}
                          </Link>
                        </div>
                      ) : (
                        <Link href={`/exams/rooms/${h.id}`} className="text-sm font-medium hover:underline">
                          {h.name}
                        </Link>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Capacity {h.capacity} · {h.type}{classScoped ? ` · ${cls}` : ""}
                      </p>
                    </div>
                    <Link
                      href={`/exams/rooms/${h.id}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Manage seating →
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => { if (!pending) setDeleteTarget(h); }}
                      aria-label={`Delete ${h.name}`}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Assignments by exam</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3" aria-busy="true">
              <Skeleton className="h-12 w-full" />
            </div>
          ) : assignedExams.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No rooms assigned yet. Open an exam to assign its first room.
            </p>
          ) : (
            <div className="space-y-2">
              {assignedExams.map((e) => (
                <div key={e.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                  <div className="flex-1 min-w-0">
                    <Link href={`/exams/${e.id}`} className="text-sm font-medium hover:underline">
                      {e.name}
                    </Link>
                  </div>
                  <Badge variant="outline">
                    {e._count?.examRoomAssignments ?? 0} room{(e._count?.examRoomAssignments ?? 0) === 1 ? "" : "s"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={(o) => { if (!pending) setCreateOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add room</DialogTitle>
            <DialogDescription>Register a physical or virtual exam venue.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(event) => void handleCreate(event)}>
            <div className="space-y-2">
              <label htmlFor="room-class" className="text-sm font-medium">Class</label>
              <Select value={classId} onValueChange={(v) => setClassId(v)}>
                <SelectTrigger id="room-class">
                  <SelectValue placeholder="Select the class this room serves…" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">The room is named after the class, with the next room number auto-assigned.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="room-number" className="text-sm font-medium">Room number</label>
                <Input
                  id="room-number"
                  value={autoRoomNumber ? autoRoomNumber : "—"}
                  readOnly
                  aria-readonly="true"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="room-capacity" className="text-sm font-medium">Capacity</label>
                <Input id="room-capacity" value={capacity} onChange={(event) => setCapacity(event.target.value)} inputMode="numeric" required />
              </div>
            </div>
            {roomName ? (
              <p className="text-xs text-muted-foreground">
                Will be created as <span className="font-medium text-foreground">{roomName}</span>
              </p>
            ) : null}
            {formError ? (
              <p role="alert" className="text-sm text-destructive">{formError}</p>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !classId}>
                {pending ? "Adding…" : "Add room"}
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
            <AlertDialogTitle>Delete room?</AlertDialogTitle>
            <AlertDialogDescription>
              Rooms with exam assignments cannot be deleted — remove the assignments first.
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
    </div>
  );
}
