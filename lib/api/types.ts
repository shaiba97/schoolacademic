import type { StudentDocumentType } from "./storage";

export type ApiStudent = {
  id: string;
  roleNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
  motherFullname?: string | null;
  fatherFullname?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  educationLevel?: string | null;
  grade?: number | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isTransferred: boolean;
  formerSchoolName?: string | null;
  status: string;
  photoUrl?: string | null;
  admissionDate?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email?: string | null;
    phone?: string | null;
    firstName: string;
    lastName?: string | null;
    avatarUrl?: string | null;
    status: string;
  } | null;
  enrollments?: ApiEnrollment[];
  guardians?: ApiGuardianLink[];
  documents?: ApiStudentDocument[];
};

export type ApiEnrollment = {
  id: string;
  status: string;
  field?: string | null;
  academicYear?: { id: string; name: string; startsOn?: string; endsOn?: string; isCurrent?: boolean } | null;
  schoolClass?: { id: string; className: string; name: string; educationLevel?: string | null; grade?: string | null; track?: string | null } | null;
};

export type ApiEnrollmentRecord = ApiEnrollment & {
  enrolledOn: string;
  student: { id: string; roleNumber: string; firstName: string; lastName?: string | null };
};

export type ApiGuardianSummary = {
  id: string;
  firstName: string;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  _count: { students: number };
};

export type ApiGuardianLink = {
  relationship: string;
  isPrimary: boolean;
  canPickup: boolean;
  emergencyContact: boolean;
  guardian: { id: string; firstName: string; lastName?: string | null; phone?: string | null; email?: string | null; address?: string | null };
};

export type ApiStudentGuardianLink = {
  studentId: string;
  guardianId: string;
  relationship: string;
  isPrimary: boolean;
  canPickup: boolean;
  emergencyContact: boolean;
  guardian: { id: string; guardianNumber?: string | null; firstName: string; lastName?: string | null; phone?: string | null; email?: string | null; address?: string | null };
  siblingStudents?: Array<{ id: string; firstName: string; lastName?: string | null; relationship: string }>;
};

export type ApiStudentResult = {
  id: string;
  examSubjectId: string;
  studentId: string;
  marks?: number | string | null;
  grade?: string | null;
  remarks?: string | null;
  status: string;
  kind: string;
  createdAt?: string;
  examSubject?: {
    maxMarks?: number | string | null;
    passingMarks?: number | string | null;
    exam?: {
      id: string;
      name: string;
      status: string;
      publishedAt?: string | null;
      examTypeId?: string | null;
      startsOn?: string | null;
      endsOn?: string | null;
      academicYear?: { id: string; name: string; startsOn?: string; endsOn?: string; isCurrent?: boolean } | null;
    } | null;
    classSubject?: {
      schoolClass?: { id: string; className: string } | null;
      subject?: { id: string; name: string } | null;
    } | null;
  } | null;
};

export type ApiTenantResult = ApiStudentResult & {
  student: Pick<
    ApiStudent,
    "id" | "roleNumber" | "firstName" | "lastName" | "educationLevel" | "grade" | "status"
  >;
};

export type ApiStudentAttendanceRecord = {
  id: string;
  status: string;
  markedAt?: string;
  attendanceSession: { id: string; attendanceDate: string; classId: string };
};

export type ApiStudentDocument = {
  id: string;
  documentType: string;
  objectKey: string;
  originalName: string;
  contentType: string;
  size: number;
};

export type ApiPaginated<T> = { data: T[]; total: number; page: number; limit: number };

export type ApiReferenceData = {
  years: { id: string; name: string; startsOn: string; endsOn: string; isCurrent: boolean }[];
  classes: { id: string; className: string; educationLevel: string; grade: string; track?: string | null }[];
};

export type ApiTeacher = {
  id: string;
  employeeNumber?: string | null;
  hireDate?: string | null;
  specialization?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  departmentId?: string | null;
  status: string;
  user?: ApiUserSummary | null;
  department?: ApiDepartment | null;
  documents?: ApiTeacherDocument[];
  credentials?: ApiTeacherCredential[];
  classSubjects?: ApiClassSubject[];
  classTeacherFor?: Array<{ id: string; className: string }>;
};

export type ApiTeacherDocument = {
  id: string;
  documentType: string;
  objectKey: string;
  originalName: string;
  contentType: string;
  size: number;
  createdAt?: string;
};

