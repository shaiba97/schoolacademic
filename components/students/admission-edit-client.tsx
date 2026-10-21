"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Stepper } from "@/components/ui/stepper";
import { Label, Select } from "@/components/ui/input";
import {
  AdmissionPersonalStep,
  emptyPersonalForm,
  validatePersonalForm,
  type PersonalForm,
} from "@/components/students/admission-personal-step";
import { GuardiansTab } from "@/components/students/student-detail-client";
import {
  enrollStudent,
  getStudentReferenceData,
  transferStudent,
  updateStudent,
} from "@/lib/api/students";
import type {
  ApiReferenceData,
  ApiStudent,
  ApiStudentGuardianLink,
} from "@/lib/api/types";
import { EducationLevel, GRADE_BY_LEVEL, type Grade } from "@/lib/admission";
import { studentFullName } from "@/lib/api/mappers";
import { academicErrorMessage } from "@/components/academics/academic-utils";

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

function splitName(fullname: string): { firstName: string; middleName?: string; lastName?: string } {
  const parts = fullname.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? fullname.trim(),
    ...(parts.length > 2 ? { middleName: parts.slice(1, -1).join(" ") } : {}),
    ...(parts.length > 1 ? { lastName: parts[parts.length - 1] } : {}),
  };
}

export function AdmissionEditClient({
  student,
  initialGuardians,
}: {
  student: ApiStudent;
  initialGuardians: ApiStudentGuardianLink[];
}) {
  const router = useRouter();
  const [active, setActive] = React.useState(0);

  const [personal, setPersonal] = React.useState<PersonalForm>(() => ({
    ...emptyPersonalForm,
    fullname: studentFullName(student),
    motherFullname: student.motherFullname ?? "",
    fatherFullname: student.fatherFullname ?? "",
    dateOfBirth: student.dateOfBirth?.slice(0, 10) ?? "",
    gender: (student.gender as PersonalForm["gender"]) ?? "MALE",
    address: student.address ?? "",
    phone: student.phone ?? "",
    isTransferred: student.isTransferred,
    formerSchoolName: student.formerSchoolName ?? "",
  }));

  const [educationLevel, setEducationLevel] = React.useState<EducationLevel>(
    (student.educationLevel as EducationLevel) ?? EducationLevel.SECONDARY,
  );
  const [grade, setGradeState] = React.useState<Grade>(
    typeof student.grade === "number" ? (student.grade as Grade) : 1,
  );
  const [track, setTrackState] = React.useState<string | null>(null);

  const [referenceData, setReferenceData] = React.useState<ApiReferenceData | null>(null);
  const [academicYearId, setAcademicYearId] = React.useState("");
  const [classId, setClassId] = React.useState("");
  const [field, setField] = React.useState("");
  const [original, setOriginal] = React.useState({ academicYearId: "", classId: "" });
  const [referenceError, setReferenceError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([getStudentReferenceData()])
      .then(([reference]) => {
        if (cancelled) return;
        setReferenceData(reference);
        const current = (student.enrollments ?? []).find((e) => e.status === "ACTIVE") ?? student.enrollments?.[0];
        const yearId = current?.academicYear?.id ?? reference.years.find((y) => y.isCurrent)?.id ?? reference.years[0]?.id ?? "";
        const resolvedClassId = current?.schoolClass?.id ?? "";
        setAcademicYearId(yearId);
        setClassId(resolvedClassId);
        setOriginal({ academicYearId: yearId, classId: resolvedClassId });
        const embeddedTrack = current?.schoolClass?.track ?? null;
        if (embeddedTrack && needsTrack(educationLevel, grade)) {
          setTrackState(embeddedTrack);
        }
      })
      .catch((cause) => {
        if (!cancelled) setReferenceError(academicErrorMessage(cause, "Unable to load reference data"));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trackRequired = needsTrack(educationLevel, grade);
  const matchingClasses = (referenceData?.classes ?? []).filter(
    (schoolClass) =>
      schoolClass.educationLevel === educationLevel &&
      schoolClass.grade === GRADE_NAMES[grade] &&
      (!trackRequired || schoolClass.track === track),
  );
  function setGrade(next: Grade) {
    setGradeState(next);
    if (!needsTrack(educationLevel, next)) setTrackState(null);
    setField("");
    setClassId("");
  }

  function setLevel(next: EducationLevel) {
    const validGrades = GRADE_BY_LEVEL[next];
    const nextGrade = (validGrades.includes(grade) ? grade : validGrades[0]) as Grade;
    setEducationLevel(next);
    setGradeState(nextGrade);
    if (!needsTrack(next, nextGrade)) setTrackState(null);
    setField("");
    setClassId("");
  }

  function setTrack(next: string | null) {
    setTrackState(next);
    setField("");
    setClassId("");
  }

  // 3rd grade Secondary requires a field of study (SCIENCE: Computer /
  // Biology / Engineering; ART: Military Sciences / Islamic Studies).
  // Only the enroll-anew path carries it; class-only transfers keep the
  // existing field untouched.
  const fieldRequired =
    educationLevel === EducationLevel.SECONDARY && grade === 3 && academicYearId !== original.academicYearId;
  const fieldOptions = track === "SCIENCE"
    ? ["COMPUTER", "BIOLOGY", "ENGINEERING"]
    : track === "ART"
      ? ["MILITARY_SCIENCES", "ISLAMIC_STUDIES"]
      : [];

  function enrollmentValidate(): true | string {
    if (!GRADE_BY_LEVEL[educationLevel].includes(grade)) return "Grade does not match the education level";
    if (trackRequired && !track) return "Track required for Second/Third Secondary";
    if (!academicYearId) return "Pick an academic year";
    if (!classId) {
      return matchingClasses.length === 0 ? "No classes match this level, grade and track yet" : "Pick a class";
    }
    if (fieldRequired) {
      if (!field) return "Field of study required for 3rd grade Secondary";
      if (!fieldOptions.includes(field)) return `Field must be one of ${fieldOptions.join(", ")}`;
    }
    return true;
  }

  const steps = [
    {
      id: "personal",
      label: "Personal",
      description: "Personal information (account password and documents are managed separately).",
      validate: () => validatePersonalForm(personal, true),
    },
    {
      id: "guardians",
      label: "Guardians",
      description: "Guardians save immediately as you edit them.",
    },
    {
      id: "enrollment",
      label: "Enrollment",
      description: "Level, grade and class. Changing class transfers; changing year enrolls anew.",
      validate: enrollmentValidate,
    },
    { id: "review", label: "Review", description: "Confirm before saving changes" },
  ];

  async function submit() {
    if (submitting) return;
    const personalValidation = validatePersonalForm(personal, true);
    if (personalValidation !== true) {
      setSubmitError(typeof personalValidation === "string" ? personalValidation : "Complete all required personal fields");
      return;
    }
    // Enrollment ops run only when enrollment actually changed. Reference data
    // is required to reason about that — without it, fail loudly instead of
    // firing transfers against unknown state.
    const enrollmentDirty =
      classId !== original.classId || academicYearId !== original.academicYearId;
    if (enrollmentDirty && !referenceData) {
      setSubmitError("Reference data failed to load — reload the page before changing enrollment");
      return;
    }
    if (enrollmentDirty) {
      const enrollmentValidation = enrollmentValidate();
      if (enrollmentValidation !== true) {
        setSubmitError(enrollmentValidation);
        return;
      }
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const names = splitName(personal.fullname);
      await updateStudent(student.id, {
        ...names,
        motherFullname: personal.motherFullname.trim(),
        fatherFullname: personal.fatherFullname.trim(),
        dateOfBirth: personal.dateOfBirth,
        gender: personal.gender,
        educationLevel,
        grade,
        address: personal.address.trim(),
        ...(personal.phone.trim() ? { phone: personal.phone.trim() } : {}),
        isTransferred: personal.isTransferred,
        ...(personal.formerSchoolName.trim() ? { formerSchoolName: personal.formerSchoolName.trim() } : {}),
      });
      if (enrollmentDirty) {
        // Year change wins: enrolling anew covers both year and class,
        // while transfer is class-only within the same year.
        if (academicYearId !== original.academicYearId) {
          await enrollStudent(student.id, {
            academicYearId,
            classId,
            ...(fieldRequired && field ? { field } : {}),
          });
        } else {
          await transferStudent(student.id, classId);
        }
      }
      router.push(`/students/all/${student.id}`);
    } catch (cause) {
      setSubmitError(academicErrorMessage(cause, "Unable to save changes"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/students/all" className="hover:text-foreground">Students</Link>
        <ChevronRight size={14} />
        <Link href={`/students/all/${student.id}`} className="hover:text-foreground truncate">
          {studentFullName(student)}
        </Link>
        <ChevronRight size={14} />
        <span className="text-foreground font-medium">Edit</span>
      </nav>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Edit {studentFullName(student)}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Same wizard, pre-filled. Guardians save immediately; personal and enrollment changes save on review.
        </p>
      </div>

      {referenceError ? (
        <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {referenceError}
        </div>
      ) : null}
      {submitError ? (
        <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {submitError}
        </div>
      ) : null}
      {submitting ? (
        <div role="status" className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
          Saving changes…
        </div>
      ) : null}

      <Stepper steps={steps} active={active} onStepChange={setActive} onComplete={() => void submit()}>
        {(idx) => (
          <>
            {idx === 0 ? (
              <>
                <AdmissionPersonalStep values={personal} onChange={setPersonal} editMode />
                <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground mt-4">
                  Account password never changes here. Existing documents stay attached — see the Documents tab.
                </div>
              </>
            ) : null}
            {idx === 1 ? <GuardiansTab studentId={student.id} initialLinks={initialGuardians} /> : null}
            {idx === 2 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-level">Education level *</Label>
                  <Select id="edit-level" value={educationLevel} onChange={(event) => setLevel(event.target.value as EducationLevel)}>
                    {Object.values(EducationLevel).map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-grade">Grade *</Label>
                  <Select id="edit-grade" value={String(grade)} onChange={(event) => setGrade(Number(event.target.value) as Grade)}>
                    {GRADE_BY_LEVEL[educationLevel].map((n) => (
                      <option key={n} value={String(n)}>{n}</option>
                    ))}
                  </Select>
                </div>
                {trackRequired ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-track">Track *</Label>
                    <Select id="edit-track" value={track ?? ""} onChange={(event) => setTrack(event.target.value || null)}>
                      <option value="">Select track</option>
                      <option value="ART">ART</option>
                      <option value="SCIENCE">SCIENCE</option>
                    </Select>
                  </div>
                ) : null}
                {fieldRequired ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-field">Field of study *</Label>
                    <Select id="edit-field" value={field} onChange={(event) => setField(event.target.value)}>
                      <option value="">{track ? "Select field" : "Select a track first"}</option>
                      {fieldOptions.map((option) => (
                        <option key={option} value={option}>
                          {option.split("_").map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(" ")}
                        </option>
                      ))}
                    </Select>
                  </div>
                ) : null}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-year">Academic year *</Label>
                  <Select id="edit-year" value={academicYearId} onChange={(event) => setAcademicYearId(event.target.value)}>
                    {(referenceData?.years ?? []).map((y) => (
                      <option key={y.id} value={y.id}>{y.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-class">Class *</Label>
                  <Select
                    id="edit-class"
                    value={classId}
                    onChange={(event) => setClassId(event.target.value)}
                  >
                    {matchingClasses.map((c) => (
                      <option key={c.id} value={c.id}>{c.className}</option>
                    ))}
                  </Select>
                  {matchingClasses.length === 0 ? <p className="text-xs text-destructive">No classes match this level, grade{trackRequired ? " and track" : ""} yet.</p> : null}
                </div>
                <p className="sm:col-span-2 text-xs text-muted-foreground">
                  Role number <span className="font-mono">{student.roleNumber}</span> never changes on edit.
                  Changing class transfers the student; changing year enrolls them anew.
                </p>
              </div>
            ) : null}
            {idx === 3 ? (
              <div className="rounded-lg border bg-muted/20 p-4 text-sm space-y-2">
                <p><span className="text-muted-foreground">Student:</span> {personal.fullname.trim() || "—"}</p>
                <p><span className="text-muted-foreground">Level / Grade:</span> {educationLevel} · Grade {grade}{trackRequired && track ? ` (${track})` : ""}</p>
                <p><span className="text-muted-foreground">Role number:</span> <span className="font-mono text-xs">{student.roleNumber}</span> (unchanged)</p>
                <p className="text-xs text-muted-foreground">Guardians saved inline as edited. Submitting saves personal and enrollment changes.</p>
              </div>
            ) : null}
          </>
        )}
      </Stepper>
    </div>
  );
}
