"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
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
import { useI18n } from "@/lib/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";

export function sourceLabel(source: ApiTeacherDocumentSource | string | undefined, t: (key: MessageKey) => string) {
  if (source === "TEACHER") return t("teachers.sourceTeacherUploaded");
  return t("teachers.sourceAcademicAffairsUploaded");
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
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{credential ? t("teachers.docEditTitle") : t("teachers.docAddTitle")}</DialogTitle>
          <DialogDescription>
            {credential
              ? t("teachers.docEditDescription")
              : t("teachers.docAddDescription")}
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
            t={t}
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
  t: (key: MessageKey) => string;
}) {
  const { t } = useI18n();
  const isEdit = Boolean(credential);
  const [title, setTitle] = React.useState(credential?.title ?? "");
  const [source, setSource] = React.useState<ApiTeacherDocumentSource>(
    credential?.source ?? "ACADEMIC_AFFAIRS",
  );
  const [file, setFile] = React.useState<File | null>(null);
  const [touched, setTouched] = React.useState(false);

  const titleError = touched && !title.trim() ? t("teachers.errorGiveName") : "";
  const fileError = touched && !isEdit && !file ? t("teachers.errorChooseFile") : "";
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
        <Label htmlFor="credential-title">{t("teachers.labelDocName")}</Label>
        <Input
          id="credential-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("teachers.placeholderNationalId")}
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
        <Label htmlFor="credential-source">{t("teachers.labelSuppliedBy")}</Label>
        <NativeSelect
          id="credential-source"
          value={source}
          onChange={(event) => setSource(event.target.value as ApiTeacherDocumentSource)}
        >
          <option value="ACADEMIC_AFFAIRS">{t("teachers.sourceAcademicAffairsUploaded")}</option>
          <option value="TEACHER">{t("teachers.sourceTeacherUploaded")}</option>
        </NativeSelect>
      </div>

      <FilePicker
        id="credential-file"
        label={isEdit ? t("teachers.replaceFileOptional") : t("teachers.labelDocFile")}
        accept="image/*,application/pdf"
        maxSizeMB={10}
        required={!isEdit}
        value={file ? { file, path: "" } : null}
        onChange={(value) => setFile(value?.file ?? null)}
        helperText={t("teachers.helperDocFile")}
        error={fileError}
      />

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={pending || !canSubmit}>
          {pending ? t("common.saving") : isEdit ? t("teachers.btnSaveChanges") : t("teachers.btnAddDocument")}
        </Button>
      </DialogFooter>
    </form>
  );
}
