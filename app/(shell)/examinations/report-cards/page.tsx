import { redirect } from "next/navigation";

// Consolidated into Marks & Results: report cards generate from published results.
export default function ReportCardsPage() {
  redirect("/examinations/marks-results");
}
