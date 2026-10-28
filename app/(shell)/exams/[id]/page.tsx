import { ExamDetailClient } from "@/components/examinations/exam-detail-client";
import { getExam } from "@/lib/api/exams";
import { listExamTypes } from "@/lib/api/exam-types";
import { listGradingScales } from "@/lib/api/grading";
import { academicErrorMessage } from "@/components/academics/academic-utils";

type Params = Promise<{ id: string }>;

export default async function ExamDetailsPage({ params }: { params: Params }) {
  const { id } = await params;
  const [examResult, typesResult, scalesResult] = await Promise.allSettled([
    getExam(id),
    listExamTypes(),
    listGradingScales(),
  ]);

  if (examResult.status === "rejected") {
    return (
      <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        <p className="font-medium">Exam not found</p>
        <p className="mt-1 text-destructive/80">{academicErrorMessage(examResult.reason, "The exam record could not be loaded.")}</p>
      </div>
    );
  }

  return (
    <ExamDetailClient
      exam={examResult.value}
      types={typesResult.status === "fulfilled" ? typesResult.value : []}
      scales={scalesResult.status === "fulfilled" ? scalesResult.value : []}
    />
  );
}
