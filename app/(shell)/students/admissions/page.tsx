"use client";

import * as React from "react";
import { Stepper } from "@/components/ui/stepper";
import { Input, Label, Select } from "@/components/ui/input";
import { AdmissionPersonalStep, emptyPersonalForm, validatePersonalForm, type PersonalForm } from "@/components/students/admission-personal-step";
import { FilePicker } from "@/components/ui/file-picker";
import { useRouter } from "next/navigation";
import { createAdmission, getGuardian, getStudentReferenceData, listStudents, searchGuardians } from "@/lib/api/students";
import { deleteStagedFile, uploadStudentFile, type StudentDocumentType } from "@/lib/api/storage";
import type { ApiGuardianSummary, ApiReferenceData, CreateAdmissionPayload } from "@/lib/api/types";
import { toE164Sudanese, phoneError } from "@/lib/validation/phone";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EducationLevel, GRADE_BY_LEVEL, previewRoleNumber, type Grade } from "@/lib/admission";

type FileValue = { file: File; previewUrl?: string; path: string } | null;

type GuardianState = {
  mode: "create" | "link";
  fullname: string;
  phone: string;
  relationship: "FATHER" | "MOTHER" | "BROTHER" | "SISTER" | "GUARDIAN";
  password: string;
  showPw: boolean;
  idProofFile: FileValue;
  touched: Record<string, boolean>;
  searchQuery: string;
  searchResults: ApiGuardianSummary[];
  searching: boolean;
  linkedGuardian: {
    id: string;
    firstName: string;
    lastName?: string | null;
    phone?: string | null;
    students: Array<{
      relationship: string;
      student: { id: string; firstName: string; lastName?: string | null; roleNumber?: string | null; status: string };
    }>;
  } | null;
};

type EnrollmentState = {
  academicYearId: string;
  classId: string;
  field: string;
};

export const SCIENCE_FIELDS = ["COMPUTER", "BIOLOGY", "ENGINEERING"] as const;
export const ART_FIELDS = ["MILITARY_SCIENCES", "ISLAMIC_STUDIES"] as const;

export function fieldsForTrack(track: string | null): readonly string[] {
  if (track === "SCIENCE") return SCIENCE_FIELDS;
  if (track === "ART") return ART_FIELDS;
  return [];
}

function fieldLabel(field: string): string {
  return field
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

// Student grades are numeric (1,2,3 / 6,7,8,9); class grades use names.
const GRADE_NAMES: Record<Grade, string> = {
  1: "FIRST",
  2: "SECOND",
  3: "THIRD",
  6: "SIXTH",
  7: "SEVENTH",
  8: "EIGHTH",
  9: "NINTH",
};

function needsTrack(level: EducationLevel, grade: Grade): boolean {
  return level === EducationLevel.SECONDARY && (grade === 2 || grade === 3);
}

const initialGuardian: GuardianState = {
  mode: "create",
  fullname: "",
  phone: "",
  relationship: "FATHER",
  password: "",
  showPw: false,
  idProofFile: null,
  touched: {},
  searchQuery: "",
  searchResults: [],
  searching: false,
  linkedGuardian: null,
};

function missingText(value: string | undefined | null) {
  return value?.trim() ? (
    value
  ) : (
    <span className="text-muted-foreground">Not provided</span>
  );
}

function ReviewCard({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle className="text-sm">{title}</CardTitle>
        <Button type="button" variant="link" size="sm" className="h-auto px-0" onClick={onEdit}>
          Edit
        </Button>
      </CardHeader>
      <CardContent>
        <dl>{children}</dl>
      </CardContent>
    </Card>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 border-b py-1.5 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{missingText(value)}</dd>
    </div>
  );
}

function FileChip({ name, label }: { name?: string; label?: string }) {
  if (!name) {
    return <span className="text-xs text-muted-foreground">{label ? `${label}: not attached` : "Not attached"}</span>;
  }
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-xs">
      {label ? <span className="text-muted-foreground">{label}:</span> : null}
      <span className="truncate font-medium">{name}</span>
    </span>
  );
}

