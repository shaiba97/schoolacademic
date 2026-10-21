"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useMockStore } from "@/lib/mock/hooks";
import { confirmPromotions, proposePromotions } from "@/lib/mock/store";
import type { PromotionDecision } from "@/lib/mock/types";

export default function PromotionGraduationPage() {
  const router = useRouter();
  const { store, refresh } = useMockStore();
  const proposals = proposePromotions("ay-2024");
  const grads = proposals
    .filter((decision) => decision.decision === "GRADUATE")
    .map((decision) => store.promotions.find((saved) => saved.studentId === decision.studentId) ?? decision);
  const columns: Column<PromotionDecision>[] = [
    { id: "student", header: "Student", accessor: (row) => store.students.find((student) => student.id === row.studentId)?.fullname ?? row.studentId, sortable: true },
    { id: "decision", header: "Decision", accessor: () => <Badge>Graduate</Badge> },
    { id: "reason", header: "Reason", accessor: (row) => row.reason ?? "—" },
    { id: "status", header: "Status", accessor: (row) => <Badge variant={row.status === "CONFIRMED" ? "success" : "muted"}>{row.status}</Badge> },
  ];
  function confirmGraduations() {
    confirmPromotions(grads);
    refresh();
  }
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Graduation</h1>
        <p className="text-sm text-muted-foreground">Terminal promotion decisions use the same shared service as Promote Students.</p>
      </div>
      {grads.length > 0 ? (
        <DataTable
          data={grads}
          columns={columns}
          getRowId={(row) => row.id}
          primaryAction={{ label: "Confirm graduations", onClick: confirmGraduations }}
        />
      ) : (
        <EmptyState title="No graduations" description="Graduation proposals appear here when published results mark a student as terminal." action={{ label: "Open Promote Students", onClick: () => router.push("/promotion/promote") }} />
      )}
      <p className="text-xs text-muted-foreground">Promotion decisions are shared with Students and Promote Students — no duplicate business logic.</p>
    </div>
  );
}
