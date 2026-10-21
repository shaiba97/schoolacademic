import { redirect } from "next/navigation";

// Consolidated into Rooms: invigilators are managed per room assignment on the exam page.
export default function InvigilationPage() {
  redirect("/examinations/rooms");
}
