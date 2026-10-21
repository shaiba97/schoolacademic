import { ClassExamWizard } from "@/components/examinations/class-exam-wizard";
import { listAcademicYears } from "@/lib/api/academic-years";
import { listGradingScales } from "@/lib/api/grading";
import { academicErrorMessage } from "@/components/academics/academic-utils";

export default async function NewClassExamPage() {
  const [yearsResult, scalesResult] = await Promise.allSettled([
    listAcademicYears({ page: 1, limit: 100 }),
    listGradingScales(),
  ]);

  if (yearsResult.status === "rejected") {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">New Class Exam</h1>
        <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Reference data could not be loaded</p>
          <p className="mt-1 text-destructive/80">{academicErrorMessage(yearsResult.reason, "Academic years are required to create an exam.")}</p>
        </div>
      </div>
    );
  }

  return (
    <ClassExamWizard
      years={yearsResult.value.data}
      scales={scalesResult.status === "fulfilled" ? scalesResult.value : []}
    />
  );
}
