import Link from "next/link";
import { TeacherDetailClient } from "@/components/teachers/teacher-detail-client";
import { getTeacher } from "@/lib/api/teachers";
import { listDepartments } from "@/lib/api/departments";
import { academicErrorMessage } from "@/components/academics/academic-utils";

type Params = Promise<{ id: string }>;

export default async function TeacherDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const [teacherResult, departmentsResult] = await Promise.allSettled([getTeacher(id), listDepartments()]);

  if (teacherResult.status === "rejected") {
    return (
      <div className="space-y-4">
        <Link href="/teachers" className="text-sm text-muted-foreground hover:text-foreground">← Back to Teachers</Link>
        <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Teacher not found</p>
          <p className="mt-1 text-destructive/80">{academicErrorMessage(teacherResult.reason, "The teacher record could not be loaded.")}</p>
        </div>
      </div>
    );
  }

  return (
    <TeacherDetailClient
      teacher={teacherResult.value}
      departments={departmentsResult.status === "fulfilled" ? departmentsResult.value : []}
      departmentsError={departmentsResult.status === "rejected" ? academicErrorMessage(departmentsResult.reason, "Unable to load departments") : ""}
    />
  );
}