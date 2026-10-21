import { redirect } from "next/navigation";

// Consolidated into Exams: types and grading scales live on the Exam Setup tabs.
export default function ExaminationSettingsPage() {
  redirect("/examinations/exam-setup");
}