export default function AdmissionsPage() {
  const router = useRouter();
  const [active, setActive] = React.useState(0);
  // Personal form state lives here (not in the step): navigating between
  // steps unmounts them, and unmounted state is lost. Same pattern as guardian.
  const [personal, setPersonal] = React.useState<PersonalForm>(emptyPersonalForm);
  const [guardian, setGuardian] = React.useState<GuardianState>(initialGuardian);
  const [enrollment, setEnrollment] = React.useState<EnrollmentState>({ academicYearId: "", classId: "", field: "" });
  const [educationLevel, setEducationLevel] = React.useState<EducationLevel>(EducationLevel.SECONDARY);
  const [grade, setGradeState] = React.useState<Grade>(1);
  const [track, setTrackState] = React.useState<string | null>(null);
  const [copiedRole, setCopiedRole] = React.useState(false);
  const [referenceData, setReferenceData] = React.useState<ApiReferenceData | null>(null);
  const [existingRoleNumbers, setExistingRoleNumbers] = React.useState<string[]>([]);
  const [referenceLoading, setReferenceLoading] = React.useState(true);
  const [referenceError, setReferenceError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState("");

  /**
   * Back/forward-cache restores resurrect the whole page — step index and
   * entered data included — with no remount and no refetch. A restored wizard
   * always restarts empty on the first step instead.
   */
  const personalRef = React.useRef(personal);
  React.useEffect(() => {
    personalRef.current = personal;
  });
  const resetWizard = React.useCallback(() => {
    const current = personalRef.current;
    for (const previewUrl of [
      current.profileImage?.previewUrl,
      current.nationalNumberFile?.previewUrl,
      current.nationalCardFile?.previewUrl,
      current.passportFile?.previewUrl,
      current.transferResultFile?.previewUrl,
    ]) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    }
    setActive(0);
    setPersonal(emptyPersonalForm);
    setGuardian(initialGuardian);
    setEnrollment({ academicYearId: "", classId: "", field: "" });
    setEducationLevel(EducationLevel.SECONDARY);
    setGradeState(1);
    setTrackState(null);
    setCopiedRole(false);
    setSubmitError("");
  }, []);

  React.useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) resetWizard();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [resetWizard]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadAdmissionOptions() {
      setReferenceLoading(true);
      setReferenceError("");
      try {
        const [reference, firstPage] = await Promise.all([
          getStudentReferenceData(),
          listStudents({ page: 1, limit: 100 }),
        ]);
        const roleNumbers = [...firstPage.data.map((student) => student.roleNumber)];
        const pageCount = Math.ceil(firstPage.total / firstPage.limit);
        for (let page = 2; page <= pageCount; page += 1) {
          const nextPage = await listStudents({ page, limit: 100 });
          roleNumbers.push(...nextPage.data.map((student) => student.roleNumber));
        }
        if (cancelled) return;
        setReferenceData(reference);
        setExistingRoleNumbers(roleNumbers);
        const academicYear = reference.years.find((year) => year.isCurrent) ?? reference.years[0];
        const firstClass = reference.classes[0];
        if (academicYear && firstClass) {
          setEnrollment((current) => ({ ...current, academicYearId: academicYear.id, classId: firstClass.id }));
        }
      } catch (error) {
        if (!cancelled) setReferenceError(error instanceof Error ? error.message : "Unable to load admission options");
      } finally {
        if (!cancelled) setReferenceLoading(false);
      }
    }

    void loadAdmissionOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  // Existing-guardian search for link mode (debounced; 2+ characters).
  React.useEffect(() => {
    if (guardian.mode !== "link") return;
    const query = guardian.searchQuery.trim();
    if (query.length < 2) {
      setGuardian((current) => (current.searchResults.length === 0 && !current.searching ? current : { ...current, searchResults: [], searching: false }));
      return;
    }
    setGuardian((current) => ({ ...current, searching: true }));
    const timer = window.setTimeout(() => {
      void searchGuardians(query)
        .then((results) => {
          setGuardian((current) => ({ ...current, searchResults: results, searching: false }));
        })
        .catch(() => {
          setGuardian((current) => ({ ...current, searchResults: [], searching: false }));
        });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [guardian.mode, guardian.searchQuery]);

  async function selectLinkedGuardian(id: string) {
    const detail = await getGuardian(id);
    setGuardian((current) => ({
      ...current,
      linkedGuardian: {
        id: detail.id,
        firstName: detail.firstName,
        lastName: detail.lastName,
        phone: detail.phone,
        students: detail.students ?? [],
      },
      searchQuery: `${detail.firstName}${detail.lastName ? ` ${detail.lastName}` : ""}`,
      searchResults: [],
    }));
  }

  const availableClasses = referenceData?.classes ?? [];
  const selectedClass = availableClasses.find((schoolClass) => schoolClass.id === enrollment.classId);
  const selectedYear = referenceData?.years.find((year) => year.id === enrollment.academicYearId);

  // Level/grade/track cascade (lives in Enrollment since the move out of Personal).
  // Classes filter by the combination; track applies to SECONDARY grades 2-3 only.
  const trackRequired = needsTrack(educationLevel, grade);
  const matchingClasses = (referenceData?.classes ?? []).filter(
    (schoolClass) =>
      schoolClass.educationLevel === educationLevel &&
      schoolClass.grade === GRADE_NAMES[grade] &&
      (!trackRequired || schoolClass.track === track),
  );
  const isTransferred = personal.isTransferred;
  const roleNumber = previewRoleNumber(existingRoleNumbers, educationLevel, grade, isTransferred);

  // 2nd/3rd grade Secondary requires a field of study: SCIENCE offers
  // Computer/Biology/Engineering, ART offers Military Sciences/Islamic Studies.
  const fieldRequired = trackRequired;
  const fieldOptions = trackRequired && track ? fieldsForTrack(track) : [];

  function setGrade(next: Grade) {
    setGradeState(next);
    if (!needsTrack(educationLevel, next)) {
      setTrackState(null);
    }
    setEnrollment((current) => ({ ...current, field: "" }));
    resetClass(educationLevel, next, needsTrack(educationLevel, next) ? track : null);
  }

  function setLevel(next: EducationLevel) {
    const validGrades = GRADE_BY_LEVEL[next];
    const nextGrade = (validGrades.includes(grade) ? grade : validGrades[0]) as Grade;
    setEducationLevel(next);
    setGradeState(nextGrade);
    const nextTrack = needsTrack(next, nextGrade) ? track : null;
    setTrackState(nextTrack);
    setEnrollment((current) => ({ ...current, field: "" }));
    resetClass(next, nextGrade, nextTrack);
  }

  function setTrack(next: string | null) {
    setTrackState(next);
    setEnrollment((current) => ({ ...current, field: "" }));
    resetClass(educationLevel, grade, next);
  }

  function resetClass(level: EducationLevel, gradeValue: Grade, trackValue: string | null) {
    if (!referenceData) return;
    const match = referenceData.classes.find(
      (schoolClass) =>
        schoolClass.educationLevel === level &&
        schoolClass.grade === GRADE_NAMES[gradeValue] &&
        (needsTrack(level, gradeValue) ? schoolClass.track === trackValue : true),
    );
    setEnrollment((current) => ({
      ...current,
      classId: match?.id ?? "",
    }));
  }

  function enrollmentValidate(): true | string {
    if (!educationLevel) return "Education level required";
    if (!GRADE_BY_LEVEL[educationLevel].includes(grade)) {
      return `Grade must be ${GRADE_BY_LEVEL[educationLevel].join(", ")} for ${educationLevel}`;
    }
    if (trackRequired && !track) return "Track required for Second/Third Secondary";
    if (fieldRequired) {
      if (!track) return "Pick a track first";
      if (!enrollment.field) return `Field of study required for ${grade === 2 ? "2nd" : "3rd"} grade ${track}`;
      if (!fieldOptions.includes(enrollment.field)) return `Field must be one of ${fieldOptions.map(fieldLabel).join(", ")}`;
    }
    if (!enrollment.classId) {
      return matchingClasses.length === 0
        ? "No classes match this level, grade and track yet"
        : "Pick a class";
    }
    if (!roleNumber) return "Role number could not be generated";
    return true;
  }

  function guardianValidate(): true | string {
    if (guardian.mode === "link") {
      if (!guardian.linkedGuardian) return "Select an existing guardian from the search results";
      return true;
    }
    if (!guardian.fullname.trim()) return "Guardian full name required";
    const phoneValidationError = phoneError(guardian.phone);
    if (phoneValidationError) return phoneValidationError;
    if (!guardian.password) return "Guardian password required";
    if (guardian.password.length < 8) return "Guardian password: min 8 characters";
    if (!guardian.idProofFile) return "Guardian ID proof required (image/PDF)";
    return true;
  }

  const steps = [
    {
      id: "personal",
      label: "Personal",
      description: "Personal information and transfer details.",
      validate: () => validatePersonalForm(personal),
    },
    {
      id: "guardian",
      label: "Guardian",
      description: "Guardian details and ID proof.",
      validate: guardianValidate,
    },
    {
      id: "enrollment",
      label: "Enrollment",
      description: `Level, grade and class for ${selectedYear?.name ?? "the current academic year"}.`,
      validate: enrollmentValidate,
    },
    { id: "review", label: "Review", description: "Confirm before submit" },
  ];

  async function submit() {
    if (submitting) return;
    const personalValidation = validatePersonalForm(personal);
    if (personalValidation !== true) {
      setSubmitError(typeof personalValidation === "string" ? personalValidation : "Complete all required personal fields");
      return;
    }
    const guardianValidation = guardianValidate();
    if (guardianValidation !== true) {
      setSubmitError(guardianValidation);
      return;
    }
    if (!enrollment.academicYearId || !enrollment.classId) {
      setSubmitError("Pick a class");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    const draftId = crypto.randomUUID();
    const uploaded: Array<{ objectKey: string }> = [];
    const uploadedDocuments: CreateAdmissionPayload["documents"] = [];
    let admissionCreated = false;

    try {
      const documentInputs: Array<{ fieldId: string; documentType: StudentDocumentType; value: FileValue }> = [
        { fieldId: "profileImage", documentType: "PROFILE_IMAGE", value: personal.profileImage },
        { fieldId: "nationalNumberFile", documentType: "NATIONAL_NUMBER", value: personal.nationalNumberFile },
        { fieldId: "nationalCardFile", documentType: "NATIONAL_CARD", value: personal.nationalCardFile },
        { fieldId: "passportFile", documentType: "PASSPORT", value: personal.passportFile },
        { fieldId: "transferResultFile", documentType: "TRANSFER_RESULT", value: personal.transferResultFile },
        { fieldId: "guardianIdProof", documentType: "GUARDIAN_ID_PROOF", value: guardian.idProofFile },
      ];
      for (const input of documentInputs) {
        if (!input.value) continue;
        const stored = await uploadStudentFile({
          file: input.value.file,
          draftId,
          documentType: input.documentType,
          fieldId: input.fieldId,
        });
        uploaded.push({ objectKey: stored.objectKey });
        uploadedDocuments.push({ ...stored, documentType: input.documentType });
      }

      const studentParts = personal.fullname.trim().split(/\s+/);
      const guardianParts = guardian.fullname.trim().split(/\s+/);
      const payload: CreateAdmissionPayload = {
        draftId,
        student: {
          firstName: studentParts[0] ?? personal.fullname.trim(),
          ...(studentParts.length > 2 ? { middleName: studentParts.slice(1, -1).join(" ") } : {}),
          ...(studentParts.length > 1 ? { lastName: studentParts[studentParts.length - 1] } : {}),
          motherFullname: personal.motherFullname.trim(),
          fatherFullname: personal.fatherFullname.trim(),
          roleNumber,
          password: personal.password,
          dateOfBirth: personal.dateOfBirth,
          gender: personal.gender,
          educationLevel,
          grade,
          address: personal.address.trim(),
          ...(personal.phone.trim() ? { phone: personal.phone.trim() } : {}),
          isTransferred: personal.isTransferred,
          ...(personal.formerSchoolName.trim() ? { formerSchoolName: personal.formerSchoolName.trim() } : {}),
        },
        guardian:
          guardian.mode === "link" && guardian.linkedGuardian
            ? {
                guardianId: guardian.linkedGuardian.id,
                relationship: "GUARDIAN",
                isPrimary: true,
                canPickup: true,
                emergencyContact: false,
              }
            : {
                firstName: guardianParts[0] ?? guardian.fullname.trim(),
                ...(guardianParts.length > 1 ? { lastName: guardianParts.slice(1).join(" ") } : {}),
                phone: toE164Sudanese(guardian.phone),
                password: guardian.password,
                relationship: guardian.relationship,
                isPrimary: true,
                canPickup: true,
                emergencyContact: false,
              },
        enrollment: {
          academicYearId: enrollment.academicYearId,
          classId: enrollment.classId,
          status: "ACTIVE",
          ...(fieldRequired && enrollment.field ? { field: enrollment.field } : {}),
        },
        documents: uploadedDocuments,
      };
      const result = await createAdmission(payload);
      admissionCreated = true;
      router.push(`/students/all/${result.student.id}`);
    } catch (error) {
      if (!admissionCreated) {
        await Promise.all(uploaded.map((file) => deleteStagedFile(file.objectKey).catch(() => undefined)));
      }
      setSubmitError(error instanceof Error ? error.message : "Unable to create admission");
    } finally {
      setSubmitting(false);
    }
  }

  function changeClass(classId: string) {
    setEnrollment((current) => ({ ...current, classId }));
  }

  if (referenceLoading) {
    return <div className="rounded-lg border p-6 text-sm text-muted-foreground" role="status">Loading live admission options…</div>;
  }

  if (referenceError) {
    return <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive" role="alert">{referenceError}</div>;
  }

  if (!referenceData || !selectedYear) {
    return <div className="rounded-lg border p-6 text-sm text-muted-foreground">No current academic year with an eligible class is configured.</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Admissions</h1>
        <p className="text-sm text-muted-foreground">Wizard: Personal → Guardian → Enrollment → Review. Records are created in the live Academic API.</p>
      </div>
      {submitError ? <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{submitError}</div> : null}
      {submitting ? <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground" role="status" aria-live="polite">Uploading documents and creating admission…</div> : null}
      <Stepper steps={steps} active={active} onStepChange={setActive} onComplete={() => void submit()}>
        {(idx) => (
          <>
            {idx === 0 ? <AdmissionPersonalStep values={personal} onChange={setPersonal} /> : null}
            {idx === 1 ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant={guardian.mode === "create" ? "default" : "outline"}
                    onClick={() => setGuardian((current) => ({ ...current, mode: "create" }))}
                  >
                    Create new guardian
                  </Button>
                  <Button
                    type="button"
                    variant={guardian.mode === "link" ? "default" : "outline"}
                    onClick={() => setGuardian((current) => ({ ...current, mode: "link" }))}
                  >
                    Link existing guardian
                  </Button>
                </div>
                {guardian.mode === "link" ? (
                  <div className="space-y-3 rounded-lg border p-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="guardianSearch">Search existing guardian *</Label>
                      <Input
                        id="guardianSearch"
                        value={guardian.searchQuery}
                        onChange={(event) => setGuardian((current) => ({ ...current, searchQuery: event.target.value, linkedGuardian: null }))}
                        placeholder="Type a name or phone number (min 2 characters)"
                      />
                      {guardian.searching ? <p className="text-xs text-muted-foreground">Searching…</p> : null}
                      {!guardian.searching && guardian.searchQuery.trim().length >= 2 && guardian.searchResults.length === 0 && !guardian.linkedGuardian ? (
                        <p className="text-xs text-muted-foreground">No guardians found — switch to “Create new guardian” to register one.</p>
                      ) : null}
                    </div>
                    {guardian.searchResults.length > 0 ? (
                      <ul className="divide-y rounded-lg border">
                        {guardian.searchResults.map((result) => (
                          <li key={result.id}>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
                              onClick={() => void selectLinkedGuardian(result.id).catch(() => undefined)}
                            >
                              <span className="font-medium">{result.firstName}{result.lastName ? ` ${result.lastName}` : ""}</span>
                              {result.phone ? <span className="text-muted-foreground">{result.phone}</span> : null}
                              <Badge variant="secondary" className="ml-auto text-xs">
                                {result._count.students} student{result._count.students === 1 ? "" : "s"}
                              </Badge>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {guardian.linkedGuardian ? (
                      <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {guardian.linkedGuardian.firstName}{guardian.linkedGuardian.lastName ? ` ${guardian.linkedGuardian.lastName}` : ""}
                          </span>
                          {guardian.linkedGuardian.phone ? <span className="text-muted-foreground">{guardian.linkedGuardian.phone}</span> : null}
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="ml-auto h-auto px-0"
                            onClick={() => setGuardian((current) => ({ ...current, linkedGuardian: null, searchQuery: "", searchResults: [] }))}
                          >
                            Choose a different guardian
                          </Button>
                        </div>
                        {guardian.linkedGuardian.students.length > 0 ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Already linked to {guardian.linkedGuardian.students.length} student{guardian.linkedGuardian.students.length === 1 ? "" : "s"}:{" "}
                            {guardian.linkedGuardian.students.map((link) => link.student.roleNumber ?? `${link.student.firstName} ${link.student.lastName ?? ""}`.trim()).join(", ")}. The new student will join this family.
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-muted-foreground">No students linked yet — this will be the first.</p>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  {guardian.mode === "create" ? (
                  <>
                  <div className="space-y-1.5">
                    <Label htmlFor="guardianFullname">Full name *</Label>
                    <Input
                      id="guardianFullname"
                      value={guardian.fullname}
                      onBlur={() => setGuardian((current) => ({ ...current, touched: { ...current.touched, fullname: true } }))}
                      onChange={(event) => setGuardian((current) => ({ ...current, fullname: event.target.value }))}
                      placeholder="Amina Hassan"
                      aria-invalid={guardian.touched.fullname && !guardian.fullname.trim() ? true : undefined}
                    />
                    {guardian.touched.fullname && !guardian.fullname.trim() ? <p className="text-xs text-destructive">Guardian full name required</p> : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="guardianPhone">Phone (Sudanese) *</Label>
                    <Input
                      id="guardianPhone"
                      type="tel"
                      inputMode="tel"
                      value={guardian.phone}
                      onBlur={() => setGuardian((current) => ({ ...current, touched: { ...current.touched, phone: true } }))}
                      onChange={(event) => setGuardian((current) => ({ ...current, phone: event.target.value }))}
                      placeholder="+249 91 234 5678"
                      aria-invalid={guardian.touched.phone && !!phoneError(guardian.phone) ? true : undefined}
                    />
                    {guardian.touched.phone && phoneError(guardian.phone) ? <p className="text-xs text-destructive">{phoneError(guardian.phone)}</p> : <p className="text-xs text-muted-foreground">Sudanese mobile: +249 9XXXXXXXX or 09XXXXXXXX</p>}
                  </div>
                  </>
                  ) : null}
                  {guardian.mode === "create" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="guardianRelationship">Relationship *</Label>
                    <Select id="guardianRelationship" value={guardian.relationship} onChange={(event) => setGuardian((current) => ({ ...current, relationship: event.target.value as GuardianState["relationship"] }))}>
                      <option value="FATHER">Father</option>
                      <option value="MOTHER">Mother</option>
                      <option value="BROTHER">Brother</option>
                      <option value="SISTER">Sister</option>
                      <option value="GUARDIAN">Guardian</option>
                    </Select>
                  </div>
                  ) : null}
                  {guardian.mode === "create" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="guardianPassword">Password *</Label>
                    <div className="relative">
                      <Input
                        id="guardianPassword"
                        type={guardian.showPw ? "text" : "password"}
                        value={guardian.password}
                        onBlur={() => setGuardian((current) => ({ ...current, touched: { ...current.touched, password: true } }))}
                        onChange={(event) => setGuardian((current) => ({ ...current, password: event.target.value }))}
                        placeholder="Min 8 characters"
                        autoComplete="new-password"
                        className="pr-10"
                        aria-invalid={guardian.touched.password && guardian.password.length < 8 ? true : undefined}
                      />
                      <button type="button" aria-label={guardian.showPw ? "Hide password" : "Show password"} onClick={() => setGuardian((current) => ({ ...current, showPw: !current.showPw }))} className="absolute right-2 top-2 size-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground">
                        {guardian.showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <div className="flex gap-1 mt-1">
                      {(() => {
                        let strength = 0;
                        if (guardian.password.length >= 8) strength += 1;
                        if (/[A-Z]/.test(guardian.password) && /[a-z]/.test(guardian.password)) strength += 1;
                        if (/\d/.test(guardian.password)) strength += 1;
                        if (/[^A-Za-z0-9]/.test(guardian.password)) strength += 1;
                        return Array.from({ length: 4 }).map((_, index) => <div key={index} className={`h-1 flex-1 rounded ${index < strength ? (strength >= 3 ? "bg-success" : "bg-warning") : "bg-muted"}`} />);
                      })()}
                    </div>
                    {guardian.touched.password && guardian.password.length < 8 ? <p className="text-xs text-destructive">Guardian password: min 8 characters</p> : <p className="text-xs text-muted-foreground">Min 8, masked in logs</p>}
                  </div>
                  ) : null}
                </div>
                {guardian.mode === "create" ? (
                <FilePicker id="guardianIdProof" label="ID proof" accept="image/*,application/pdf" maxSizeMB={10} required value={guardian.idProofFile} onChange={(value) => setGuardian((current) => ({ ...current, idProofFile: value, touched: { ...current.touched, idProofFile: true } }))} helperText="Image or PDF, max 10MB — required" error={guardian.touched.idProofFile && !guardian.idProofFile ? "Guardian ID proof required (image/PDF)" : undefined} />
                ) : null}
                {guardian.mode === "create" ? (
                  <p className="text-xs text-muted-foreground">The guardian account is created with the password sent to the API; the password is never returned or stored in plaintext. A guardian ID (e.g. 26CPG0001) is assigned automatically on submit.</p>
                ) : (
                  <p className="text-xs text-muted-foreground">The student is linked to the selected guardian on submit — no new guardian account is created. Siblings admitted under the same guardian stay connected for monitoring.</p>
                )}
              </div>
            ) : null}
            {idx === 2 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="educationLevel">Education level *</Label>
                  <Select id="educationLevel" value={educationLevel} onChange={(event) => setLevel(event.target.value as EducationLevel)}>
                    {Object.values(EducationLevel).map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </Select>
                  <p className="text-xs text-muted-foreground">SECONDARY → 1,2,3 · INTERMEDIATE → 6,7,8,9</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="grade">Grade *</Label>
                  <Select id="grade" value={String(grade)} onChange={(event) => setGrade(Number(event.target.value) as Grade)}>
                    {GRADE_BY_LEVEL[educationLevel].map((n) => (
                      <option key={n} value={String(n)}>{n}</option>
                    ))}
                  </Select>
                </div>
                {trackRequired ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="track">Track *</Label>
                    <Select id="track" value={track ?? ""} onChange={(event) => setTrack(event.target.value || null)}>
                      <option value="">Select track</option>
                      <option value="ART">ART</option>
                      <option value="SCIENCE">SCIENCE</option>
                    </Select>
                  </div>
                ) : null}
                {fieldRequired ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="field">Field of study *</Label>
                    <Select
                      id="field"
                      value={enrollment.field}
                      onChange={(event) => setEnrollment((current) => ({ ...current, field: event.target.value }))}
                    >
                      <option value="">{track ? "Select field" : "Select a track first"}</option>
                      {fieldOptions.map((option) => (
                        <option key={option} value={option}>{fieldLabel(option)}</option>
                      ))}
                    </Select>
                  </div>
                ) : null}
                <div className="space-y-1.5">
                  <Label htmlFor="classId">Class</Label>
                  <Select id="classId" value={enrollment.classId} onChange={(event) => changeClass(event.target.value)}>
                    {matchingClasses.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.className}</option>)}
                  </Select>
                  {matchingClasses.length === 0 ? <p className="text-xs text-destructive">No classes match this level, grade{trackRequired ? " and track" : ""} yet.</p> : null}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="roleNumber">Role number *</Label>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 rounded-lg border bg-muted px-3 py-2">
                      <span className="font-mono text-sm font-medium tracking-wider">{roleNumber}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {isTransferred ? "Transfer T" : "Regular R"}
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Copy role number"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(roleNumber);
                          setCopiedRole(true);
                          setTimeout(() => setCopiedRole(false), 1200);
                        } catch {
                          setCopiedRole(true);
                          setTimeout(() => setCopiedRole(false), 1200);
                        }
                      }}
                    >
                      {copiedRole ? <Check size={16} /> : <Copy size={16} />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Auto-generated from level, grade and transfer status.</p>
                </div>
                <p className="sm:col-span-2 text-xs text-muted-foreground">Enrollment is for {selectedYear.name}. The backend verifies the tenant, year, and class before creating the record.</p>
              </div>
            ) : null}
            {idx === 3 ? (
              <div className="space-y-4">
                <ReviewCard
                  title="Personal"
                  onEdit={() => setActive(0)}
                >
                  <ReviewRow label="Full name" value={personal.fullname} />
                  <ReviewRow label="Mother" value={personal.motherFullname} />
                  <ReviewRow label="Father" value={personal.fatherFullname} />
                  <ReviewRow label="Date of birth" value={personal.dateOfBirth} />
                  <ReviewRow label="Gender" value={personal.gender ? personal.gender.charAt(0) + personal.gender.slice(1).toLowerCase() : ""} />
                  <ReviewRow label="Address" value={personal.address} />
                  <ReviewRow label="Phone" value={personal.phone} />
                  <ReviewRow
                    label="Transfer"
                    value={personal.isTransferred ? `Yes — ${personal.formerSchoolName || "former school missing"}` : "No"}
                  />
                  <div className="grid grid-cols-[140px_1fr] gap-2 py-1 text-sm">
                    <dt className="text-muted-foreground">Documents</dt>
                    <dd className="flex min-w-0 flex-wrap gap-1.5">
                      <FileChip name={personal.profileImage?.file.name} label="Profile" />
                      <FileChip name={personal.nationalNumberFile?.file.name} label="National no." />
                      <FileChip name={personal.nationalCardFile?.file.name} label="National card" />
                      <FileChip name={personal.passportFile?.file.name} label="Passport" />
                      {personal.isTransferred ? <FileChip name={personal.transferResultFile?.file.name} label="Transfer result" /> : null}
                    </dd>
                  </div>
                </ReviewCard>

                <ReviewCard title={guardian.mode === "link" ? "Guardian (linked)" : "Guardian"} onEdit={() => setActive(1)}>
                  {guardian.mode === "link" && guardian.linkedGuardian ? (
                    <>
                      <ReviewRow
                        label="Full name"
                        value={`${guardian.linkedGuardian.firstName}${guardian.linkedGuardian.lastName ? ` ${guardian.linkedGuardian.lastName}` : ""}`}
                      />
                      <ReviewRow label="Relationship" value="Guardian" />
                      <ReviewRow label="Phone" value={guardian.linkedGuardian.phone ?? ""} />
                      <ReviewRow
                        label="Linked students"
                        value={
                          guardian.linkedGuardian.students.length > 0
                            ? guardian.linkedGuardian.students
                                .map((link) => link.student.roleNumber ?? `${link.student.firstName} ${link.student.lastName ?? ""}`.trim())
                                .join(", ")
                            : "First student for this guardian"
                        }
                      />
                    </>
                  ) : (
                    <>
                      <ReviewRow label="Full name" value={guardian.fullname} />
                      <ReviewRow
                        label="Relationship"
                        value={guardian.relationship ? guardian.relationship.charAt(0) + guardian.relationship.slice(1).toLowerCase() : ""}
                      />
                      <ReviewRow label="Phone" value={guardian.phone ? toE164Sudanese(guardian.phone) : ""} />
                    </>
                  )}
                  <div className="grid grid-cols-[140px_1fr] gap-2 py-1 text-sm">
                    <dt className="text-muted-foreground">ID proof</dt>
                    <dd className="flex min-w-0 flex-wrap gap-1.5">
                      <FileChip name={guardian.idProofFile?.file.name} />
                    </dd>
                  </div>
                </ReviewCard>

                <ReviewCard title="Enrollment" onEdit={() => setActive(2)}>
                  <ReviewRow label="Level" value={educationLevel} />
                  <ReviewRow label="Grade" value={String(grade)} />
                  {trackRequired ? <ReviewRow label="Track" value={track ?? ""} /> : null}
                  {fieldRequired ? <ReviewRow label="Field" value={enrollment.field ? fieldLabel(enrollment.field) : ""} /> : null}
                  <ReviewRow label="Class" value={selectedClass?.className ?? "—"} />
                  <ReviewRow label="Year" value={selectedYear.name} />
                  <div className="grid grid-cols-[140px_1fr] gap-2 py-1 text-sm">
                    <dt className="text-muted-foreground">Role number</dt>
                    <dd>
                      <span className="font-mono text-sm font-medium tracking-wider">{roleNumber}</span>
                      <Badge variant="secondary" className="ml-2 text-xs">{isTransferred ? "Transfer T" : "Regular R"}</Badge>
                    </dd>
                  </div>
                </ReviewCard>

                <p className="text-xs text-muted-foreground">Submitting uploads the selected files, creates the student, guardian, enrollment, and document records atomically, and then opens the live student record.</p>
              </div>
            ) : null}
          </>
        )}
      </Stepper>
    </div>
  );
}
