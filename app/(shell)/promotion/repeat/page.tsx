"use client";

import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useMockStore } from "@/lib/mock/hooks";
import { proposePromotions } from "@/lib/mock/store";
import type { PromotionDecision } from "@/lib/mock/types";

export default function RepeatPage() {
  const { store } = useMockStore();
  const proposals = proposePromotions("ay-2024");
  const decisions = proposals
    .filter((decision) => decision.decision === "REPEAT")
    .map((decision) => store.promotions.find((saved) => saved.studentId === decision.studentId) ?? decision);
  const columns: Column<PromotionDecision>[] = [
    { id: "student", header: "Student", accessor: (row) => store.students.find((student) => student.id === row.studentId)?.fullname ?? row.studentId, sortable: true },
    { id: "decision", header: "Decision", accessor: () => <Badge variant="warning">Repeat</Badge> },
    { id: "reason", header: "Reason", accessor: (row) => row.reason ?? "—" },
    { id: "status", header: "Status", accessor: (row) => <Badge variant={row.status === "CONFIRMED" ? "success" : "muted"}>{row.status}</Badge> },
  ];
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Repeat</h1>
        <p className="text-sm text-muted-foreground">Students staying in the same class or section appear here from promotion proposals.</p>
      </div>
      {decisions.length > 0 ? <DataTable data={decisions} columns={columns} getRowId={(row) => row.id} /> : <EmptyState title="No repeats" description="No students currently need to repeat based on published results." />}
    </div>
  );
}
