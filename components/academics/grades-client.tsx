"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { listClasses } from "@/lib/api/classes";
import type { ApiPaginated, ApiSchoolClass } from "@/lib/api/types";
import { academicErrorMessage } from "./academic-utils";
import { GRADES, gradeDetailHref, type GradeKey } from "./grade-keys";

type GradeRow = GradeKey & { classes: number; students: number; capacity: number };

export function GradesClient({
  initialData,
  initialError = "",
}: {
  initialData: ApiPaginated<ApiSchoolClass>;
  initialError?: string;
}) {
  const router = useRouter();
  const [data, setData] = React.useState(initialData);
  const [error, setError] = React.useState(initialError);
  const [loading, setLoading] = React.useState(false);

  const rows: GradeRow[] = React.useMemo(
    () =>
      GRADES.map((grade) => {
        const matching = data.data.filter(
          (schoolClass) =>
            schoolClass.educationLevel === grade.level && schoolClass.grade === grade.grade,
        );
        return {
          ...grade,
          classes: matching.length,
          students: matching.reduce((sum, schoolClass) => sum + (schoolClass.counts?.students ?? 0), 0),
          capacity: matching.reduce((sum, schoolClass) => sum + (schoolClass.capacity ?? 0), 0),
        };
      }),
    [data.data],
  );

  const retry = async () => {
    setLoading(true);
    setError("");
    try {
      setData(await listClasses({ page: 1, limit: 100 }));
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to load grades"));
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<GradeRow>[] = [
    {
      id: "grade",
      header: "Grade",
      accessor: (row) => <span className="font-medium">{row.label}</span>,
      sortable: true,
    },
    {
      id: "level",
      header: "Education Level",
      accessor: (row) => (
        <Badge variant={row.level === "SECONDARY" ? "secondary" : "info"}>{row.level}</Badge>
      ),
      sortable: true,
    },
    {
      id: "classes",
      header: "Classes",
      accessor: (row) => <span className="tabular-nums">{row.classes}</span>,
      sortable: true,
    },
    {
      id: "students",
      header: "Students",
      accessor: (row) => <span className="tabular-nums">{row.students}</span>,
      sortable: true,
    },
    {
      id: "capacity",
      header: "Capacity",
      accessor: (row) => <span className="tabular-nums">{row.capacity || "—"}</span>,
      sortable: true,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Grades</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every grade across both levels — open one to manage its classes.
        </p>
      </div>

      {error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void retry()} disabled={loading}>Retry</Button>
        </div>
      ) : null}

      {loading && data.data.length === 0 ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2].map((item) => <Skeleton key={item} className="h-12 w-full" />)}
        </div>
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          getRowId={(row) => `${row.level}-${row.grade}`}
          onRowClick={(row) => router.push(gradeDetailHref(row.level, row.grade))}
          emptyTitle="No grades found"
          emptyDescription="Grades are derived from the class structure."
        />
      )}
    </div>
  );
}
