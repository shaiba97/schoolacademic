import { redirect } from "next/navigation";

// Consolidated into Rooms: hall-level assignments with auto-seating replace per-session slots.
export default function SchedulingPage() {
  redirect("/examinations/rooms");
}