/** Who supplied a credential document. Both are stored and shown identically. */
export type ApiTeacherDocumentSource = "ACADEMIC_AFFAIRS" | "TEACHER";

/** A named document on a teacher record â€” one ID card in the UI. */
export type ApiTeacherCredential = {
  id: string;
  title: string;
  objectKey: string;
  originalName: string;
  contentType: string;
  size: number;
  source: ApiTeacherDocumentSource;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateTeacherCredentialPayload = {
  title: string;
  source?: ApiTeacherDocumentSource;
  objectKey: string;
  originalName: string;
  contentType: string;
  size: number;
};

export type UpdateTeacherCredentialPayload = {
  title?: string;
  source?: ApiTeacherDocumentSource;
  objectKey?: string;
  originalName?: string;
  contentType?: string;
  size?: number;
};

export type ApiDepartment = {
  id: string;
  name: string;
  _count?: { teachers: number };
};

export type CreateDepartmentPayload = { name: string };
export type UpdateDepartmentPayload = Partial<CreateDepartmentPayload>;

export type TeacherDocumentPayload = {
  documentType: "PROFILE_IMAGE" | "ID_PROOF";
  objectKey: string;
  originalName: string;
  contentType: string;
  size: number;
};

export type CreateTeacherPayload = {
  firstName: string;
  lastName?: string;
  phone?: string;
  employeeNumber?: string;
  hireDate?: string;
  specialization?: string;
  password: string;
  gender?: string;
  dateOfBirth?: string;
  departmentId?: string;
  documents?: TeacherDocumentPayload[];
};

export type UpdateTeacherPayload = Partial<Omit<CreateTeacherPayload, "password">> & {
  password?: string;
  status?: string;
};

export type TeacherQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  departmentId?: string;
};

export type ApiUserSummary = {
  id: string;
  email?: string | null;
  phone?: string | null;
  firstName: string;
  lastName?: string | null;
  avatarUrl?: string | null;
  status: string;
};

export type ApiAcademicYear = {
  id: string;
  tenantId?: string;
  name: string;
  startsOn: string;
  endsOn: string;
  isCurrent: boolean;
  createdAt?: string;
  _count?: { terms: number };
  terms?: ApiAcademicTerm[];
};

export type ApiAcademicTerm = {
  id: string;
  tenantId?: string;
  academicYearId: string;
  name: string;
  startsOn: string;
  endsOn: string;
  sequenceNo: number;
};

export type ApiExamType = {
  id: string;
  tenantId?: string;
  name: string;
  defaultWeight?: number | string | null;
};

export type ApiHall = {
  id: string;
  tenantId?: string;
  name: string;
  capacity: number;
  type: "PHYSICAL" | "VIRTUAL";
  roomNumber?: number;
};

export type ApiExamSubject = {
  id: string;
  tenantId?: string;
  examId: string;
  classSubjectId: string;
  examDate?: string | null;
  maxMarks: number | string;
  passingMarks?: number | string | null;
  weight?: number | string | null;
  gradingScaleId?: string | null;
  classSubject?: ApiClassSubject | null;
  gradingScale?: ApiGradingScale | null;
  results?: ApiStudentResult[];
};

export type ApiExam = {
  id: string;
  tenantId?: string;
  academicYearId: string;
  termId?: string | null;
  examTypeId?: string | null;
  name: string;
  startsOn?: string | null;
  endsOn?: string | null;
  status: string;
  publishedAt?: string | null;
  sampleObjectKey?: string | null;
  authorId?: string | null;
  examGroupId?: string | null;
  examType?: ApiExamType | null;
  author?: { id: string; firstName: string; lastName?: string | null } | null;
  examSubjects?: ApiExamSubject[];
  examRoomAssignments?: ApiRoomAssignment[];
  _count?: { examSubjects?: number; examRoomAssignments?: number };
};

export type ApiRoomStudent = {
  id: string;
  studentId: string;
  seatOrder: number;
  student?: {
    id: string;
    roleNumber?: string | null;
    firstName: string;
    lastName?: string | null;
    gender?: string | null;
  } | null;
};

export type ApiRoomInvigilator = {
  id: string;
  teacherId: string;
  teacher?: ApiTeacher | null;
};

