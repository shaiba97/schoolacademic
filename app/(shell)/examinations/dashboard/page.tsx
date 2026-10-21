import { redirect } from "next/navigation";

// Consolidated into Exams: the per-exam list carries status, subjects, rooms, and author.
export default function ExaminationsDashboardPage() {
  redirect("/examinations/exam-setup");
}
