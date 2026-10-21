import { TeachersClient } from "@/components/teachers/teachers-client";
import { listTeachers } from "@/lib/api/teachers";
import { listDepartments } from "@/lib/api/departments";
import { academicErrorMessage } from "@/components/academics/academic-utils";

export default async function TeachersPage() {
  const [teachersResult, departmentsResult] = await Promise.allSettled([listTeachers({ page: 1, limit: 100 }), listDepartments()]);

  const teachers = teachersResult.status === "fulfilled" ? teachersResult.value : { data: [], page: 1, limit: 100, total: 0 };
  const departments = departmentsResult.status === "fulfilled" ? departmentsResult.value : [];
  const initialError = teachersResult.status === "rejected" ? academicErrorMessage(teachersResult.reason, "Unable to load teachers") : "";

  return <TeachersClient initialData={teachers} departments={departments} initialError={initialError} />;
}