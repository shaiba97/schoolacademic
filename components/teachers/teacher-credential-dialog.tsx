"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { FilePicker } from "@/components/ui/file-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ApiTeacherCredential, ApiTeacherDocumentSource } from "@/lib/api/types";

const SOURCE_LABELS: Record<ApiTeacherDocumentSource, string> = {
  ACADEMIC_AFFAIRS: "Uploaded by academic affairs",
  TEACHER: "Uploaded by the teacher",
};

export function sourceLabel(source: ApiTeacherDocumentSource | string | undefined) {
  if (source === "TEACHER") return SOURCE_LABELS.TEACHER;
  return SOURCE_LABELS.ACADEMIC_AFFAIRS;
}

export type TeacherCredentialDraft = {
  title: string;
  source: ApiTeacherDocumentSource;
  file: File | null;
};

/**
 * Add/edit form for one named document. The two required inputs are the
 * document name and the file itself; the source records who supplied it and
 * only matters for existing records being reassigned.
 */
export function TeacherCredentialDialog({
  open,
  credential,
  pending,
  error,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  credential?: ApiTeacherCredential | null;
  pending?: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: TeacherCredentialDraft) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{credential ? "Edit document" : "Add document"}</DialogTitle>
          <DialogDescription>
            {credential
              ? "Rename the document, reassign who supplied it, or replace the file."
              : "Every document is shown as its own card on the teacher record."}
          </DialogDescription>
        </DialogHeader>

        {/* Mounted only while open and keyed per document, so the fields always
            start from the record being edited — no effect-driven reset. */}
        {open ? (
          <CredentialForm
            key={credential?.id ?? "new"}
            credential={credential}
            pending={pending}
            error={error}
            onCancel={() => onOpenChange(false)}
            onSubmit={onSubmit}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CredentialForm({
  credential,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  credential?: ApiTeacherCredential | null;
  pending?: boolean;
  error?: string;
  onCancel: () => void;
  onSubmit: (draft: TeacherCredentialDraft) => void;
}) {
  const isEdit = Boolean(credential);
  const [title, setTitle] = React.useState(credential?.title ?? "");
  const [source, setSource] = React.useState<ApiTeacherDocumentSource>(
    credential?.source ?? "ACADEMIC_AFFAIRS",
  );
  const [file, setFile] = React.useState<File | null>(null);
  const [touched, setTouched] = React.useState(false);

  const titleError = touched && !title.trim() ? "Give the document a name." : "";
  const fileError = touched && !isEdit && !file ? "Choose a file to upload." : "";
  const canSubmit = title.trim().length > 0 && (isEdit || Boolean(file));

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    onSubmit({ title: title.trim(), source, file });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="credential-title">Document name</Label>
        <Input
          id="credential-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="National ID"
          maxLength={150}
          required
          aria-invalid={Boolean(titleError)}
          aria-describedby={titleError ? "credential-title-error" : undefined}
        />
        {titleError ? (
          <p id="credential-title-error" className="text-xs text-destructive">
            {titleError}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="credential-source">Supplied by</Label>
        <NativeSelect
          id="credential-source"
          value={source}
          onChange={(event) => setSource(event.target.value as ApiTeacherDocumentSource)}
        >
          <option value="ACADEMIC_AFFAIRS">Uploaded by academic affairs</option>
          <option value="TEACHER">Uploaded by the teacher</option>
        </NativeSelect>
      </div>

      <FilePicker
        id="credential-file"
        label={isEdit ? "Replace file (optional)" : "Document file"}
        accept="image/*,application/pdf"
        maxSizeMB={10}
        required={!isEdit}
        value={file ? { file, path: "" } : null}
        onChange={(value) => setFile(value?.file ?? null)}
        helperText="PNG, JPG, WEBP or PDF — max 10MB"
        error={fileError}
      />

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !canSubmit}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Add document"}
        </Button>
      </DialogFooter>
    </form>
  );
}
