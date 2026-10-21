"use client";

import type {
  Student,
  Guardian,
  Enrollment,
  TransferRequest,
  PromotionDecision,
  Department,
  SchoolClass,
  Teacher,
  Section,
  SectionSubject,
  AcademicYear,
  Term,
  Subject,
  Exam,
  ExamSubject,
  ExamResult,
  GradingScale,
  Room,
  ExamScheduleSlot,
  InvigilationAssignment,
  ExamAttendanceRecord,
  ExamSettings,
} from "./types";
import { EducationLevel, GRADE_BY_LEVEL, isValidGradeForLevel } from "./types";
import {
  SEED_STUDENTS,
  SEED_GUARDIANS,
  SEED_ENROLLMENTS,
  SEED_DEPARTMENTS,
  SEED_CLASSES,
  SEED_TEACHERS,
  SEED_SECTIONS,
  SEED_SECTION_SUBJECTS,
  SEED_YEARS,
  SEED_TERMS,
  SEED_SUBJECTS,
  SEED_EXAMS,
  SEED_EXAM_SUBJECTS,
  SEED_RESULTS,
  SEED_GRADING,
  SEED_ROOMS,
  SEED_EXAM_SCHEDULE,
  SEED_INVIGILATION,
  SEED_EXAM_ATTENDANCE,
  SEED_EXAM_SETTINGS,
} from "./seed";

const KEY = "academic_mock_v6";
const PREVIOUS_KEY = "academic_mock_v5";

export type Store = {
  students: Student[];
  guardians: Guardian[];
  enrollments: Enrollment[];
  transfers: TransferRequest[];
  promotions: PromotionDecision[];
  departments: Department[];
  classes: SchoolClass[];
  teachers: Teacher[];
  sections: Section[];
  sectionSubjects: SectionSubject[];
  academicYears: AcademicYear[];
  terms: Term[];
  subjects: Subject[];
  exams: Exam[];
  examSubjects: ExamSubject[];
  examResults: ExamResult[];
  gradingScales: GradingScale[];
  rooms: Room[];
  examSchedule: ExamScheduleSlot[];
  invigilations: InvigilationAssignment[];
  examAttendance: ExamAttendanceRecord[];
  examSettings: ExamSettings;
};

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function defaultStore(): Store {
  return {
    students: clone(SEED_STUDENTS),
    guardians: clone(SEED_GUARDIANS),
    enrollments: clone(SEED_ENROLLMENTS),
    transfers: [
      { id: "tr-1", studentId: "st-15", fromSectionId: "s-g9-a", toSectionId: "s-g9-b", reason: "Parent request", status: "APPROVED", createdAt: "2025-01-15" },
    ],
    promotions: [],
    departments: clone(SEED_DEPARTMENTS),
    classes: clone(SEED_CLASSES),
    teachers: clone(SEED_TEACHERS),
    sections: clone(SEED_SECTIONS),
    sectionSubjects: clone(SEED_SECTION_SUBJECTS),
    academicYears: clone(SEED_YEARS),
    terms: clone(SEED_TERMS),
    subjects: clone(SEED_SUBJECTS),
    exams: clone(SEED_EXAMS),
    examSubjects: clone(SEED_EXAM_SUBJECTS),
    examResults: clone(SEED_RESULTS),
    gradingScales: [clone(SEED_GRADING)],
    rooms: clone(SEED_ROOMS),
    examSchedule: clone(SEED_EXAM_SCHEDULE),
    invigilations: clone(SEED_INVIGILATION),
    examAttendance: clone(SEED_EXAM_ATTENDANCE),
    examSettings: clone(SEED_EXAM_SETTINGS),
  };
}

let memory: Store | null = null;

