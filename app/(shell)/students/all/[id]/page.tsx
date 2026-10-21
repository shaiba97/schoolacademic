import { StudentDetailClient } from "@/components/students/student-detail-client";
import {
  getStudent,
  listStudentAttendanceRecords,
  listStudentGuardians,
  listStudentResults,
} from "@/lib/api/students";
import type { ApiStudent } from "@/lib/api/types";

type Params = Promise<{ id: string }>;

export default async function StudentDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  let student: ApiStudent | null = null;
  let errorMessage: string | undefined;
  try {
    student = await getStudent(id);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unable to load student";
  }

  const [guardiansResult, resultsResult, attendanceResult] = await Promise.allSettled([
    student ? listStudentGuardians(id) : Promise.resolve([]),
    student ? listStudentResults(id) : Promise.resolve([]),
    student ? listStudentAttendanceRecords(id) : Promise.resolve([]),
  ]);

  return (
    <StudentDetailClient
      student={student}
      error={errorMessage}
      initialGuardians={guardiansResult.status === "fulfilled" ? guardiansResult.value : []}
      initialResults={resultsResult.status === "fulfilled" ? resultsResult.value : []}
      initialAttendance={attendanceResult.status === "fulfilled" ? attendanceResult.value : []}
    />
  );
}
