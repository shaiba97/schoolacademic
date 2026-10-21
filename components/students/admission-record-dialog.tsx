"use client";

import * as React from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { listStudentGuardians } from "@/lib/api/students";
import type { ApiStudent, ApiStudentGuardianLink } from "@/lib/api/types";
import { studentFullName } from "@/lib/api/mappers";
import { formatAcademicDate } from "@/components/academics/academic-utils";

export function AdmissionRecordDialog({
  student,
  open,
  onOpenChange,
}: {
  student: ApiStudent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [guardians, setGuardians] = React.useState<ApiStudentGuardianLink[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || !student) return;
    setGuardians([]);
    setLoading(true);
    listStudentGuardians(student.id)
      .then(setGuardians)
      .catch(() => setGuardians([]))
      .finally(() => setLoading(false));
  }, [open, student]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Admission record</DialogTitle>
          <DialogDescription>
            {student ? `${studentFullName(student)} · ${student.roleNumber}` : ""}
          </DialogDescription>
        </DialogHeader>
        {student ? (
          <dl className="space-y-2 text-sm">
            <div className="flex gap-2"><dt className="text-muted-foreground w-32 shrink-0">Full name</dt><dd className="font-medium">{studentFullName(student)}</dd></div>
            <div className="flex gap-2"><dt className="text-muted-foreground w-32 shrink-0">Role number</dt><dd className="font-mono text-xs">{student.roleNumber}</dd></div>
            <div className="flex gap-2"><dt className="text-muted-foreground w-32 shrink-0">Date of birth</dt><dd>{formatAcademicDate(student.dateOfBirth)}</dd></div>
            <div className="flex gap-2"><dt className="text-muted-foreground w-32 shrink-0">Gender</dt><dd>{student.gender ?? "—"}</dd></div>
            <div className="flex gap-2"><dt className="text-muted-foreground w-32 shrink-0">Level / Grade</dt><dd>{student.educationLevel ?? "—"}{student.grade != null ? ` · Grade ${student.grade}` : ""}</dd></div>
            <div className="flex gap-2"><dt className="text-muted-foreground w-32 shrink-0">Phone</dt><dd className="font-mono text-xs">{student.phone ?? "—"}</dd></div>
            <div className="flex gap-2"><dt className="text-muted-foreground w-32 shrink-0">Address</dt><dd>{student.address ?? "—"}</dd></div>
            <div className="flex gap-2"><dt className="text-muted-foreground w-32 shrink-0">Status</dt><dd>{student.status}</dd></div>
            <div className="flex gap-2"><dt className="text-muted-foreground w-32 shrink-0">Joined</dt><dd>{formatAcademicDate(student.admissionDate ?? student.createdAt)}</dd></div>
            <div className="flex gap-2"><dt className="text-muted-foreground w-32 shrink-0">Guardians</dt>
              <dd>
                {loading ? (
                  <span className="text-muted-foreground">Loading…</span>
                ) : guardians.length === 0 ? (
                  <span className="text-muted-foreground">None linked</span>
                ) : (
                  <ul className="space-y-1">
                    {guardians.map((link) => (
                      <li key={link.guardianId}>
                        {link.guardian.firstName} {link.guardian.lastName ?? ""}
                        <span className="text-muted-foreground"> · {link.relationship}{link.isPrimary ? " · Primary" : ""}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
          </dl>
        ) : null}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer size={14} /> Print
          </Button>
          <Button type="button" onClick={() => window.print()}>
            <Download size={14} /> Download PDF
          </Button>
        </DialogFooter>
        <p className="text-xs text-muted-foreground">Download opens the print dialog — choose “Save as PDF”.</p>
      </DialogContent>
    </Dialog>
  );
}
