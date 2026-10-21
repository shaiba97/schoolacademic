import { notFound } from "next/navigation";
import { GradeDetailClient } from "@/components/academics/grade-detail-client";
import { GRADES } from "@/components/academics/grade-keys";
import { listClasses } from "@/lib/api/classes";
import { listSubjects } from "@/lib/api/subjects";
import { listTeachers } from "@/lib/api/teachers";
import type { ApiPaginated, ApiSchoolClass, ApiSubject, ApiTeacher } from "@/lib/api/types";

type GradeDetailParams = Promise<{ level: string; grade: string }>;

export default async function GradeDetailPage({ params, searchParams }: { params: GradeDetailParams; searchParams: Promise<{ edit?: string | string[] }> }) {
  const { level, grade } = await params;
  const query = await searchParams;
  const editParam = query.edit;
  const initialEditId = Array.isArray(editParam) ? editParam[0] : editParam;
  const match = GRADES.find(
    (row) => row.level.toLowerCase() === level.toLowerCase() && row.grade.toLowerCase() === grade.toLowerCase(),
  );
  if (!match) notFound();

  let data: ApiPaginated<ApiSchoolClass> = { data: [], total: 0, page: 1, limit: 100 };
  let subjects: ApiSubject[] = [];
  let teachers: ApiTeacher[] = [];
  let initialError = "";
  try {
    const [classesRes, subjectsRes, teachersRes] = await Promise.all([
      listClasses({ page: 1, limit: 100 }),
      listSubjects({ page: 1, limit: 100 }),
      listTeachers({ page: 1, limit: 999 }),
    ]);
    data = classesRes;
    subjects = subjectsRes.data;
    teachers = teachersRes.data;
  } catch (cause) {
    initialError = cause instanceof Error ? cause.message : "Unable to load grade data";
  }

  return <GradeDetailClient grade={match} initialData={data} initialError={initialError} subjects={subjects} teachers={teachers} initialEditId={initialEditId} />;
}
