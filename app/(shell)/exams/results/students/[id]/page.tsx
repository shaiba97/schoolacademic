import { StudentResultsClient } from "@/components/exams/student-results-client";

type Params = Promise<{ id: string }>;

export default async function ExamResultsStudentPage({ params }: { params: Params }) {
  const { id } = await params;
  return <StudentResultsClient studentId={id} />;
}
