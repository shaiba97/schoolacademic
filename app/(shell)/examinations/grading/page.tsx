"use client";

import * as React from "react";
import { academicApiFetch, ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus, Trash2 } from "lucide-react";

type GradingScale = {
  id: string;
  name: string;
  description?: string;
  grades: { id: string; letter: string; minScore: number; maxScore: number; color?: string }[];
};

export default function GradingScalePage() {
  const [scales, setScales] = React.useState<GradingScale[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<GradingScale | null>(null);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<GradingScale | null>(null);

  async function load() {
    try {
      setLoading(true);
      const data = await academicApiFetch<GradingScale[]>("/grading/scales");
      setScales(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load grading scales");
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
    setDescription("");
    setDialogOpen(true);
  }

  function openEdit(scale: GradingScale) {
    setEditing(scale);
    setName(scale.name);
    setDescription(scale.description || "");
    setDialogOpen(true);
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await academicApiFetch(`/grading/scales/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
        });
      } else {
        await academicApiFetch("/grading/scales", {
          method: "POST",
          body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
        });
      }
      setDialogOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    try {
      await academicApiFetch(`/grading/scales/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Grading Scales</h1>
        <Button onClick={openCreate}>
          <Plus size={16} className="mr-2" />
          New Scale
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : scales.length === 0 ? (
        <p className="text-sm text-muted-foreground">No grading scales defined yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {scales.map((scale) => (
            <Card key={scale.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{scale.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(scale)}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(scale)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
                {scale.description && (
                  <p className="text-sm text-muted-foreground">{scale.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {scale.grades.map((grade) => (
                    <Badge key={grade.id} variant="secondary">
                      {grade.letter}: {grade.minScore}-{grade.maxScore}%
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Grading Scale" : "New Grading Scale"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="scale-name">Name</Label>
              <Input
                id="scale-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Standard Grading"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scale-desc">Description</Label>
              <Textarea
                id="scale-desc"
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving || !name.trim()}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Grading Scale</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
