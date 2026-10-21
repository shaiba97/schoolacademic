export type AcademicYear = { id: string; name: string; startsOn: string; endsOn: string; isCurrent: boolean };
export type Term = { id: string; academicYearId: string; name: string; sequenceNo: number; startsOn: string; endsOn: string };
export enum SecondaryGrade {
  FIRST = "FIRST",
  SECOND = "SECOND",
  THIRD = "THIRD",
}

export enum IntermediateGrade {
  SIXTH = "SIXTH",
  SEVENTH = "SEVENTH",
  EIGHTH = "EIGHTH",
  NINTH = "NINTH",
}

export enum Track {
  ART = "ART",
  SCIENCE = "SCIENCE",
}

export type SchoolClassGrade = SecondaryGrade | IntermediateGrade;

export type SchoolClass = {
  id: string;
  educationLevel: EducationLevel;
  grade: SchoolClassGrade;
  track?: Track | null;
  className: string;
  name: string;
  code: string;
  sequenceNo: number;
  createdAt: string;
  updatedAt: string;
};

export const SECONDARY_GRADE_OPTIONS: SecondaryGrade[] = [SecondaryGrade.FIRST, SecondaryGrade.SECOND, SecondaryGrade.THIRD];
export const INTERMEDIATE_GRADE_OPTIONS: IntermediateGrade[] = [IntermediateGrade.SIXTH, IntermediateGrade.SEVENTH, IntermediateGrade.EIGHTH, IntermediateGrade.NINTH];
export type Section = { id: string; classId: string; name: string; capacity?: number; classTeacherId?: string };
export type Subject = { id: string; name: string; code: string };
export type TeacherStatus = "ACTIVE" | "INACTIVE";

export type Teacher = {
  id: string;
  fullname: string;
  firstName: string;
  lastName: string;
  phone: string;
  gender: Gender;
  dateOfBirth: string;
  departmentId: string;
  profileImagePath?: string;
  idProofFilePath?: string;
  employeeNumber: string;
  status: TeacherStatus;
};

export type Department = { id: string; name: string; code: string; description?: string; headTeacherId?: string };
export enum EducationLevel {
  SECONDARY = "SECONDARY",
  INTERMEDIATE = "INTERMEDIATE",
}

export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
}

export type Grade = 1 | 2 | 3 | 6 | 7 | 8 | 9;

export const GRADE_BY_LEVEL: Record<EducationLevel, Grade[]> = {
  [EducationLevel.SECONDARY]: [1, 2, 3],
  [EducationLevel.INTERMEDIATE]: [6, 7, 8, 9],
};

export function isValidGradeForLevel(level: EducationLevel, grade: number): boolean {
  return (GRADE_BY_LEVEL[level] as number[]).includes(grade);
}

export type Student = {
  id: string;
  // roleNumber replaces admissionNumber — auto-generated per spec: YY + C + S + grade + R|T + NN (e.g., 26CS1R09)
  roleNumber: string;
  fullname: string;
  motherFullname?: string;
  fatherFullname?: string;
  // deprecated split — kept for back-compat display, derived from fullname
  firstName: string;
  lastName: string;
  middleName?: string;
  status: "PENDING_ADMISSION" | "ACTIVE" | "TRANSFERRED" | "GRADUATED" | "WITHDRAWN";
  gender?: Gender;
  dateOfBirth?: string;
  educationLevel?: EducationLevel;
  grade: Grade;
  phone?: string;
  email?: string;
  password?: string;
  address?: string;
  photoUrl?: string;
  profileImagePath?: string;
  nationalNumberFilePath?: string;
  nationalCardFilePath?: string;
  passportFilePath?: string;
  isTransferred?: boolean;
  formerSchoolName?: string;
  transferResultFilePath?: string;
  classId?: string;
  sectionId?: string;
  academicYearId?: string;
  guardians: string[];
};

