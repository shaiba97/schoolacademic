"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
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
  createGradingScale,
  deleteGradingScale,
  listGradingScales,
  updateGradingScale,
  type CreateGradingScalePayload,
} from "@/lib/api/grading";
import type { ApiGradingScale } from "@/lib/api/types";
import { academicErrorMessage } from "@/components/academics/academic-utils";

type BandRow = { minPercent: string; maxPercent: string; grade: string };

const EMPTY_BANDS: BandRow[] = [
  { minPercent: "90", maxPercent: "100", grade: "A" },
  { minPercent: "80", maxPercent: "89", grade: "B" },
  { minPercent: "70", maxPercent: "79", grade: "C" },
  { minPercent: "60", maxPercent: "69", grade: "D" },
  { minPercent: "0", maxPercent: "59", grade: "F" },
];

function passingThreshold(scale: ApiGradingScale) {
  const bands = scale.bands ?? [];
  if (bands.length === 0) return "—";
  const lowest = Math.min(...bands.map((b) => Number(b.minPercent)));
  return Number.isFinite(lowest) ? `${lowest}%` : "—";
}

export function GradingScalesClient() {
  const [data, setData] = React.useState<ApiGradingScale[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ApiGradingScale | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ApiGradingScale | null>(null);
  const [pending, setPending] = React.useState(false);
  const [deletePending, setDeletePending] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [name, setName] = React.useState("");
  const [isDefault, setIsDefault] = React.useState(false);
  const [bands, setBands] = React.useState<BandRow[]>(EMPTY_BANDS);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await listGradingScales());
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to load grading scales"));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setEditing(null);
    setName("");
    setIsDefault(false);
    setBands(EMPTY_BANDS);
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(scale: ApiGradingScale) {
    if (pending) return;
    setEditing(scale);
    setName(scale.name);
    setIsDefault(!!scale.isDefault);
    setBands(
      (scale.bands ?? []).map((b) => ({
        minPercent: String(b.minPercent),
        maxPercent: String(b.maxPercent),
        grade: b.grade,
      })),
    );
    setFormError("");
    setFormOpen(true);
  }

  function setBand(index: number, field: keyof BandRow, value: string) {
    setBands((current) => current.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setPending(true);
    setFormError("");
    try {
      const parsed = bands
        .filter((b) => b.grade.trim() !== "")
        .map((b) => ({
          minPercent: Number(b.minPercent),
          maxPercent: Number(b.maxPercent),
          grade: b.grade.trim().toUpperCase(),
        }));
      if (parsed.length === 0) {
        setFormError("Add at least one grade band.");
        setPending(false);
        return;
      }
      if (parsed.some((b) => Number.isNaN(b.minPercent) || Number.isNaN(b.maxPercent))) {
        setFormError("Band percentages must be numbers.");
        setPending(false);
        return;
      }
      if (parsed.some((b) => b.minPercent < 0 || b.maxPercent > 100)) {
        setFormError("Band percentages must be between 0 and 100.");
        setPending(false);
        return;
      }
      if (parsed.some((b) => b.minPercent > b.maxPercent)) {
        setFormError("Each band needs min percent at or below max percent.");
        setPending(false);
        return;
      }
      if (editing) {
        const saved = await updateGradingScale(editing.id, { name: name.trim(), isDefault, bands: parsed });
        setData((current) => current.map((s) => (s.id === saved.id ? saved : s)));
      } else {
        const payload: CreateGradingScalePayload = { name: name.trim(), isDefault, bands: parsed };
        const saved = await createGradingScale(payload);
        setData((current) => [saved, ...current]);
      }
      setFormOpen(false);
      setEditing(null);
    } catch (cause) {
      setFormError(academicErrorMessage(cause, "Unable to save grading scale"));
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeletePending(true);
    setError("");
    try {
      await deleteGradingScale(deleteTarget.id);
      setData((current) => current.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to delete grading scale"));
      setDeleteTarget(null);
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Examination Center · Grading
        </p>
        <h1 className="text-xl font-semibold tracking-tight mt-1">Grading Scales</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Grade bands compute letter grades on result entry and report cards. Passing threshold is the
          lowest score that still earns a grade.
        </p>
      </div>

      {error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            Retry
          </Button>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <CardTitle className="text-sm">Scales</CardTitle>
            <Button type="button" size="sm" onClick={openCreate} disabled={pending}>
              <Plus size={14} /> Add Grading Scale
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && data.length === 0 ? (
            <div className="space-y-3" aria-busy="true">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : data.length === 0 ? (
            <EmptyState
              title="No grading scales yet"
              description="Define grade bands (e.g. 90–100% → A) used to compute letter grades."
              action={{ label: "Add Grading Scale", onClick: openCreate }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Grade Bands</TableHead>
                  <TableHead>Passing Threshold</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((scale) => (
                  <TableRow key={scale.id}>
                    <TableCell>
                      <span className="font-medium">{scale.name}</span>
                      {scale.isDefault ? (
                        <Badge variant="secondary" className="ml-2">Default</Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>{(scale.bands ?? []).length}</TableCell>
                    <TableCell>{passingThreshold(scale)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button type="button" variant="outline" size="sm" onClick={() => openEdit(scale)} disabled={pending} aria-label={`Edit ${scale.name}`}>
                          <Pencil size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => { if (!pending) setDeleteTarget(scale); }}
                          disabled={pending}
                          aria-label={`Delete ${scale.name}`}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={(open) => { if (!pending) { setFormOpen(open); if (!open) setEditing(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit grading scale" : "Add grading scale"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Rename the scale, change its default flag, or replace its bands."
                : "Define the scale name and its grade bands."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(event) => void handleSave(event)}>
            <div className="space-y-2">
              <label htmlFor="scale-name" className="text-sm font-medium">Name</label>
              <Input
                id="scale-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Standard 100-point"
                autoFocus
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="scale-default"
                type="checkbox"
                checked={isDefault}
                onChange={(event) => setIsDefault(event.target.checked)}
                className="size-4 accent-primary"
              />
              <label htmlFor="scale-default" className="text-sm">Default scale for new exam subjects</label>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Bands{editing ? " (replaces all bands on save)" : ""}</p>
              <div className="space-y-1.5">
                {bands.map((band, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                    <Input
                      value={band.minPercent}
                      onChange={(event) => setBand(i, "minPercent", event.target.value)}
                      placeholder="Min %"
                      inputMode="decimal"
                      aria-label={`Band ${i + 1} min percent`}
                    />
                    <Input
                      value={band.maxPercent}
                      onChange={(event) => setBand(i, "maxPercent", event.target.value)}
                      placeholder="Max %"
                      inputMode="decimal"
                      aria-label={`Band ${i + 1} max percent`}
                    />
                    <Input
                      value={band.grade}
                      onChange={(event) => setBand(i, "grade", event.target.value)}
                      placeholder="Grade"
                      aria-label={`Band ${i + 1} grade`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBands((current) => current.filter((_, j) => j !== i))}
                      disabled={bands.length <= 1}
                      aria-label={`Remove band ${i + 1}`}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBands((current) => [...current, { minPercent: "", maxPercent: "", grade: "" }])}
              >
                <Plus size={14} /> Add band
              </Button>
            </div>
            {formError ? (
              <p role="alert" className="text-sm text-destructive">{formError}</p>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !name.trim()}>
                {pending ? "Saving…" : editing ? "Save changes" : "Create scale"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deletePending) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete grading scale?</AlertDialogTitle>
            <AlertDialogDescription>
              {`"${deleteTarget?.name}" and its bands will be permanently deleted. Exam subjects using this scale are affected — reassign them first.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>
              {deletePending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
