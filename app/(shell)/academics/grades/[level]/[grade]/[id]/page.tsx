import { notFound } from "next/navigation";
import { ClassDetailsClient, type ClassDetailsErrors } from "@/components/academics/class-details-client";
import { GRADES } from "@/components/academics/grade-keys";
import { ApiError } from "@/lib/api/client";
import { getClass } from "@/lib/api/classes";
import { listClassSubjects, listSubjects } from "@/lib/api/subjects";
import { listTeachers } from "@/lib/api/teachers";
import { listStudents } from "@/lib/api/students";
import { listTimetableForClass } from "@/lib/api/timetable";
import type { ApiClassSubject, ApiSchoolClass, ApiStudent, ApiSubject, ApiTeacher, ApiTimetableEntry } from "@/lib/api/types";

type NestedClassParams = Promise<{ level: string; grade: string; id: string }>;

function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback;
}

export default async function NestedClassDetailsPage({
  params,
  searchParams,
}: {
  params: NestedClassParams;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { level, grade, id } = await params;
  const { tab } = await searchParams;
  const gradeMatch = GRADES.find(
    (row) => row.level.toLowerCase() === level.toLowerCase() && row.grade.toLowerCase() === grade.toLowerCase(),
  );
  if (!gradeMatch) notFound();
  const allowedTabs = new Set(["profile", "subjects", "timetable", "students", "teachers"]);
  const initialTab = tab && allowedTabs.has(tab) ? tab : "profile";
  let schoolClass: ApiSchoolClass | null = null;
  let initialError = "";
  let notFoundClass = false;

  try {
    schoolClass = await getClass(id);
  } catch (cause) {
    initialError = errorMessage(cause, "Unable to load class");
    notFoundClass = cause instanceof ApiError && cause.status === 404;
  }

  // A class reached under the wrong grade URL is treated as missing — the
  // grade scope in the path must match the class itself.
  if (
    schoolClass &&
    (schoolClass.educationLevel.toLowerCase() !== gradeMatch.level.toLowerCase() ||
      schoolClass.grade.toLowerCase() !== gradeMatch.grade.toLowerCase())
  ) {
    notFound();
  }

  let assignments: ApiClassSubject[] = [];
  let subjects: ApiSubject[] = [];
  let teachers: ApiTeacher[] = [];
  let students: ApiStudent[] = [];
  let timetable: ApiTimetableEntry[] = [];
  const errors: ClassDetailsErrors = {};

  if (schoolClass) {
    const [assignmentsResult, subjectsResult, teachersResult, studentsResult, timetableResult] = await Promise.allSettled([
      listClassSubjects(id),
      listSubjects({ page: 1, limit: 100 }),
      listTeachers({ page: 1, limit: 999 }),
      listStudents({ page: 1, limit: 500, classId: id }),
      listTimetableForClass(id),
    ]);

    if (assignmentsResult.status === "fulfilled") assignments = assignmentsResult.value;
    else errors.subjectAssignments = errorMessage(assignmentsResult.reason, "Unable to load subject assignments");
    if (subjectsResult.status === "fulfilled") subjects = subjectsResult.value.data;
    else errors.subjects = errorMessage(subjectsResult.reason, "Unable to load subjects");
    if (teachersResult.status === "fulfilled") teachers = teachersResult.value.data;
    else errors.teachers = errorMessage(teachersResult.reason, "Unable to load teachers");
    if (studentsResult.status === "fulfilled") students = studentsResult.value.data;
    else errors.students = errorMessage(studentsResult.reason, "Unable to load students");
    if (timetableResult.status === "fulfilled") timetable = timetableResult.value;
    else errors.timetable = errorMessage(timetableResult.reason, "Unable to load timetable");
  }

  return <ClassDetailsClient schoolClass={schoolClass} assignments={assignments} subjects={subjects} teachers={teachers} students={students} timetable={timetable} errors={errors} initialError={initialError} notFound={notFoundClass} initialTab={initialTab} />;
}
