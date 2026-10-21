import { SubjectsClient } from "@/components/academics/subjects-client";
import { listSubjects } from "@/lib/api/subjects";
import type { ApiSubject, ApiPaginated } from "@/lib/api/types";

export default async function SubjectsPage() {
  let data: ApiPaginated<ApiSubject> = { data: [], total: 0, page: 1, limit: 100 };
  let initialError = "";
  try {
    data = await listSubjects({ page: 1, limit: 100 });
  } catch (cause) {
    initialError = cause instanceof Error ? cause.message : "Unable to load subjects";
  }
  return <SubjectsClient initialData={data} initialError={initialError} />;
}
