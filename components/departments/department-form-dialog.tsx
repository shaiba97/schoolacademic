"use client";

import * as React from "react";
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export type DepartmentFormValues = {
  name: string;
};

export function DepartmentFormDialog({
  open,
  onOpenChange,
  defaultValues,
  isEdit,
  pending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: DepartmentFormValues;
  isEdit?: boolean;
  pending?: boolean;
  error?: { form?: string };
  onSubmit: (values: DepartmentFormValues) => void;
}) {
  const [name, setName] = React.useState(defaultValues?.name ?? "");

  React.useEffect(() => {
    if (open) {
      setName(defaultValues?.name ?? "");
    }
  }, [open, defaultValues]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit department" : "Add department"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Rename this department. Teachers assigned to it keep their assignment."
              : "Create a department to group teachers and subjects together. Names must be unique."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4 px-6"
          onSubmit={(event: React.FormEvent) => {
            event.preventDefault();
            if (!name.trim()) return;
            onSubmit({ name: name.trim() });
          }}
        >
          <div className="space-y-2">
            <label htmlFor="department-name" className="text-sm font-medium">Name</label>
            <Input
              id="department-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Arabic Language"
              autoFocus
              required
            />
          </div>

          {error?.form ? (
            <p role="alert" className="text-sm text-destructive">{error.form}</p>
          ) : null}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              <X size={14} /> Cancel
            </Button>
            <Button type="submit" disabled={pending || !name.trim()}>
              <Save size={14} /> {pending ? "Saving…" : isEdit ? "Save changes" : "Create department"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
