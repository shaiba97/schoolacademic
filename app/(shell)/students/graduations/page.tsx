import { GraduationsClient } from "@/components/students/graduations-client";
import { listStudents } from "@/lib/api/students";
import type { ApiStudent } from "@/lib/api/types";

export default async function GraduationsPage() {
  let students: ApiStudent[] = [];
  let error = "";
  try {
    students = (await listStudents({ page: 1, limit: 100 })).data;
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Unable to load graduations";
  }
  return <GraduationsClient initialStudents={students} initialError={error} />;
}
