"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { TeacherForm, type TeacherFormValues } from "@/components/teachers/teacher-form";
import type { ApiDepartment } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/locale-provider";

export function TeacherFormDialog({
  open,
  onOpenChange,
  defaultValues,
  departments,
  isEdit,
  pending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<TeacherFormValues>;
  departments?: ApiDepartment[];
  isEdit: boolean;
  pending: boolean;
  error?: { form?: string; profileImage?: string; idProof?: string };
  onSubmit: (values: TeacherFormValues, files: Array<{ documentType: "PROFILE_IMAGE" | "ID_PROOF"; file: File }>) => Promise<void>;
}) {
  const { t } = useI18n();
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)");
    setIsMobile(mediaQuery.matches);
    const handler = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const form = (
    <TeacherForm
      defaultValues={defaultValues}
      departments={departments}
      onSubmit={onSubmit}
      onCancel={() => onOpenChange(false)}
      isEdit={isEdit}
      pending={pending}
      error={error}
    />
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>{isEdit ? t("teachers.formEditTitle") : t("teachers.formAddTitle")}</SheetTitle>
            <SheetDescription>{isEdit ? t("teachers.formEditDescription") : t("teachers.formAddDescription")}</SheetDescription>
          </SheetHeader>
          {form}
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("teachers.formEditTitle") : t("teachers.formAddTitle")}</DialogTitle>
          <DialogDescription>{isEdit ? t("teachers.formEditDescription") : t("teachers.formAddDescription")}</DialogDescription>
        </DialogHeader>
        <div className="p-6 pt-0">{form}</div>
      </DialogContent>
    </Dialog>
  );
}