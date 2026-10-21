import { StudentsAllClient } from "@/components/students/students-all-client";
import { listStudents } from "@/lib/api/students";
import type { ApiPaginated, ApiStudent } from "@/lib/api/types";

export default async function StudentsAllPage() {
  let data: ApiPaginated<ApiStudent>;
  let initialError: string | undefined;
  try {
    data = await listStudents({ page: 1, limit: 50 });
  } catch (error) {
    data = { data: [], total: 0, page: 1, limit: 50 };
    initialError = error instanceof Error ? error.message : "Unable to load students";
  }
  return <StudentsAllClient initialData={data} initialError={initialError} />;
}