function load(): Store {
  if (memory) return memory;
  if (typeof window === "undefined") {
    memory = defaultStore();
    return memory;
  }
  try {
    // one-time cleanup: if stale v1/v2/v3/v4 still present, clear to force fresh seeds (Sudanese + classes + teachers + sections)
    try {
      const legacy = localStorage.getItem("academic_mock_v1");
      if (legacy) localStorage.removeItem("academic_mock_v1");
      const legacy2 = localStorage.getItem("academic_mock_v2");
      if (legacy2) localStorage.removeItem("academic_mock_v2");
      const legacy3 = localStorage.getItem("academic_mock_v3");
      if (legacy3) localStorage.removeItem("academic_mock_v3");
      const legacy4 = localStorage.getItem("academic_mock_v4");
      if (legacy4) localStorage.removeItem("academic_mock_v4");
    } catch {}
    const currentRaw = localStorage.getItem(KEY);
    const previousRaw = currentRaw ? null : localStorage.getItem(PREVIOUS_KEY);
    const raw = currentRaw ?? previousRaw;
    if (raw) {
      const parsed = JSON.parse(raw) as Store & { students: Array<Record<string, unknown>> };
      // migration: legacy admissionNumber/firstName/lastName → roleNumber/fullname/grade, isFullTime removed, mother/father
      // also handle stale roleNumber starting with STU- (old Indian) → force reseed via v2
      const hasStaleRole = parsed.students.some((s) => typeof (s as Record<string, unknown>).roleNumber === "string" && String((s as Record<string, unknown>).roleNumber).startsWith("STU-"));
      if (hasStaleRole) {
        // force fresh Sudanese seed (Khalid Mustafa — 26CS) instead of migrating stale Indian snapshot
        memory = defaultStore();
        save(memory);
        return memory;
      }
      parsed.students = parsed.students.map((s) => {
        const r = s as Record<string, unknown>;
        if (!r.roleNumber && r.admissionNumber) r.roleNumber = r.admissionNumber;
        if (!r.fullname) {
          const fn = (r.firstName as string) ?? "";
          const ln = (r.lastName as string) ?? "";
          r.fullname = `${fn} ${ln}`.trim() || (r.roleNumber as string) || "Unknown";
        }
        if (!r.motherFullname) r.motherFullname = "";
        if (!r.fatherFullname) r.fatherFullname = "";
        // conditional grade validation per level: SECONDARY 1-3, INTERMEDIATE 6-9
        const lvl = (r.educationLevel as EducationLevel | undefined) ?? EducationLevel.SECONDARY;
        if (!isValidGradeForLevel(lvl, r.grade as number)) {
          r.grade = GRADE_BY_LEVEL[lvl]?.[0] ?? 1;
        }
        if (r.educationLevel === "PRIMARY" || r.educationLevel === "HIGHER") r.educationLevel = "SECONDARY";
        if (r.gender === "OTHER" || r.gender === "PREFER_NOT_TO_SAY") r.gender = "MALE";
        // fix known Indian→Sudanese rename for st-3 if still stale (defensive)
        if (r.id === "st-3" && r.fullname === "Kiran Patel") {
          r.fullname = "Khalid Mustafa";
          r.firstName = "Khalid";
          r.lastName = "Mustafa";
          r.roleNumber = "26CS1R03";
        }
        delete r.admissionNumber;
        delete r.isFullTime;
        return r as unknown as Student;
      });
      // guardian migration: split → fullname, lowercase → uppercase, phone, password, idProof
      if (Array.isArray((parsed as unknown as { guardians?: unknown }).guardians)) {
        const gs = (parsed as unknown as { guardians: Array<Record<string, unknown>> }).guardians;
        (parsed as unknown as { guardians: typeof gs }).guardians = gs.map((g) => {
          if (!g.fullname) {
            const fn = (g.firstName as string) ?? "";
            const ln = (g.lastName as string) ?? "";
            g.fullname = `${fn} ${ln}`.trim() || (g.id as string);
          }
          if (typeof g.relationship === "string") {
            const up = g.relationship.toUpperCase();
            if (["FATHER", "MOTHER", "BROTHER", "SISTER", "GUARDIAN"].includes(up)) g.relationship = up;
            else g.relationship = "GUARDIAN";
          }
          if (!g.phone) g.phone = "";
          if (!g.password) g.password = "";
          if (!g.idProofFilePath) g.idProofFilePath = "";
          return g;
        }) as unknown as typeof gs;
      }
      // classes migration: ensure 9 classes with educationLevel/grade/track
      if (!Array.isArray((parsed as unknown as { classes?: unknown }).classes) || (parsed as unknown as { classes: unknown[] }).classes.length < 9) {
        (parsed as unknown as { classes: unknown[] }).classes = clone(SEED_CLASSES) as unknown as unknown[];
      } else {
        const cs = (parsed as unknown as { classes: Array<Record<string, unknown>> }).classes;
        (parsed as unknown as { classes: typeof cs }).classes = cs.map((c) => {
          // legacy G9-G12 migration: map sequenceNo to new educationLevel/grade/track
          if (!c.educationLevel || !c.grade || !c.className) {
            const seq = (c.sequenceNo as number) ?? 9;
            const map: Record<number, { educationLevel: string; grade: string; track: string | null; className: string; code: string }> = {
              9: { educationLevel: "SECONDARY", grade: "FIRST", track: null, className: "Secondary - First", code: "S1" },
              10: { educationLevel: "SECONDARY", grade: "SECOND", track: "ART", className: "Secondary - Second - Art", code: "S2A" },
              11: { educationLevel: "SECONDARY", grade: "SECOND", track: "SCIENCE", className: "Secondary - Second - Science", code: "S2S" },
              12: { educationLevel: "SECONDARY", grade: "THIRD", track: "ART", className: "Secondary - Third - Art", code: "S3A" },
            };
            const m = map[seq] ?? { educationLevel: "SECONDARY", grade: "FIRST", track: null, className: (c.name as string) || "Class", code: (c.code as string) || "S1" };
            c.educationLevel = m.educationLevel;
            c.grade = m.grade;
            c.track = m.track;
            c.className = (c.className as string) ?? m.className;
            if (!c.createdAt) c.createdAt = new Date().toISOString();
            if (!c.updatedAt) c.updatedAt = new Date().toISOString();
          }
          return c;
        }) as unknown as typeof cs;
      }
      // teachers migration: ensure richer fields + Sudanese
      if (!Array.isArray((parsed as unknown as { teachers?: unknown }).teachers) || (parsed as unknown as { teachers: unknown[] }).teachers.length < 5) {
        (parsed as unknown as { teachers: unknown[] }).teachers = clone(SEED_TEACHERS) as unknown as unknown[];
      } else {
        const ts = (parsed as unknown as { teachers: Array<Record<string, unknown>> }).teachers;
        (parsed as unknown as { teachers: typeof ts }).teachers = ts.map((t) => {
          if (!t.fullname) {
            const fn = (t.firstName as string) ?? "";
            const ln = (t.lastName as string) ?? "";
            t.fullname = `${fn} ${ln}`.trim() || (t.id as string);
          }
          if (!t.phone || !(t.phone as string).startsWith("+249")) {
            // keep existing if Sudanese, else default
            if (!t.phone || typeof t.phone !== "string" || !String(t.phone).startsWith("+249")) {
              // assign based on id
              const map: Record<string, string> = { "t-1": "+249912345681", "t-2": "+249912345682", "t-3": "+249912345683", "t-4": "+249912345684", "t-5": "+249912345685" };
              t.phone = map[t.id as string] ?? "+249912345680";
            }
          }
          if (!t.gender) t.gender = "MALE";
          if (!t.dateOfBirth) t.dateOfBirth = "1990-01-01";
          if (!t.departmentId) t.departmentId = "dept-math";
          if (!t.profileImagePath) t.profileImagePath = `tmp/${t.id}/profile.jpg`;
          if (!t.idProofFilePath) t.idProofFilePath = `tmp/${t.id}/id.pdf`;
          return t;
        }) as unknown as typeof ts;
      }
      if (!Array.isArray((parsed as unknown as { sections?: unknown }).sections)) {
        (parsed as unknown as { sections: unknown[] }).sections = clone(SEED_SECTIONS) as unknown as unknown[];
      }
      if (!Array.isArray((parsed as unknown as { sectionSubjects?: unknown }).sectionSubjects)) {
        (parsed as unknown as { sectionSubjects: unknown[] }).sectionSubjects = clone(SEED_SECTION_SUBJECTS) as unknown as unknown[];
      }
      const migrated = parsed as unknown as Store;
      if (!Array.isArray(migrated.academicYears) || migrated.academicYears.length === 0) migrated.academicYears = clone(SEED_YEARS);
      if (!Array.isArray(migrated.terms) || migrated.terms.length === 0) migrated.terms = clone(SEED_TERMS);
      if (!Array.isArray(migrated.subjects) || migrated.subjects.length === 0) migrated.subjects = clone(SEED_SUBJECTS);
      if (!Array.isArray(migrated.exams) || migrated.exams.length === 0) migrated.exams = clone(SEED_EXAMS);
      if (!Array.isArray(migrated.examSubjects) || migrated.examSubjects.length === 0) migrated.examSubjects = clone(SEED_EXAM_SUBJECTS);
      if (!Array.isArray(migrated.examResults) || migrated.examResults.length === 0) migrated.examResults = clone(SEED_RESULTS);
      if (!Array.isArray(migrated.gradingScales) || migrated.gradingScales.length === 0) migrated.gradingScales = [clone(SEED_GRADING)];
      if (!Array.isArray(migrated.rooms) || migrated.rooms.length === 0) migrated.rooms = clone(SEED_ROOMS);
      if (!Array.isArray(migrated.examSchedule) || migrated.examSchedule.length === 0) migrated.examSchedule = clone(SEED_EXAM_SCHEDULE);
      if (!Array.isArray(migrated.invigilations) || migrated.invigilations.length === 0) migrated.invigilations = clone(SEED_INVIGILATION);
      if (!Array.isArray(migrated.examAttendance) || migrated.examAttendance.length === 0) migrated.examAttendance = clone(SEED_EXAM_ATTENDANCE);
      if (!migrated.examSettings) migrated.examSettings = clone(SEED_EXAM_SETTINGS);
      memory = migrated;
      save(memory);
    } else memory = defaultStore();
  } catch {
    memory = defaultStore();
  }
  return memory!;
}

