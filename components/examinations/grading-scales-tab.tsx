"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
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
  bandLabel,
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

export function GradingScalesTab({ initialData }: { initialData: ApiGradingScale[] }) {
  const [data, setData] = React.useState(initialData);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ApiGradingScale | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ApiGradingScale | null>(null);
  const [pending, setPending] = React.useState(false);
  const [deletePending, setDeletePending] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [name, setName] = React.useState("");
  const [isDefault, setIsDefault] = React.useState(false);
  const [bands, setBands] = React.useState<BandRow[]>(EMPTY_BANDS);

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
      if (parsed.some((b) => Number.isNaN(b.minPercent) || Number.isNaN(b.maxPercent))) {
        setFormError("Band percentages must be numbers.");
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

  async function retry() {
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between items-start">
        <p className="text-sm text-muted-foreground">School-wide grade bands, shared with report cards.</p>
        <Button type="button" onClick={openCreate} disabled={pending}>
          <Plus size={16} /> Add Grading Scale
        </Button>
      </div>

      {error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void retry()} disabled={loading}>
            Retry
          </Button>
        </div>
      ) : null}

      {loading && data.length === 0 ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1].map((item) => (
            <Skeleton key={item} className="h-24 w-full" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          title="No grading scales yet"
          description="Define grade bands (e.g. 90–100% → A) used to compute letter grades."
          action={{ label: "Add Grading Scale", onClick: openCreate }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((scale) => (
            <div key={scale.id} className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium flex items-center gap-2">
                    {scale.name}
                    {scale.isDefault ? <Badge variant="secondary">Default</Badge> : null}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(scale.bands ?? []).length} bands
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button type="button" variant="outline" size="sm" onClick={() => openEdit(scale)} disabled={pending}>
                    <Pencil size={14} /> Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { if (!pending) setDeleteTarget(scale); }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(scale.bands ?? []).map((band, i) => (
                  <Badge key={i} variant="outline">{bandLabel(band)}</Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={(open) => { if (!pending) { setFormOpen(open); if (!open) setEditing(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit grading scale" : "Add grading scale"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Rename the scale or change its default flag. Bands are fixed after creation."
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
