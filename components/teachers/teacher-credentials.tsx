"use client";

import * as React from "react";
import { FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TeacherCredentialCard } from "@/components/teachers/teacher-credential-card";
import {
  TeacherCredentialDialog,
  type TeacherCredentialDraft,
} from "@/components/teachers/teacher-credential-dialog";
import { uploadTeacherCredentialFile, deleteStagedFile } from "@/lib/api/storage";
import {
  addTeacherCredential,
  deleteTeacherCredential,
  updateTeacherCredential,
} from "@/lib/api/teachers";
import { academicErrorMessage } from "@/components/academics/academic-utils";
import { useI18n } from "@/lib/i18n/locale-provider";
import type { ApiTeacherCredential } from "@/lib/api/types";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function draftId() {
  return crypto.randomUUID();
}

/**
 * The teacher's document section. Each document is a self-contained ID card;
 * adding one stages the file first, then commits it, and a failed commit
 * removes the staged file so no orphans are left behind.
 */
export function TeacherCredentials({
  teacherId,
  initialCredentials = [],
  canEdit = true,
}: {
  teacherId: string;
  initialCredentials?: ApiTeacherCredential[];
  canEdit?: boolean;
}) {
  const [credentials, setCredentials] = React.useState<ApiTeacherCredential[]>(initialCredentials);
  const [syncedFrom, setSyncedFrom] = React.useState(initialCredentials);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ApiTeacherCredential | null>(null);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState("");
  const { t } = useI18n();

  // Re-sync during render rather than in an effect: when the server hands us a
  // new teacher payload, local edits are discarded without a cascading render.
  if (syncedFrom !== initialCredentials) {
    setSyncedFrom(initialCredentials);
    setCredentials(initialCredentials);
  }

  function openCreate() {
    setEditing(null);
    setError("");
    setDialogOpen(true);
  }

  function openEdit(credential: ApiTeacherCredential) {
    setEditing(credential);
    setError("");
    setDialogOpen(true);
  }

  async function handleSubmit(draft: TeacherCredentialDraft) {
    setPending(true);
    setError("");
    let stagedKey: string | null = null;
    try {
      const payload: Record<string, unknown> = {
        title: draft.title,
        source: draft.source,
      };

      if (draft.file) {
        if (!ACCEPTED_TYPES.has(draft.file.type)) {
          setError(t("teachers.errorUnsupportedType"));
          return;
        }
        if (draft.file.size === 0) {
          setError(t("common.errorFileEmpty"));
          return;
        }
        const stored = await uploadTeacherCredentialFile({ file: draft.file, draftId: draftId() });
        stagedKey = stored.objectKey;
        payload.objectKey = stored.objectKey;
        payload.originalName = stored.originalName;
        payload.contentType = stored.contentType || draft.file.type;
        payload.size = stored.size;
      }

      if (editing) {
        const updated = await updateTeacherCredential(teacherId, editing.id, payload);
        setCredentials((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
      } else {
        const created = await addTeacherCredential(teacherId, payload as never);
        setCredentials((current) =>
          [...current, created].sort((a, b) => a.title.localeCompare(b.title)),
        );
      }

      setDialogOpen(false);
      setEditing(null);
    } catch (cause) {
      if (stagedKey) await deleteStagedFile(stagedKey).catch(() => undefined);
      setError(academicErrorMessage(cause, t("teachers.errorSaveDoc")));
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(credential: ApiTeacherCredential) {
    setPending(true);
    setError("");
    const previous = credentials;
    setCredentials((current) => current.filter((item) => item.id !== credential.id));
    try {
      await deleteTeacherCredential(teacherId, credential.id);
    } catch (cause) {
      setCredentials(previous);
      setError(academicErrorMessage(cause, t("teachers.errorDeleteDoc")));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="sm:col-span-2">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-sm">{t("teachers.credentialsTitle")}</CardTitle>
            <CardDescription>{t("teachers.credentialsDescription")}</CardDescription>
          </div>
          {canEdit ? (
            <Button type="button" size="sm" onClick={openCreate} disabled={pending}>
              <FilePlus2 size={14} aria-hidden /> {t("teachers.addDocument")}
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {error && !dialogOpen ? (
          <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {credentials.length === 0 ? (
          <div role="status" className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm font-medium">{t("teachers.noDocsTitle")}</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              {t("teachers.noDocsDescription")}
            </p>
            {canEdit ? (
              <Button type="button" className="mt-4" onClick={openCreate} disabled={pending}>
                <FilePlus2 size={14} aria-hidden /> {t("teachers.addFirstDocument")}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {credentials.map((credential) => (
              <TeacherCredentialCard
                key={credential.id}
                credential={credential}
                pending={pending}
                onEdit={canEdit ? openEdit : () => undefined}
                onDelete={canEdit ? handleDelete : () => undefined}
              />
            ))}
          </div>
        )}
      </CardContent>

      {canEdit ? (
        <TeacherCredentialDialog
          open={dialogOpen}
          credential={editing}
          pending={pending}
          error={error}
          onOpenChange={(open) => {
            if (pending) return;
            setDialogOpen(open);
            if (!open) setEditing(null);
          }}
          onSubmit={(draft) => void handleSubmit(draft)}
        />
      ) : null}
    </Card>
  );
}