function save(s: Store) {
  memory = s;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {}
  }
}

export function getStore(): Store {
  return clone(load());
}

export function setStore(patch: Partial<Store>) {
  const cur = load();
  const next = { ...cur, ...patch };
  save(next);
}

export function resetStore() {
  const d = defaultStore();
  save(d);
  return clone(d);
}

// ---- shared promotion service (single implementation for both graduations routes) ----
export function proposePromotions(academicYearId: string, studentIds?: string[]): PromotionDecision[] {
  const s = load();
  const nextYear = [...s.academicYears].sort((a, b) => a.startsOn.localeCompare(b.startsOn)).find((year) => year.id !== academicYearId && year.startsOn > (s.academicYears.find((item) => item.id === academicYearId)?.startsOn ?? ""));
  const selected = studentIds?.length ? new Set(studentIds) : null;
  const candidates = s.students.filter((student) => student.status === "ACTIVE" && student.academicYearId === academicYearId && (!selected || selected.has(student.id)));
  return candidates.flatMap((student) => {
    const publishedResults = s.examResults.filter((result) => result.studentId === student.id && result.status === "PUBLISHED" && s.examSubjects.some((subject) => subject.id === result.examSubjectId && s.exams.some((exam) => exam.id === subject.examId && exam.academicYearId === academicYearId)));
    if (publishedResults.length === 0) return [];
    const failed = publishedResults.some((result) => {
      const subject = s.examSubjects.find((item) => item.id === result.examSubjectId);
      const passMark = subject?.passingMarks ?? (subject ? (subject.maxMarks * s.examSettings.passMarkPercent) / 100 : 0);
      return result.absent || result.marks === undefined || result.marks < passMark;
    });
    const decision = failed ? "REPEAT" : student.grade === 3 ? "GRADUATE" : "PROMOTE";
    return [{ id: `prom-${student.id}`, studentId: student.id, fromYearId: academicYearId, toYearId: nextYear?.id, decision, status: "PROPOSED" as const, reason: failed ? "Failed published result" : student.grade === 3 ? "Terminal grade" : "Passed published results" }];
  });
}

