import {
  EducationLevel,
  SecondaryGrade,
  IntermediateGrade,
  Track,
  Gender,
  type AcademicYear,
  type Term,
  type SchoolClass,
  type Section,
  type Subject,
  type Teacher,
  type Student,
  type Guardian,
  type Department,
  type Enrollment,
  type SectionSubject,
  type Exam,
  type ExamSubject,
  type ExamResult,
  type GradingScale,
  type TimetableSlot,
  type AttendanceSession,
  type Room,
  type ExamScheduleSlot,
  type InvigilationAssignment,
  type ExamAttendanceRecord,
  type ExamSettings,
} from "./types";

export const SEED_YEARS: AcademicYear[] = [
  { id: "ay-2023", name: "2023-2024", startsOn: "2023-09-01", endsOn: "2024-06-30", isCurrent: false },
  { id: "ay-2024", name: "2024-2025", startsOn: "2024-09-01", endsOn: "2025-06-30", isCurrent: true },
  { id: "ay-2025", name: "2025-2026", startsOn: "2025-09-01", endsOn: "2026-06-30", isCurrent: false },
];

export const SEED_TERMS: Term[] = [
  { id: "t1-ay24", academicYearId: "ay-2024", name: "Term 1", sequenceNo: 1, startsOn: "2024-09-01", endsOn: "2024-12-15" },
  { id: "t2-ay24", academicYearId: "ay-2024", name: "Term 2", sequenceNo: 2, startsOn: "2025-01-10", endsOn: "2025-03-30" },
  { id: "t3-ay24", academicYearId: "ay-2024", name: "Term 3", sequenceNo: 3, startsOn: "2025-04-10", endsOn: "2025-06-30" },
  { id: "t1-ay25", academicYearId: "ay-2025", name: "Term 1", sequenceNo: 1, startsOn: "2025-09-01", endsOn: "2025-12-15" },
];