export type AdmissionDraft = {
  fullname: string;
  motherFullname: string;
  fatherFullname: string;
  dateOfBirth: string;
  educationLevel: EducationLevel;
  grade: Grade;
  gender: Gender;
  roleNumber: string;
  password: string;
  profileImagePath?: string;
  nationalNumberFilePath?: string;
  nationalCardFilePath?: string;
  passportFilePath?: string;
  isTransferred: boolean;
  formerSchoolName?: string;
  transferResultFilePath?: string;
};

export type GuardianRelationship = "FATHER" | "MOTHER" | "BROTHER" | "SISTER" | "GUARDIAN";

export type Guardian = {
  id: string;
  fullname: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  relationship: GuardianRelationship;
  password: string;
  idProofFilePath?: string;
  isPrimary: boolean;
  canPickup: boolean;
  studentIds: string[];
};

export type Enrollment = {
  id: string;
  studentId: string;
  academicYearId: string;
  sectionId: string;
  status: "ACTIVE" | "COMPLETED" | "TRANSFERRED" | "WITHDRAWN";
  enrolledOn: string;
};

export type TransferRequest = {
  id: string;
  studentId: string;
  fromSectionId?: string;
  toSectionId?: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
};

export type AttendanceSession = { id: string; sectionId: string; date: string; period?: number };
export type AttendanceRecord = { id: string; sessionId: string; studentId: string; status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" };

export type ExamStatus = "DRAFT" | "SCHEDULED" | "ONGOING" | "COMPLETED" | "PUBLISHED";
export type ResultStatus = "DRAFT" | "SUBMITTED" | "VERIFIED" | "REJECTED" | "APPROVED" | "PUBLISHED";
export type Exam = {
  id: string;
  name: string;
  academicYearId: string;
  termId?: string;
  status: ExamStatus;
  startsOn?: string;
  endsOn?: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  archivedAt?: string;
};
export type ExamSubject = { id: string; examId: string; sectionSubjectId: string; maxMarks: number; passingMarks?: number };
export type ExamResult = {
  id: string;
  examSubjectId: string;
  studentId: string;
  marks?: number;
  grade?: string;
  status: ResultStatus;
  absent?: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  feedback?: string;
};
export type GradingScale = { id: string; name: string; isDefault: boolean; bands: { grade: string; minPercent: number; maxPercent: number }[] };
export type Room = { id: string; name: string; code: string; capacity: number; location?: string; status: "AVAILABLE" | "MAINTENANCE" };
export type ExamScheduleSlot = {
  id: string;
  examId: string;
  examSubjectId: string;
  sectionId: string;
  subjectId: string;
  roomId?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "PLANNED" | "CONFIRMED";
};
export type InvigilationAssignment = {
  id: string;
  examId: string;
  scheduleSlotId: string;
  teacherId: string;
  roomId: string;
  role: "INVIGILATOR" | "RELIEF";
};
export type ExamAttendanceRecord = {
  id: string;
  examId: string;
  examSubjectId: string;
  studentId: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  seat?: string;
  recordedAt?: string;
};
export type ExamSettings = {
  id: string;
  gradingScaleId: string;
  resultApprovalRequired: boolean;
  attendanceRequired: boolean;
  invigilationRequired: boolean;
  passMarkPercent: number;
  updatedAt: string;
};

export type TimetableSlot = { id: string; sectionSubjectId: string; dayOfWeek: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT"; periodNo: number; startTime: string; endTime: string; room?: string };

export type PromotionDecision = { id: string; studentId: string; fromYearId: string; toYearId?: string; decision: "PROMOTE" | "REPEAT" | "GRADUATE"; status: "PROPOSED" | "CONFIRMED"; reason?: string };

export type SectionSubject = { id: string; sectionId: string; subjectId: string; teacherId?: string };

export function redactedAdmissionToString(draft: AdmissionDraft): string {
  return `AdmissionDraft(${JSON.stringify({ ...draft, password: "***redacted***" })})`;
}
