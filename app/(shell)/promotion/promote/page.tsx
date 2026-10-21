"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Stepper } from "@/components/ui/stepper";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useMockStore } from "@/lib/mock/hooks";
import { confirmPromotions, proposePromotions } from "@/lib/mock/store";
import type { PromotionDecision } from "@/lib/mock/types";

const YEAR_ID = "ay-2024";

export default function PromotePage() {
  return (
    <React.Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <PromotePageInner />
    </React.Suspense>
  );
}

function PromotePageInner() {
  const searchParams = useSearchParams();
  const { store, refresh } = useMockStore();
  const [active, setActive] = React.useState(0);
  const [decisions, setDecisions] = React.useState<PromotionDecision[]>([]);
  const [confirmed, setConfirmed] = React.useState(false);
  const selectedIds = React.useMemo(() => (searchParams.get("students") ?? "").split(",").map((id) => id.trim()).filter(Boolean), [searchParams]);

  const steps = [
    { id: "select", label: "Select year", description: "Published results drive promotion proposals" },
    { id: "propose", label: "Propose", description: "Editable pass/fail per student" },
    { id: "confirm", label: "Confirm", description: "Creates enrollment, repeat, or graduation state" },
  ];

  function load() {
    setDecisions(proposePromotions(YEAR_ID, selectedIds.length ? selectedIds : undefined));
    setConfirmed(false);
    setActive(1);
  }

  function handleConfirm() {
    if (decisions.length === 0) return;
    confirmPromotions(decisions);
    setDecisions((current) => current.map((decision) => ({ ...decision, status: "CONFIRMED" })));
    setConfirmed(true);
    refresh();
  }

  const columns: Column<PromotionDecision>[] = [
    {
      id: "student",
      header: "Student",
      accessor: (row) => {
        const student = store.students.find((item) => item.id === row.studentId);
        return student ? <span className="font-medium">{student.fullname} — {student.roleNumber}</span> : row.studentId;
      },
    },
    {
      id: "decision",
      header: "Decision",
      accessor: (row) => (
        <Select aria-label={`Decision for ${row.studentId}`} value={row.decision} onChange={(event) => setDecisions((current) => current.map((item) => item.id === row.id ? { ...item, decision: event.target.value as PromotionDecision["decision"] } : item))} className="h-8 w-32">
          <option value="PROMOTE">Promote</option>
          <option value="REPEAT">Repeat</option>
          <option value="GRADUATE">Graduate</option>
        </Select>
      ),
    },
    { id: "reason", header: "Reason", accessor: (row) => row.reason ?? "—" },
    { id: "status", header: "Status", accessor: (row) => <Badge variant={row.status === "CONFIRMED" ? "success" : "muted"}>{row.status}</Badge> },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Promote Students</h1>
        <p className="text-sm text-muted-foreground">Published results create editable proposals. Confirming updates enrollment, repeat, or graduation state.</p>
      </div>
      <Stepper steps={steps} active={active} onStepChange={setActive} onComplete={handleConfirm}>
        {(step) => (
          <>
            {step === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Academic year: <Badge variant="outline">2024-2025</Badge></p>
                {selectedIds.length > 0 ? <p className="text-sm text-muted-foreground">{selectedIds.length} student{selectedIds.length === 1 ? "" : "s"} preselected from Students.</p> : null}
                <Button onClick={load}>Propose promotions</Button>
              </div>
            ) : null}
            {step === 1 ? (
              decisions.length > 0 ? <DataTable data={decisions} columns={columns} getRowId={(row) => row.id} /> : <EmptyState title="No eligible students" description="Only students with published results can be proposed for promotion." action={{ label: "Back", onClick: () => setActive(0) }} />
            ) : null}
            {step === 2 ? (
              <div className="rounded-lg border bg-muted/20 p-4 text-sm">
                <p>{decisions.length} decisions ready. Confirming will create next enrollments, keep repeats in place, or mark graduations.</p>
                {confirmed ? <Badge variant="success" className="mt-2">Confirmed</Badge> : null}
              </div>
            ) : null}
          </>
        )}
      </Stepper>
    </div>
  );
}
