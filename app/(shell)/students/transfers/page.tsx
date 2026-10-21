import { StudentTransferClient } from "@/components/students/student-transfer-client";
import { getStudentReferenceData, listStudents } from "@/lib/api/students";
import type { ApiReferenceData, ApiStudent } from "@/lib/api/types";

export default async function TransfersPage({
  searchParams,
}: {
  searchParams?: Promise<{ studentId?: string }>;
}) {
  let students: ApiStudent[] = [];
  let reference: ApiReferenceData | null = null;
  let error = "";
  try {
    const [studentPage, referenceData] = await Promise.all([listStudents({ page: 1, limit: 100, status: "ACTIVE" }), getStudentReferenceData()]);
    students = studentPage.data;
    reference = referenceData;
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Unable to load transfer options";
  }
  const params = await searchParams;
  const initialStudentId =
    params?.studentId && students.some((s) => s.id === params.studentId) ? params.studentId : undefined;
  return <StudentTransferClient initialStudents={students} reference={reference} initialError={error} initialStudentId={initialStudentId} />;
}