export type ApiRoomAssignment = {
  id: string;
  examId: string;
  hallId: string;
  hall?: ApiHall | null;
  invigilators?: ApiRoomInvigilator[];
  students?: ApiRoomStudent[];
  _count?: { students?: number; invigilators?: number };
};

export type ApiExamAnalyticsSubject = {
  examSubjectId: string;
  className: string;
  subjectName: string;
  maxMarks: number;
  entered: number;
  average: number | null;
  highest: number | null;
  lowest: number | null;
  passed: number | null;
  passRate: number | null;
};

export type ApiExamAnalytics = {
  examId: string;
  subjects: ApiExamAnalyticsSubject[];
  overall: { entered: number; average: number | null; passRate: number | null };
};

export type ApiGradingBand = {
  id?: string;
  minPercent: number | string;
  maxPercent: number | string;
  grade: string;
  points?: number | null;
  remark?: string | null;
};

export type ApiGradingScale = {
  id: string;
  tenantId?: string;
  name: string;
  isDefault?: boolean;
  bands?: ApiGradingBand[];
};

export type ApiTimetableSlot = {
  id: string;
  tenantId?: string;
  examSubjectId: string;
  hallId?: string | null;
  date: string;
  startTime: string;
  endTime: string;
  examSubject?: (ApiExamSubject & {
    classSubject?: ApiClassSubject | null;
  }) | null;
  hall?: ApiHall | null;
  invigilationDuties?: ApiInvigilationDuty[];
  seatAssignments?: ApiSeatAssignment[];
  _count?: { seatAssignments: number };
};

export type ApiSeatAssignment = {
  id: string;
  tenantId?: string;
  examTimetableSlotId: string;
  studentId: string;
  hallId: string;
  seatNumber: string;
  student?: { id: string; roleNumber?: string | null; firstName: string; lastName?: string | null } | null;
  hall?: ApiHall | null;
};

export type ApiInvigilationDuty = {
  id: string;
  tenantId?: string;
  examTimetableSlotId: string;
  teacherId: string;
  hallId: string;
  teacher?: ApiTeacher | null;
  hall?: ApiHall | null;
};

export type CreateExamTypePayload = { name: string; defaultWeight?: number };
export type CreateHallPayload = { name: string; capacity: number; type?: "PHYSICAL" | "VIRTUAL"; roomNumber?: number };
export type CreateExamSubjectPayload = {
  classSubjectId: string;
  examDate?: string;
  maxMarks: number;
  passingMarks?: number;
  weight?: number;
  gradingScaleId?: string;
  sample?: { objectKey: string; originalName: string; size: number };
};
export type CreateExamPayload = {
  academicYearId: string;
  termId?: string;
  examTypeId?: string;
  name: string;
  startsOn?: string;
  endsOn?: string;
  sample?: { objectKey: string; originalName: string; size: number } | null;
  subjects?: CreateExamSubjectPayload[];
  /** One Exam row per class sharing an examGroupId. Omit for a single standalone exam. */
  classIds?: string[];
};

export type CreateRoomAssignmentPayload = {
  hallId: string;
  invigilatorIds?: string[];
  /** Omit to auto-fill from the exam classes (alphabetical seating). */
  studentIds?: string[];
};

export type ReorderRoomStudentsPayload = {
  orders: Array<{ studentId: string; seatOrder: number }>;
};

export type ApiSchoolClass = {
  id: string;
  tenantId?: string;
  className: string;
  educationLevel: string;
  grade: string;
  track?: string | null;
  gender?: string | null;
  capacity?: number | null;
  classTeacherId?: string | null;
  classTeacher?: { id: string; user?: ApiUserSummary | null } | null;
  /** Server-computed: ACTIVE enrolments, and distinct teachers of its subjects. */
  counts?: { students: number; teachers: number };
};

export type ApiSubject = {
  id: string;
  tenantId?: string;
  name: string;
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
  /** Distinct classes this subject is assigned to (not raw assignment rows). */
  counts?: { classes: number };
  _count?: { classSubjects: number };
  classSubjects?: ApiClassSubject[];
};

export type ApiClassSubject = {
  id: string;
  tenantId?: string;
  classId: string;
  subjectId: string;
  teacherId?: string | null;
  schoolClass?: { id: string; className: string } | null;
  subject?: ApiSubject;
  teacher?: { id: string; user?: ApiUserSummary | null } | null;
};

