"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { TeacherForm, type TeacherFormValues } from "@/components/teachers/teacher-form";
import type { ApiDepartment } from "@/lib/api/types";

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
        <SheetContent open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }} side="bottom">
          <SheetHeader>
            <SheetTitle>{isEdit ? "Edit Teacher" : "Add Teacher"}</SheetTitle>
            <SheetDescription>{isEdit ? "Update teacher information" : "Create a new teacher"}</SheetDescription>
          </SheetHeader>
          {form}
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
      <DialogContent open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }} className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Teacher" : "Add Teacher"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update teacher information" : "Create a new teacher"}</DialogDescription>
        </DialogHeader>
        <div className="p-6 pt-0">{form}</div>
      </DialogContent>
    </Dialog>
  );
}