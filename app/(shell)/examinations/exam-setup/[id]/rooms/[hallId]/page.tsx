import Link from "next/link";
import { RoomPrintClient } from "@/components/examinations/room-print-client";
import { getExam } from "@/lib/api/exams";
import { listExamSlots } from "@/lib/api/scheduling";
import { getHall } from "@/lib/api/halls";
import { academicErrorMessage } from "@/components/academics/academic-utils";

type Params = Promise<{ id: string; hallId: string }>;

export default async function RoomPrintPage({ params }: { params: Params }) {
  const { id, hallId } = await params;
  const [examResult, slotsResult, hallResult] = await Promise.allSettled([
    getExam(id),
    listExamSlots(id),
    getHall(hallId),
  ]);

  if (examResult.status === "rejected" || hallResult.status === "rejected") {
    const reason =
      examResult.status === "rejected" ? examResult.reason : (hallResult as PromiseRejectedResult).reason;
    return (
      <div className="space-y-4">
        <Link href="/examinations/exam-setup" className="text-sm text-muted-foreground hover:text-foreground print:hidden">
          ← Back to Exam Setup
        </Link>
        <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Room card could not be loaded</p>
          <p className="mt-1 text-destructive/80">{academicErrorMessage(reason, "The exam or hall record could not be loaded.")}</p>
        </div>
      </div>
    );
  }

  const slots = slotsResult.status === "fulfilled" ? slotsResult.value : [];
  const hallSlots = slots.filter((s) => s.hallId === hallId);

  return (
    <RoomPrintClient
      exam={examResult.value}
      hall={hallResult.value}
      slots={hallSlots}
      slotsError={slotsResult.status === "rejected" ? academicErrorMessage(slotsResult.reason, "Unable to load sessions") : ""}
    />
  );
}
