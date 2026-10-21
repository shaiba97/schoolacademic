"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, Plus, Search } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ExamWizardDialog } from "@/components/examinations/exam-wizard-dialog";
import { createExam, listExams } from "@/lib/api/exams";
import type {
  ApiAcademicYear,
  ApiExam,
  ApiExamType,
  ApiGradingScale,
  ApiPaginated,
  CreateExamPayload,
} from "@/lib/api/types";
import { academicErrorMessage } from "@/components/academics/academic-utils";

function statusVariant(status: string): "outline" | "secondary" | "success" | "muted" | "destructive" {
  switch (status) {
    case "PUBLISHED":
      return "success";
    case "DRAFT":
      return "muted";
    case "CLOSED":
      return "outline";
    default:
      return "secondary";
  }
}

function authorName(exam: ApiExam): string {
  if (!exam.author) return "—";
  return [exam.author.firstName, exam.author.lastName].filter(Boolean).join(" ") || "—";
}

export function ExamsTab({
  initialData,
  types,
  scales,
  years,
}: {
  initialData: ApiPaginated<ApiExam>;
  types: ApiExamType[];
  scales: ApiGradingScale[];
  years: ApiAcademicYear[];
}) {
  const router = useRouter();
  const [data, setData] = React.useState(initialData);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  async function handleCreate(payload: CreateExamPayload) {
    setPending(true);
    setFormError("");
    try {
      const created = await createExam(payload);
      const rows = Array.isArray(created) ? created : [created];
      setData((current) => ({
        ...current,
        total: current.total + rows.length,
        data: [...rows, ...current.data],
      }));
      setWizardOpen(false);
      router.push(`/examinations/exam-setup/${rows[0].id}`);
    } catch (cause) {
      setFormError(academicErrorMessage(cause, "Unable to create exam"));
    } finally {
      setPending(false);
    }
  }

  async function retry() {
    setLoading(true);
    setError("");
    try {
      setData(await listExams({ page: 1, limit: 100 }));
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to load exams"));
    } finally {
      setLoading(false);
    }
  }

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.data;
    return data.data.filter((exam) => exam.name.toLowerCase().includes(q));
  }, [data.data, search]);

  const columns: Column<ApiExam>[] = [
    {
      id: "name",
      header: "Exam",
      accessor: (exam) => <span className="font-medium">{exam.name}</span>,
      sortable: true,
    },
    {
      id: "type",
      header: "Type",
      accessor: (exam) => <span className="text-sm">{exam.examType?.name ?? "—"}</span>,
      sortable: true,
    },
    {
      id: "subjects",
      header: "Subjects",
      accessor: (exam) => <Badge variant="outline">{exam._count?.examSubjects ?? exam.examSubjects?.length ?? 0}</Badge>,
      sortable: true,
    },
    {
      id: "rooms",
      header: "Rooms",
      accessor: (exam) => <Badge variant="outline">{exam._count?.examRoomAssignments ?? 0}</Badge>,
      sortable: true,
    },
    {
      id: "author",
      header: "Author",
      accessor: (exam) => <span className="text-sm">{authorName(exam)}</span>,
      sortable: true,
    },
    {
      id: "status",
      header: "Status",
      accessor: (exam) => <Badge variant={statusVariant(exam.status)}>{exam.status}</Badge>,
      sortable: true,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between items-start">
        <p className="text-sm text-muted-foreground">
          Exam instances tied to a type and term. Subjects are configured per exam.
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/examinations/exam-setup/new")}>
            New Class Exam
          </Button>
          <Button
            type="button"
            onClick={() => { setFormError(""); setWizardOpen(true); }}
            disabled={pending || types.length === 0 || years.length === 0}
            title={types.length === 0 ? "Create an exam type first" : years.length === 0 ? "Create an academic year first" : undefined}
          >
            <Plus size={16} /> New Exam
          </Button>
        </div>
      </div>

      {types.length === 0 ? (
        <p role="note" className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          Create an exam type first — exams cannot exist without one.
        </p>
      ) : null}

      {error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void retry()} disabled={loading}>
            Retry
          </Button>
        </div>
      ) : null}

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-2.5 top-2.5 text-muted-foreground" aria-hidden />
        <Input
          placeholder="Search exams…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-8"
          aria-label="Search exams"
        />
      </div>

      {loading && data.data.length === 0 ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-12 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 && data.data.length === 0 ? (
        <EmptyState
          title="No exams yet"
          description="Create your first exam with the wizard: type, term and dates, then subjects."
          action={types.length > 0 && years.length > 0 ? { label: "New Exam", onClick: () => setWizardOpen(true) } : undefined}
        />
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(exam) => exam.id}
          onRowClick={(exam) => router.push(`/examinations/exam-setup/${exam.id}`)}
          rowActions={[
            { label: "View", icon: <Eye size={14} />, onClick: (exam) => router.push(`/examinations/exam-setup/${exam.id}`) },
          ]}
          emptyTitle="No exams found"
          emptyDescription="No exams match the current search."
        />
      )}

      <ExamWizardDialog
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        types={types}
        scales={scales}
        years={years}
        pending={pending}
        error={formError}
        onSubmit={handleCreate}
      />
    </div>
  );
}
