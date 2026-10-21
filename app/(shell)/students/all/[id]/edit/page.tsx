import Link from "next/link";
import { AdmissionEditClient } from "@/components/students/admission-edit-client";
import { getStudent, listStudentGuardians } from "@/lib/api/students";
import { academicErrorMessage } from "@/components/academics/academic-utils";

type Params = Promise<{ id: string }>;

export default async function StudentEditPage({ params }: { params: Params }) {
  const { id } = await params;

  let student = null;
  try {
    student = await getStudent(id);
  } catch (error) {
    return (
      <div className="space-y-4">
        <Link href="/students/all" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Students
        </Link>
        <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Student not found</p>
          <p className="mt-1 text-destructive/80">{academicErrorMessage(error, "The student record could not be loaded.")}</p>
        </div>
      </div>
    );
  }

  const guardiansResult = await Promise.allSettled([listStudentGuardians(id)]).then(
    ([result]) => result,
  );

  return (
    <AdmissionEditClient
      student={student}
      initialGuardians={guardiansResult.status === "fulfilled" ? guardiansResult.value : []}
    />
  );
}
