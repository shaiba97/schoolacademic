import Link from "next/link";
import { DepartmentDetailClient } from "@/components/departments/department-detail-client";
import { getDepartment } from "@/lib/api/departments";
import { listTeachers } from "@/lib/api/teachers";
import { academicErrorMessage } from "@/components/academics/academic-utils";

type Params = Promise<{ id: string }>;

export default async function DepartmentDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const [departmentResult, teachersResult] = await Promise.allSettled([
    getDepartment(id),
    listTeachers({ departmentId: id, page: 1, limit: 100 }),
  ]);

  if (departmentResult.status === "rejected") {
    return (
      <div className="space-y-4">
        <Link href="/departments" className="text-sm text-muted-foreground hover:text-foreground">← Back to Departments</Link>
        <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Department not found</p>
          <p className="mt-1 text-destructive/80">{academicErrorMessage(departmentResult.reason, "The department record could not be loaded.")}</p>
        </div>
      </div>
    );
  }

  return (
    <DepartmentDetailClient
      department={departmentResult.value}
      teachers={teachersResult.status === "fulfilled" ? teachersResult.value.data : []}
      teachersError={teachersResult.status === "rejected" ? academicErrorMessage(teachersResult.reason, "Unable to load teachers") : ""}
    />
  );
}
