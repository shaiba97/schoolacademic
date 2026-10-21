import { DepartmentsClient } from "@/components/departments/departments-client";
import { listDepartments } from "@/lib/api/departments";
import { academicErrorMessage } from "@/components/academics/academic-utils";

export default async function DepartmentsPage() {
  const [departmentsResult] = await Promise.allSettled([listDepartments()]);

  const departments = departmentsResult.status === "fulfilled" ? departmentsResult.value : [];
  const initialError = departmentsResult.status === "rejected" ? academicErrorMessage(departmentsResult.reason, "Unable to load departments") : "";

  return <DepartmentsClient initialData={departments} initialError={initialError} />;
}
