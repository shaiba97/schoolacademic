"use client";

import * as React from "react";
import { Download, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n/locale-provider";
import { formatAcademicDate } from "@/components/academics/academic-utils";
import { studentFullName } from "@/lib/api/mappers";
import type { ApiStudent } from "@/lib/api/types";

export function AdmissionRecordDialog({
  student,
  open,
  onOpenChange,
}: {
  student: ApiStudent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const [showingEnglish, setShowingEnglish] = React.useState(true);

  const generateEnglishLetter = (s: ApiStudent) => {
    const name = studentFullName(s);
    const rollNo = s.roleNumber ?? "—";
    const dob = formatAcademicDate(s.dateOfBirth);
    const gender = s.gender ?? "—";
    const level = s.educationLevel ?? "—";
    const grade = s.grade ?? "—";
    const joined = formatAcademicDate(s.admissionDate ?? s.createdAt);
    return `This is to certify that ${name}, Roll number ${rollNo}, born on ${dob} (${gender}), has been officially admitted and accepted into ${level} · Grade ${grade} at our institution, effective ${joined}.`;
  };

  const generateArabicLetter = (s: ApiStudent) => {
    const name = studentFullName(s);
    const rollNo = s.roleNumber ?? "—";
    const dob = formatAcademicDate(s.dateOfBirth);
    const gender = s.gender ?? "—";
    const level = s.educationLevel ?? "—";
    const grade = s.grade ?? "—";
    const joined = formatAcademicDate(s.admissionDate ?? s.createdAt);
    return `يشهد بأنه ${name} (رقم القيد: ${rollNo}) المولود بتاريخ ${dob} (${gender})، قد تم قبوله رسمياً في ${level} · الصف ${grade} بمؤسستنا التعليمية واعتماده ${joined}.`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("admission.letterHeader")}</DialogTitle>
          <DialogDescription>{student ? `${studentFullName(student)} · ${student.roleNumber}` : ""}</DialogDescription>
          <DialogFooter className="justify-between">
            <Button
              variant="outline"
              onClick={() => setShowingEnglish(!showingEnglish)}
            >
              {showingEnglish ? t("admission.toggleArabic") : t("admission.toggleEnglish")}
            </Button>
          </DialogFooter>
        </DialogHeader>

        {student ? (
          <div className="space-y-6 text-sm">
            {showingEnglish ? (
              <div className="rounded-lg border p-4 text-left">
                <p className="font-medium text-primary">{t("admission.letterEnglish")}</p>
                <p dangerouslySetInnerHTML={{ __html: generateEnglishLetter(student) }} className="mt-2 text-muted-foreground break-all" />
              </div>
            ) : null}
            {!showingEnglish ? (
              <div className="rounded-lg border p-4 text-right">
                <p className="font-medium text-primary">{t("admission.letterArabic")}</p>
                <p dangerouslySetInnerHTML={{ __html: generateArabicLetter(student) }} className="mt-2 text-muted-foreground break-all" />
              </div>
            ) : null}
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0" style={{ marginTop: "-1rem" }}>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer size={14} /> {t("common.print")}
          </Button>
          <Button type="button" onClick={() => window.print()}>
            <Download size={14} /> {t("admission.downloadPdf")}
          </Button>
        </DialogFooter>
        <p className="text-xs text-muted-foreground">{t("admission.downloadHint")}</p>
      </DialogContent>
    </Dialog>
  );
}