export type ApiTimetableEntry = {
  id: string;
  tenantId?: string;
  academicYearId: string;
  termId?: string | null;
  timetableType: string;
  examName: string;
  classId?: string;
  isBreak?: boolean;
  subjectId?: string | null;
  teacherId?: string | null;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  periodNo: number;
  room?: string | null;
  subject?: ApiSubject | null;
  teacher?: ApiTeacher | null;
  schoolClass?: { id: string; className: string; name: string } | null;
};

/** One cell of the interactive week grid as it is sent to `PUT /timetable/batch`. */
export type TimetableCellPayload = {
  day: string;
  periodNo: number;
  isBreak: boolean;
  subjectId?: string;
  teacherId?: string;
  startTime: string;
  endTime: string;
};

export type SaveTimetableBatchPayload = {
  academicYearId?: string;
  termId?: string;
  classId: string;
  timetableType: string;
  examName?: string;
  periodsPerDay: number;
  cells: TimetableCellPayload[];
};

/** Timetable scopes a class week can be built for. Examination weeks are further named. */
export const TIMETABLE_TYPES = [
  { id: "REGULAR", label: "Regular periods timetable" },
  { id: "REVISION", label: "Revision periods timetable" },
  { id: "TEST", label: "Test timetable" },
  { id: "EXAMINATION", label: "Examination timetable" },
] as const;
export type TimetableTypeId = (typeof TIMETABLE_TYPES)[number]["id"];

export type ApiSportTimetableEntry = {
  id: string;
  tenantId?: string;
  classId: string;
  sport: string;
  day: string;
  slotNo: number;
  startTime: string;
  endTime: string;
  schoolClass?: { id: string; className: string; name: string } | null;
};

export type AcademicYearQuery = { page?: number; limit?: number };
export type CreateAcademicYearPayload = { name: string; startsOn: string; endsOn: string; isCurrent?: boolean };
export type CreateAcademicTermPayload = { name: string; startsOn: string; endsOn: string; sequenceNo: number };
export type CreateClassPayload = { className: string; educationLevel: string; grade: string; track?: string | null; gender: string; capacity?: number | null; classTeacherId?: string | null };
export type CreateSubjectPayload = { name: string; departmentId: string };
/** One repeatable row of the subjects wizard. */
export type BatchSubjectItem = { name: string; departmentId: string };
export type BatchCreateSubjectsPayload = { items: BatchSubjectItem[] };
export type BatchCreateSubjectsResult = {
  created: ApiSubject[];
};
export type StudentListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  classId?: string;
  academicYearId?: string;
  educationLevel?: string;
  grade?: number;
};

export type CreateStudentPayload = {
  firstName: string;
  middleName?: string;
  lastName?: string;
  motherFullname?: string;
  fatherFullname?: string;
  roleNumber: string;
  password: string;
  dateOfBirth?: string;
  gender?: string;
  educationLevel?: string;
  grade?: number;
  phone?: string;
  email?: string;
  address?: string;
  isTransferred?: boolean;
  formerSchoolName?: string;
  admissionDate?: string;
};

export type AdmissionGuardianRelationship = "FATHER" | "MOTHER" | "BROTHER" | "SISTER" | "GUARDIAN";

export type CreateAdmissionPayload = {
  draftId: string;
  student: CreateStudentPayload;
  guardian:
    | {
        firstName: string;
        lastName?: string;
        phone: string;
        email?: string;
        address?: string;
        password: string;
        relationship: AdmissionGuardianRelationship;
        isPrimary?: boolean;
        canPickup?: boolean;
        emergencyContact?: boolean;
      }
    | {
        guardianId: string;
        relationship: AdmissionGuardianRelationship;
        isPrimary?: boolean;
        canPickup?: boolean;
        emergencyContact?: boolean;
      };
  enrollment: {
    academicYearId: string;
    classId: string;
    status?: string;
    field?: string;
  };
  documents: Array<{
    documentType: StudentDocumentType;
    objectKey: string;
    originalName: string;
    contentType: string;
    size: number;
  }>;
};

export type ApiAdmissionResponse = {
  student: ApiStudent;
  guardian: {
    id: string;
    guardianNumber?: string | null;
    firstName: string;
    lastName?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  };
  enrollment: ApiEnrollment;
};

export type UpdateStudentPayload = Partial<Omit<CreateStudentPayload, "password">> & { status?: string };
