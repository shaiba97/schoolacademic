"use client";

import * as React from "react";
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
import { AdmissionRecordDialog } from "@/components/students/admission-record-dialog";
import { archiveStudent, deleteStudent, updateStudentStatus } from "@/lib/api/students";
import type { ApiStudent } from "@/lib/api/types";
import { studentFullName } from "@/lib/api/mappers";
import { academicErrorMessage } from "@/components/academics/academic-utils";
import { useI18n } from "@/lib/i18n/locale-provider";

export function studentStatusBadgeVariant(
  status: string,
): "success" | "info" | "purple" | "warning" | "destructive" | "muted" {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "GRADUATED":
      return "purple";
    case "POSTPONED":
      return "warning";
    case "FIRED":
      return "destructive";
    default:
      return "muted";
  }
}

export type StatusMode = "FIRE" | "POSTPONE";

/**
 * Shared student action flows (status changes with required reasons,
 * guarded delete, admission record dialog, transfer/archive navigation).
 * Used by both the students table and the student details page so the two
 * surfaces behave identically. Mutations report back through `onChanged`
 * (refresh with the updated record) and `onError` (banner message).
 */
export function useStudentActions({
  onChanged,
  onError,
  onDeleted,
}: {
  onChanged: (updated: ApiStudent) => void;
  onError: (message: string) => void;
  onDeleted?: (deletedId: string) => void;
}) {
  const { t } = useI18n();
  const [statusTarget, setStatusTarget] = React.useState<{ student: ApiStudent; mode: StatusMode } | null>(null);
  const [statusReason, setStatusReason] = React.useState("");
  const [statusPending, setStatusPending] = React.useState(false);
  const [statusError, setStatusError] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<ApiStudent | null>(null);
  const [deletePending, setDeletePending] = React.useState(false);
  const [archiveTarget, setArchiveTarget] = React.useState<ApiStudent | null>(null);
  const [archivePending, setArchivePending] = React.useState(false);
  const [admissionTarget, setAdmissionTarget] = React.useState<ApiStudent | null>(null);
  const [actionPending] = React.useState(false);

  async function handleStatusConfirm() {
    if (!statusTarget || statusPending) return;
    if (!statusReason.trim()) {
      setStatusError(t("students.reasonRequired"));
      return;
    }
    setStatusPending(true);
    setStatusError("");
    try {
      const updated = await updateStudentStatus(statusTarget.student.id, {
        status: statusTarget.mode === "FIRE" ? "FIRED" : "POSTPONED",
        reason: statusReason.trim(),
      });
      onChanged(updated);
      setStatusTarget(null);
      setStatusReason("");
    } catch (cause) {
      setStatusError(academicErrorMessage(cause, t("students.errorStatusUpdate")));
    } finally {
      setStatusPending(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || deletePending) return;
    setDeletePending(true);
    try {
      await deleteStudent(deleteTarget.id);
      const id = deleteTarget.id;
      setDeleteTarget(null);
      if (onDeleted) onDeleted(id);
      else onChanged({ ...deleteTarget });
    } catch (cause) {
      onError(academicErrorMessage(cause, t("students.errorDeleteFailed")));
      setDeleteTarget(null);
    } finally {
      setDeletePending(false);
    }
  }

  async function handleArchiveConfirm() {
    if (!archiveTarget || archivePending) return;
    setArchivePending(true);
    try {
      const updated = await archiveStudent(archiveTarget.id);
      onChanged(updated);
      setArchiveTarget(null);
    } catch (cause) {
      onError(academicErrorMessage(cause, t("students.errorArchiveFailed")));
      setArchiveTarget(null);
    } finally {
      setArchivePending(false);
    }
  }

  function openArchive(student: ApiStudent) {
    setArchiveTarget(student);
  }

  function openStatus(student: ApiStudent, mode: StatusMode) {
    setStatusTarget({ student, mode });
    setStatusReason("");
    setStatusError("");
  }

  function openDelete(student: ApiStudent) {
    setDeleteTarget(student);
  }

  function openAdmission(student: ApiStudent) {
    setAdmissionTarget(student);
  }

  const dialogs = (
    <>
      <AlertDialog
        open={!!archiveTarget}
        onOpenChange={(open) => {
          if (!open && !archivePending) setArchiveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("students.archiveTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {archiveTarget
                ? t("students.archiveDescription", { name: studentFullName(archiveTarget) })
                : t("students.archiveFallback")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setArchiveTarget(null)}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleArchiveConfirm()}>
              {archivePending ? t("students.archiving") : t("students.actionArchive")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!statusTarget}
        onOpenChange={(open) => {
          if (!open && !statusPending) {
            setStatusTarget(null);
            setStatusReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusTarget?.mode === "FIRE" ? t("students.statusFireTitle") : t("students.statusPostponeTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusTarget
                ? t("students.statusDescription", {
                    name: studentFullName(statusTarget.student),
                    status:
                      statusTarget.mode === "FIRE"
                        ? t("students.statusFired")
                        : t("students.statusPostponed"),
                  })
                : t("students.statusFallback")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label htmlFor="student-status-reason" className="text-sm font-medium">{t("students.reasonLabel")}</label>
            <Input
              id="student-status-reason"
              value={statusReason}
              onChange={(event) => setStatusReason(event.target.value)}
              placeholder={t("students.reasonPlaceholder")}
              autoFocus
            />
            {statusError ? (
              <p role="alert" className="text-sm text-destructive">{statusError}</p>
            ) : null}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStatusTarget(null)}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleStatusConfirm()}>
              {statusPending
                ? t("common.saving")
                : statusTarget?.mode === "FIRE"
                  ? t("students.actionFire")
                  : t("students.actionPostpone")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deletePending) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("students.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? t("students.deleteDescription", { name: studentFullName(deleteTarget) })
                : t("students.deleteFallback")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>
              {deletePending ? t("students.deletingEllipsis") : t("students.deletePermanently")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AdmissionRecordDialog
        student={admissionTarget}
        open={!!admissionTarget}
        onOpenChange={(open) => {
          if (!open) setAdmissionTarget(null);
        }}
      />
    </>
  );

  return {
    dialogs,
    actionPending,
    openStatus,
    openDelete,
    openAdmission,
    openArchive,
    archive: handleArchiveConfirm,
  };
}
