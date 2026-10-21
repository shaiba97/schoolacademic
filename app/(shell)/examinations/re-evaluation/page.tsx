import { redirect } from "next/navigation";

// Consolidated into Marks & Results: recheck requests attach to published marks.
export default function ReEvaluationPage() {
  redirect("/examinations/marks-results");
}