export const SEED_CLASSES: SchoolClass[] = [
  { id: "c-g9", educationLevel: EducationLevel.SECONDARY, grade: SecondaryGrade.FIRST, track: null, className: "Secondary - First", name: "Secondary - First", code: "S1", sequenceNo: 1, createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" },
  { id: "c-g10", educationLevel: EducationLevel.SECONDARY, grade: SecondaryGrade.SECOND, track: Track.ART, className: "Secondary - Second - Art", name: "Secondary - Second - Art", code: "S2A", sequenceNo: 2, createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" },
  { id: "c-g11", educationLevel: EducationLevel.SECONDARY, grade: SecondaryGrade.SECOND, track: Track.SCIENCE, className: "Secondary - Second - Science", name: "Secondary - Second - Science", code: "S2S", sequenceNo: 3, createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" },
  { id: "c-g12", educationLevel: EducationLevel.SECONDARY, grade: SecondaryGrade.THIRD, track: Track.ART, className: "Secondary - Third - Art", name: "Secondary - Third - Art", code: "S3A", sequenceNo: 4, createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" },
  { id: "c-s3s", educationLevel: EducationLevel.SECONDARY, grade: SecondaryGrade.THIRD, track: Track.SCIENCE, className: "Secondary - Third - Science", name: "Secondary - Third - Science", code: "S3S", sequenceNo: 5, createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" },
  { id: "c-i6", educationLevel: EducationLevel.INTERMEDIATE, grade: IntermediateGrade.SIXTH, track: null, className: "Intermediate - Sixth", name: "Intermediate - Sixth", code: "I6", sequenceNo: 6, createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" },
  { id: "c-i7", educationLevel: EducationLevel.INTERMEDIATE, grade: IntermediateGrade.SEVENTH, track: null, className: "Intermediate - Seventh", name: "Intermediate - Seventh", code: "I7", sequenceNo: 7, createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" },
  { id: "c-i8", educationLevel: EducationLevel.INTERMEDIATE, grade: IntermediateGrade.EIGHTH, track: null, className: "Intermediate - Eighth", name: "Intermediate - Eighth", code: "I8", sequenceNo: 8, createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" },
  { id: "c-i9", educationLevel: EducationLevel.INTERMEDIATE, grade: IntermediateGrade.NINTH, track: null, className: "Intermediate - Ninth", name: "Intermediate - Ninth", code: "I9", sequenceNo: 9, createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" },
];

export const SEED_SECTIONS: Section[] = [
  { id: "s-g9-a", classId: "c-g9", name: "A", capacity: 35 },
  { id: "s-g9-b", classId: "c-g9", name: "B", capacity: 35 },
  { id: "s-g10-a", classId: "c-g10", name: "A", capacity: 30 },
  { id: "s-g11-a", classId: "c-g11", name: "A", capacity: 30 },
  { id: "s-g12-a", classId: "c-g12", name: "A", capacity: 25 },
  { id: "s-g12-b", classId: "c-g12", name: "B", capacity: 25 },
];

export const SEED_SUBJECTS: Subject[] = [
  { id: "sub-mat", name: "Mathematics", code: "MAT" },
  { id: "sub-eng", name: "English", code: "ENG" },
  { id: "sub-sci", name: "Science", code: "SCI" },
  { id: "sub-his", name: "History", code: "HIS" },
  { id: "sub-geo", name: "Geography", code: "GEO" },
];

export const SEED_TEACHERS: Teacher[] = [
  { id: "t-1", fullname: "Ahmed Ali", firstName: "Ahmed", lastName: "Ali", phone: "+249912345681", gender: Gender.MALE, dateOfBirth: "1985-03-12", departmentId: "dept-math", profileImagePath: "tmp/t-1/profile.jpg", idProofFilePath: "tmp/t-1/id.pdf", employeeNumber: "T-1001", status: "ACTIVE" },
  { id: "t-2", fullname: "Sara Adam", firstName: "Sara", lastName: "Adam", phone: "+249912345682", gender: Gender.FEMALE, dateOfBirth: "1990-07-08", departmentId: "dept-ar", profileImagePath: "tmp/t-2/profile.jpg", idProofFilePath: "tmp/t-2/id.pdf", employeeNumber: "T-1002", status: "ACTIVE" },
  { id: "t-3", fullname: "Fatima Ali", firstName: "Fatima", lastName: "Ali", phone: "+249912345683", gender: Gender.FEMALE, dateOfBirth: "1988-11-22", departmentId: "dept-en", profileImagePath: "tmp/t-3/profile.jpg", idProofFilePath: "tmp/t-3/id.pdf", employeeNumber: "T-1003", status: "ACTIVE" },
  { id: "t-4", fullname: "Omar Hassan", firstName: "Omar", lastName: "Hassan", phone: "+249912345684", gender: Gender.MALE, dateOfBirth: "1982-05-17", departmentId: "dept-math", profileImagePath: "tmp/t-4/profile.jpg", idProofFilePath: "tmp/t-4/id.jpg", employeeNumber: "T-1004", status: "ACTIVE" },
  { id: "t-5", fullname: "Layla Hassan", firstName: "Layla", lastName: "Hassan", phone: "+249912345685", gender: Gender.FEMALE, dateOfBirth: "1992-09-03", departmentId: "dept-ar", profileImagePath: "tmp/t-5/profile.jpg", idProofFilePath: "tmp/t-5/id.pdf", employeeNumber: "T-1005", status: "INACTIVE" },
];

export const SEED_SECTION_SUBJECTS: SectionSubject[] = [
  { id: "ss-g9a-mat", sectionId: "s-g9-a", subjectId: "sub-mat", teacherId: "t-1" },
  { id: "ss-g9a-eng", sectionId: "s-g9-a", subjectId: "sub-eng", teacherId: "t-2" },
  { id: "ss-g10a-mat", sectionId: "s-g10-a", subjectId: "sub-mat", teacherId: "t-1" },
  { id: "ss-g12a-mat", sectionId: "s-g12-a", subjectId: "sub-mat", teacherId: "t-3" },
];

export const SEED_DEPARTMENTS: Department[] = [
  { id: "dept-ar", name: "Arabic Department", code: "ARE", description: "Arabic curriculum" },
  { id: "dept-en", name: "English Department", code: "ENG", description: "English curriculum" },
  { id: "dept-math", name: "Math Department", code: "MAT", description: "Mathematics curriculum" },
];

export const SEED_GUARDIANS: Guardian[] = [
  { id: "g-1", fullname: "Amina Hassan", firstName: "Amina", lastName: "Hassan", phone: "+249912345678", email: "amina@example.com", relationship: "MOTHER", password: "Guard123!", idProofFilePath: "tmp/g-1/id.jpg", isPrimary: true, canPickup: true, studentIds: ["st-3"] },
  { id: "g-2", fullname: "Hassan Ali", firstName: "Hassan", lastName: "Ali", phone: "+249912345679", relationship: "FATHER", password: "Guard123!", idProofFilePath: "tmp/g-2/id.jpg", isPrimary: false, canPickup: true, studentIds: ["st-3"] },
  { id: "g-3", fullname: "Fatima Ahmed", firstName: "Fatima", lastName: "Ahmed", phone: "+249908765432", relationship: "MOTHER", password: "Guard123!", idProofFilePath: "tmp/g-3/id.pdf", isPrimary: true, canPickup: true, studentIds: ["st-7"] },
  { id: "g-4", fullname: "Omar Siddig", firstName: "Omar", lastName: "Siddig", phone: "+249901112233", relationship: "FATHER", password: "Guard123!", idProofFilePath: "tmp/g-4/id.pdf", isPrimary: true, canPickup: true, studentIds: ["st-8"] },
];

export const SEED_STUDENTS: Student[] = [
  // 4 pending admission (mid-admission) — roleNumber per spec [$YY C S grade R/T NN] — Sudanese names
  { id: "st-1", roleNumber: "26CS1R01", fullname: "Ahmed Al-Tayeb", firstName: "Ahmed", lastName: "Al-Tayeb", grade: 1, status: "PENDING_ADMISSION", phone: "+249912345670", guardians: [] },
  { id: "st-2", roleNumber: "26CS1R02", fullname: "Amina Osman", firstName: "Amina", lastName: "Osman", grade: 1, status: "PENDING_ADMISSION", guardians: [] },
  { id: "st-3", roleNumber: "26CS1R03", fullname: "Khalid Mustafa", firstName: "Khalid", lastName: "Mustafa", grade: 1, status: "ACTIVE", classId: "c-g9", sectionId: "s-g9-a", academicYearId: "ay-2024", guardians: ["g-1", "g-2"] },
  { id: "st-4", roleNumber: "26CS2R01", fullname: "Mariam Nour", firstName: "Mariam", lastName: "Nour", grade: 2, status: "PENDING_ADMISSION", guardians: [] },
  // 12 active enrolled across grades — regular (R) vs transfer (T) mix — Sudanese
  { id: "st-5", roleNumber: "26CS1R04", fullname: "Yasir Ali", firstName: "Yasir", lastName: "Ali", grade: 1, status: "ACTIVE", classId: "c-g9", sectionId: "s-g9-a", academicYearId: "ay-2024", guardians: [] },
  { id: "st-6", roleNumber: "26CS1R05", fullname: "Sara Idris", firstName: "Sara", lastName: "Idris", grade: 1, status: "ACTIVE", classId: "c-g9", sectionId: "s-g9-b", academicYearId: "ay-2024", guardians: [] },
  { id: "st-7", roleNumber: "26CS2R02", fullname: "Osman Tariq", firstName: "Osman", lastName: "Tariq", grade: 2, status: "ACTIVE", classId: "c-g10", sectionId: "s-g10-a", academicYearId: "ay-2024", guardians: ["g-3"] },
  { id: "st-8", roleNumber: "26CS2R03", fullname: "Huda Ali", firstName: "Huda", lastName: "Ali", grade: 2, status: "ACTIVE", classId: "c-g11", sectionId: "s-g11-a", academicYearId: "ay-2024", guardians: ["g-4"] },
  { id: "st-9", roleNumber: "26CS3R01", fullname: "Mustafa Hassan", firstName: "Mustafa", lastName: "Hassan", grade: 3, status: "ACTIVE", classId: "c-g12", sectionId: "s-g12-a", academicYearId: "ay-2024", guardians: [] },
  { id: "st-10", roleNumber: "26CS3R02", fullname: "Amira Osman", firstName: "Amira", lastName: "Osman", grade: 3, status: "ACTIVE", classId: "c-g12", sectionId: "s-g12-a", academicYearId: "ay-2024", guardians: [] },
  { id: "st-11", roleNumber: "26CS3R03", fullname: "Samir Khalid", firstName: "Samir", lastName: "Khalid", grade: 3, status: "ACTIVE", classId: "c-g12", sectionId: "s-g12-b", academicYearId: "ay-2024", guardians: [] },
  { id: "st-12", roleNumber: "26CS2T01", fullname: "Noura Ibrahim", firstName: "Noura", lastName: "Ibrahim", grade: 2, status: "ACTIVE", classId: "c-g10", sectionId: "s-g10-a", academicYearId: "ay-2024", isTransferred: true, guardians: [] },
  { id: "st-13", roleNumber: "26CS1R06", fullname: "Tariq Al-Amin", firstName: "Tariq", lastName: "Al-Amin", grade: 1, status: "ACTIVE", classId: "c-g9", sectionId: "s-g9-a", academicYearId: "ay-2024", guardians: [] },
  { id: "st-14", roleNumber: "26CS1T01", fullname: "Dalya Farouk", firstName: "Dalya", lastName: "Farouk", grade: 1, status: "ACTIVE", classId: "c-g9", sectionId: "s-g9-b", academicYearId: "ay-2024", isTransferred: true, guardians: [] },
  // transferred, withdrawn — Sudanese
  { id: "st-15", roleNumber: "26CS1T02", fullname: "Adam Siddig", firstName: "Adam", lastName: "Siddig", grade: 1, status: "TRANSFERRED", classId: "c-g9", sectionId: "s-g9-a", academicYearId: "ay-2024", isTransferred: true, guardians: [] },
  { id: "st-16", roleNumber: "26CS2R09", fullname: "Rania Saeed", firstName: "Rania", lastName: "Saeed", grade: 2, status: "WITHDRAWN", guardians: [] },
  // graduated (terminal grade G12) — Sudanese
  { id: "st-17", roleNumber: "25CS3R01", fullname: "Youssef Babiker", firstName: "Youssef", lastName: "Babiker", grade: 3, status: "GRADUATED", classId: "c-g12", sectionId: "s-g12-a", academicYearId: "ay-2023", guardians: [] },
  { id: "st-18", roleNumber: "25CS3R02", fullname: "Hiba Mustafa", firstName: "Hiba", lastName: "Mustafa", grade: 3, status: "GRADUATED", classId: "c-g12", sectionId: "s-g12-b", academicYearId: "ay-2023", guardians: [] },
  // more active for bulk actions — Sudanese
  { id: "st-19", roleNumber: "26CS2R04", fullname: "Khalid Samir", firstName: "Khalid", lastName: "Samir", grade: 2, status: "ACTIVE", classId: "c-g11", sectionId: "s-g11-a", academicYearId: "ay-2024", guardians: [] },
  { id: "st-20", roleNumber: "26CS2R05", fullname: "Layla Hussein", firstName: "Layla", lastName: "Hussein", grade: 2, status: "ACTIVE", classId: "c-g11", sectionId: "s-g11-a", academicYearId: "ay-2024", guardians: [] },
];

export const SEED_ENROLLMENTS: Enrollment[] = SEED_STUDENTS.filter((s) => s.academicYearId && s.sectionId).map((s) => ({
  id: `enr-${s.id}`,
  studentId: s.id,
  academicYearId: s.academicYearId!,
  sectionId: s.sectionId!,
  status: s.status === "ACTIVE" ? "ACTIVE" : s.status === "GRADUATED" ? "COMPLETED" : s.status === "TRANSFERRED" ? "TRANSFERRED" : "WITHDRAWN",
  enrolledOn: "2024-09-01",
}));

export const SEED_EXAMS: Exam[] = [
  { id: "ex-1", name: "Mid-Term 2024", academicYearId: "ay-2024", termId: "t1-ay24", status: "DRAFT" },
  { id: "ex-2", name: "Final 2024", academicYearId: "ay-2024", termId: "t2-ay24", status: "PUBLISHED", startsOn: "2025-03-01" },
  { id: "ex-3", name: "Term 3 Assessment", academicYearId: "ay-2024", termId: "t3-ay24", status: "COMPLETED" },
];

export const SEED_EXAM_SUBJECTS: ExamSubject[] = [
  { id: "es-1", examId: "ex-2", sectionSubjectId: "ss-g9a-mat", maxMarks: 100, passingMarks: 40 },
  { id: "es-2", examId: "ex-2", sectionSubjectId: "ss-g9a-eng", maxMarks: 100, passingMarks: 40 },
];

export const SEED_RESULTS: ExamResult[] = [
  { id: "r-1", examSubjectId: "es-1", studentId: "st-3", marks: 82, grade: "A", status: "PUBLISHED" },
  { id: "r-2", examSubjectId: "es-1", studentId: "st-5", marks: 45, grade: "C", status: "PUBLISHED" },
  { id: "r-3", examSubjectId: "es-2", studentId: "st-3", marks: 76, grade: "B", status: "PUBLISHED" },
];

export const SEED_GRADING: GradingScale = {
  id: "gs-1",
  name: "Default 5-Scale",
  isDefault: true,
  bands: [
    { grade: "A", minPercent: 80, maxPercent: 100 },
    { grade: "B", minPercent: 65, maxPercent: 79.99 },
    { grade: "C", minPercent: 50, maxPercent: 64.99 },
    { grade: "D", minPercent: 40, maxPercent: 49.99 },
    { grade: "F", minPercent: 0, maxPercent: 39.99 },
  ],
};

export const SEED_ROOMS: Room[] = [
  { id: "room-101", name: "Room 101", code: "R101", capacity: 35, location: "Block A", status: "AVAILABLE" },
  { id: "room-102", name: "Room 102", code: "R102", capacity: 30, location: "Block A", status: "AVAILABLE" },
  { id: "room-201", name: "Room 201", code: "R201", capacity: 25, location: "Block B", status: "AVAILABLE" },
  { id: "room-202", name: "Room 202", code: "R202", capacity: 25, location: "Block B", status: "MAINTENANCE" },
];

export const SEED_EXAM_SCHEDULE: ExamScheduleSlot[] = [
  { id: "exs-1", examId: "ex-2", examSubjectId: "es-1", sectionId: "s-g9-a", subjectId: "sub-mat", roomId: "room-101", date: "2025-03-01", startTime: "08:30", endTime: "10:00", status: "CONFIRMED" },
  { id: "exs-2", examId: "ex-2", examSubjectId: "es-2", sectionId: "s-g9-a", subjectId: "sub-eng", roomId: "room-102", date: "2025-03-01", startTime: "10:15", endTime: "11:45", status: "CONFIRMED" },
  { id: "exs-3", examId: "ex-2", examSubjectId: "es-1", sectionId: "s-g9-b", subjectId: "sub-mat", roomId: "room-101", date: "2025-03-02", startTime: "08:30", endTime: "10:00", status: "PLANNED" },
];

export const SEED_INVIGILATION: InvigilationAssignment[] = [
  { id: "inv-1", examId: "ex-2", scheduleSlotId: "exs-1", teacherId: "t-1", roomId: "room-101", role: "INVIGILATOR" },
  { id: "inv-2", examId: "ex-2", scheduleSlotId: "exs-2", teacherId: "t-2", roomId: "room-102", role: "INVIGILATOR" },
];

export const SEED_EXAM_ATTENDANCE: ExamAttendanceRecord[] = [
  { id: "exa-1", examId: "ex-2", examSubjectId: "es-1", studentId: "st-3", status: "PRESENT", seat: "A1" },
  { id: "exa-2", examId: "ex-2", examSubjectId: "es-1", studentId: "st-5", status: "PRESENT", seat: "A2" },
  { id: "exa-3", examId: "ex-2", examSubjectId: "es-2", studentId: "st-3", status: "ABSENT", seat: "B1" },
];

export const SEED_EXAM_SETTINGS: ExamSettings = {
  id: "exam-settings-1",
  gradingScaleId: "gs-1",
  resultApprovalRequired: true,
  attendanceRequired: true,
  invigilationRequired: true,
  passMarkPercent: 40,
  updatedAt: "2025-02-20T08:00:00.000Z",
};

export const SEED_TIMETABLE: TimetableSlot[] = [
  { id: "tt-1", sectionSubjectId: "ss-g9a-mat", dayOfWeek: "MON", periodNo: 1, startTime: "08:00", endTime: "08:45", room: "101" },
  { id: "tt-2", sectionSubjectId: "ss-g9a-eng", dayOfWeek: "MON", periodNo: 2, startTime: "08:50", endTime: "09:35", room: "102" },
  { id: "tt-3", sectionSubjectId: "ss-g10a-mat", dayOfWeek: "TUE", periodNo: 1, startTime: "08:00", endTime: "08:45", room: "101" },
  { id: "tt-4", sectionSubjectId: "ss-g12a-mat", dayOfWeek: "WED", periodNo: 3, startTime: "09:40", endTime: "10:25", room: "201" },
];

export const SEED_SESSIONS: AttendanceSession[] = [
  { id: "sess-1", sectionId: "s-g9-a", date: "2025-09-22", period: 1 },
  { id: "sess-2", sectionId: "s-g9-a", date: "2025-09-22", period: 2 },
  { id: "sess-3", sectionId: "s-g10-a", date: "2025-09-22" },
];