export function confirmPromotions(decisions: PromotionDecision[]) {
  const s = load();
  for (const d of decisions) {
    if (d.decision === "GRADUATE") {
      const st = s.students.find((x) => x.id === d.studentId);
      if (st) st.status = "GRADUATED";
      s.enrollments = s.enrollments.map((enrollment) => enrollment.studentId === d.studentId ? { ...enrollment, status: "COMPLETED" } : enrollment);
    } else if (d.decision === "PROMOTE" && d.toYearId) {
      const currentEnrollment = s.enrollments.find((enrollment) => enrollment.studentId === d.studentId && enrollment.status === "ACTIVE");
      const currentSection = s.sections.find((section) => section.id === currentEnrollment?.sectionId);
      const currentClass = s.classes.find((klass) => klass.id === currentSection?.classId);
      const nextClass = s.classes.find((klass) => currentClass ? klass.sequenceNo === currentClass.sequenceNo + 1 : false);
      const nextSection = s.sections.find((section) => section.classId === nextClass?.id);
      if (nextSection) {
        const existing = s.enrollments.find((enrollment) => enrollment.studentId === d.studentId && enrollment.academicYearId === d.toYearId);
        if (existing) {
          existing.sectionId = nextSection.id;
          existing.status = "ACTIVE";
        } else {
          s.enrollments.push({ id: `enr-${d.studentId}-${d.toYearId}`, studentId: d.studentId, academicYearId: d.toYearId, sectionId: nextSection.id, status: "ACTIVE", enrolledOn: new Date().toISOString().slice(0, 10) });
        }
      }
    }
  }
  s.promotions = decisions.map((d) => ({ ...d, status: "CONFIRMED" as const }));
  save(s);
}
