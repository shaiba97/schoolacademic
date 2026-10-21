import { ExamSetupClient } from "@/components/examinations/exam-setup-client";
import { listExamTypes } from "@/lib/api/exam-types";
import { listExams } from "@/lib/api/exams";
import { listGradingScales } from "@/lib/api/grading";
import { listAcademicYears } from "@/lib/api/academic-years";
import { academicErrorMessage } from "@/components/academics/academic-utils";

export default async function ExamSetupPage() {
  const [typesResult, examsResult, scalesResult, yearsResult] = await Promise.allSettled([
    listExamTypes(),
    listExams({ page: 1, limit: 100 }),
    listGradingScales(),
    listAcademicYears({ page: 1, limit: 100 }),
  ]);

  const types = typesResult.status === "fulfilled" ? typesResult.value : [];
  const exams = examsResult.status === "fulfilled" ? examsResult.value : { data: [], page: 1, limit: 100, total: 0 };
  const scales = scalesResult.status === "fulfilled" ? scalesResult.value : [];
  const years = yearsResult.status === "fulfilled" ? yearsResult.value.data : [];
  const initialError =
    typesResult.status === "rejected"
      ? academicErrorMessage(typesResult.reason, "Unable to load exam types")
      : examsResult.status === "rejected"
        ? academicErrorMessage(examsResult.reason, "Unable to load exams")
        : "";

  return (
    <ExamSetupClient
      initialTypes={types}
      initialExams={exams}
      initialScales={scales}
      years={years}
      initialError={initialError}
    />
  );
}
