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
import { createHall, deleteHall, listHalls } from "@/lib/api/halls";
import { listExams } from "@/lib/api/exams";
import type { ApiExam, ApiHall } from "@/lib/api/types";
import { academicErrorMessage } from "@/components/academics/academic-utils";

export function RoomsClient() {
  const [halls, setHalls] = React.useState<ApiHall[]>([]);
  const [exams, setExams] = React.useState<ApiExam[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ApiHall | null>(null);
  const [pending, setPending] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [name, setName] = React.useState("");
  const [capacity, setCapacity] = React.useState("30");

  React.useEffect(() => {
    Promise.all([listHalls(), listExams({ page: 1, limit: 100 })])
      .then(([h, res]) => {
        setHalls(h);
        setExams(res.data);
      })
      .catch((cause) => setError(academicErrorMessage(cause, "Unable to load rooms")))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setFormError("Give the hall a name.");
      return;
    }
    const cap = Number(capacity);
    if (!Number.isFinite(cap) || cap < 1) {
      setFormError("Capacity must be at least 1.");
      return;
    }
    setPending(true);
    setFormError("");
    try {
      const hall = await createHall({ name: name.trim(), capacity: cap });
      setHalls((current) => [...current, hall]);
      setCreateOpen(false);
      setName("");
      setCapacity("30");
    } catch (cause) {
      setFormError(academicErrorMessage(cause, "Unable to create hall"));
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setPending(true);
    try {
      await deleteHall(deleteTarget.id);
      setHalls((current) => current.filter((h) => h.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to delete hall"));
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
          Hall registry plus room assignments per exam. Seating and invigilators live on the exam page.
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
              Halls
            </CardTitle>
            <Button type="button" size="sm" onClick={() => { setFormError(""); setCreateOpen(true); }}>
              <Plus size={14} /> Add Hall
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3" aria-busy="true">
              <Skeleton className="h-12 w-full" />
            </div>
          ) : halls.length === 0 ? (
            <EmptyState
              title="No halls yet"
              description="Register the first hall — rooms assign halls to exams."
              action={{ label: "Add Hall", onClick: () => setCreateOpen(true) }}
            />
          ) : (
            <div className="space-y-2">
              {halls.map((h) => (
                <div key={h.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{h.name}</p>
                    <p className="text-xs text-muted-foreground">Capacity {h.capacity} · {h.type}</p>
                  </div>
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
              ))}
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
              No rooms assigned yet. Open an exam to assign its first hall.
            </p>
          ) : (
            <div className="space-y-2">
              {assignedExams.map((e) => (
                <div key={e.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                  <div className="flex-1 min-w-0">
                    <Link href={`/examinations/exam-setup/${e.id}`} className="text-sm font-medium hover:underline">
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
            <DialogTitle>Add hall</DialogTitle>
            <DialogDescription>Register a physical or virtual exam venue.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(event) => void handleCreate(event)}>
            <div className="space-y-2">
              <label htmlFor="hall-name" className="text-sm font-medium">Name</label>
              <Input id="hall-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Main Hall" required />
            </div>
            <div className="space-y-2">
              <label htmlFor="hall-capacity" className="text-sm font-medium">Capacity</label>
              <Input id="hall-capacity" value={capacity} onChange={(event) => setCapacity(event.target.value)} inputMode="numeric" required />
            </div>
            {formError ? (
              <p role="alert" className="text-sm text-destructive">{formError}</p>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !name.trim()}>
                {pending ? "Adding…" : "Add hall"}
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
            <AlertDialogTitle>Delete hall?</AlertDialogTitle>
            <AlertDialogDescription>
              Halls with room assignments cannot be deleted — remove the assignments first.
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
