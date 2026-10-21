import { GradesClient } from "@/components/academics/grades-client";
import { listClasses } from "@/lib/api/classes";
import type { ApiPaginated, ApiSchoolClass } from "@/lib/api/types";

export default async function GradesPage() {
  let data: ApiPaginated<ApiSchoolClass> = { data: [], total: 0, page: 1, limit: 100 };
  let initialError = "";
  try {
    data = await listClasses({ page: 1, limit: 100 });
  } catch (cause) {
    initialError = cause instanceof Error ? cause.message : "Unable to load grades";
  }

  return <GradesClient initialData={data} initialError={initialError} />;
}
