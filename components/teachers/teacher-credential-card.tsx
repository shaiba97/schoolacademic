"use client";

import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { DocumentViewer } from "@/components/documents/document-viewer";
import { sourceLabel } from "@/components/teachers/teacher-credential-dialog";
import type { ApiTeacherCredential } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/locale-provider";

/**
 * One document = one ID card. The card owns the document's name and origin;
 * viewing, printing and downloading are delegated to the shared viewer so
 * every card sizes its file the same way.
 */
export function TeacherCredentialCard({
  credential,
  pending,
  onEdit,
  onDelete,
}: {
  credential: ApiTeacherCredential;
  pending?: boolean;
  onEdit: (credential: ApiTeacherCredential) => void;
  onDelete: (credential: ApiTeacherCredential) => void;
}) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const { t } = useI18n();

  return (
    <Card className="flex flex-col">
      <CardHeader className="gap-1 pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm leading-snug">{credential.title}</CardTitle>
          <Badge variant={credential.source === "TEACHER" ? "info" : "muted"} className="shrink-0">
            {credential.source === "TEACHER" ? t("teachers.sourceTeacher") : t("teachers.sourceAcademicAffairs")}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{sourceLabel(credential.source, t)}</p>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        <DocumentViewer document={credential} className="flex-1" />

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onEdit(credential)}
            disabled={pending}
          >
            <Pencil size={14} aria-hidden /> {t("teachers.rowEdit")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setConfirmOpen(true)}
            disabled={pending}
            aria-label={t("teachers.ariaDeleteDoc", { title: credential.title })}
          >
            <Trash2 size={14} aria-hidden /> {t("teachers.actionDeleteDoc")}
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("teachers.dialogDeleteDocTitle", { title: credential.title })}</AlertDialogTitle>
            <AlertDialogDescription>{t("teachers.dialogDeleteDocDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                onDelete(credential);
              }}
            >
              {t("teachers.actionDeleteDoc")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
