"use client";

import * as React from "react";
import {
  Archive,
  Clock,
  Download,
  Eye,
  FileText,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  TrendingUp,
  UserCog,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { listStudents } from "@/lib/api/students";
import type { ApiPaginated, ApiStudent } from "@/lib/api/types";
import { currentEnrollment, studentFullName } from "@/lib/api/mappers";
import { toTitleCase } from "@/lib/text";
import { formatAcademicDate } from "@/components/academics/academic-utils";
import { cn } from "@/lib/utils";
import { studentStatusBadgeVariant, useStudentActions } from "@/components/students/use-student-actions";

function MenuButton({
  label,
  icon,
  items,
}: {
  label: string;
  icon: React.ReactNode;
  items: Array<{ label: string; icon?: React.ReactNode; destructive?: boolean; onSelect: () => void }>;
}) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const itemRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  function close(returnFocus = true) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  React.useEffect(() => {
    if (!open) return;
    itemRefs.current[0]?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open ]);

  function onItemKeyDown(event: React.KeyboardEvent, index: number, count: number) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      itemRefs.current[(index + 1) % count]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      itemRefs.current[(index - 1 + count) % count]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      itemRefs.current[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      itemRefs.current[count - 1]?.focus();
    }
  }

  return (
    <div className="relative inline-block">
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        size="sm"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? close(false) : setOpen(true))}
      >
        {icon}
      </Button>
      {open ? (
        <>
          <div
            aria-hidden
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => close(false)}
          />
          <div role="menu" aria-label={label} className="absolute right-0 z-20 mt-1 min-w-[190px] rounded-lg border bg-popover p-1 shadow-md">
            {items.map((item, index) => (
              <button
                key={item.label}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                type="button"
                role="menuitem"
                onClick={() => {
                  close(false);
                  item.onSelect();
                }}
                onKeyDown={(event) => onItemKeyDown(event, index, items.length)}
                className={cn(
                  "relative flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none hover:bg-muted focus:bg-muted",
                  item.destructive ? "text-destructive" : "",
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function StudentsAllClient({ initialData, initialError }: { initialData: ApiPaginated<ApiStudent>; initialError?: string }) {
  const router = useRouter();
  const [data, setData] = React.useState(initialData);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(initialError ?? "");
  const [levelFilter, setLevelFilter] = React.useState("ALL");
  const [gradeFilter, setGradeFilter] = React.useState("ALL");
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  const actions = useStudentActions({
    onChanged: (updated) =>
      setData((current) => ({
        ...current,
        data: current.data.map((s) => (s.id === updated.id ? updated : s)),
      })),
    onError: (message) => setError(message),
    onDeleted: (deletedId) =>
      setData((current) => ({
        ...current,
        total: current.total - 1,
        data: current.data.filter((s) => s.id !== deletedId),
      })),
  });

  type Filters = { level: string; grade: string; status: string };

  async function load(nextPage = page, filters: Filters = { level: levelFilter, grade: gradeFilter, status: statusFilter }) {
    setLoading(true);
    setError("");
    try {
      const result = await listStudents({
        page: nextPage,
        limit: 50,
        search: search || undefined,
        status: filters.status !== "ALL" ? filters.status : undefined,
        educationLevel: filters.level !== "ALL" ? filters.level : undefined,
        grade: filters.grade !== "ALL" ? Number(filters.grade) : undefined,
      });
      setData(result);
      setPage(nextPage);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load students");
    } finally {
      setLoading(false);
    }
  }

  const filtered = data.data;

  function classCell(student: ApiStudent) {
    const schoolClass = currentEnrollment(student)?.schoolClass;
    if (!schoolClass) return "—";
    const showTrack =
      schoolClass.educationLevel === "SECONDARY" &&
      (schoolClass.grade === "SECOND" || schoolClass.grade === "THIRD") &&
      !!schoolClass.track;
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="text-sm">{schoolClass.className}</span>
        {showTrack ? (
          <Badge variant="outline">{schoolClass.track === "SCIENCE" ? "Science" : "Art"}</Badge>
        ) : null}
      </span>
    );
  }

  const columns: Column<ApiStudent>[] = [
    { id: "roleNumber", header: "Roll No", accessor: (student) => <span className="font-mono text-xs tracking-wider">{student.roleNumber}</span>, sortable: true },
    { id: "name", header: "Name", accessor: (student) => <span className="font-medium truncate min-w-0 block">{toTitleCase(studentFullName(student))}</span>, sortable: true },
    {
      id: "level",
      header: "Education Level",
      accessor: (student) => <span className="text-sm">{student.educationLevel ?? "—"}</span>,
      sortable: true,
    },
    { id: "className", header: "Class", accessor: (student) => classCell(student) },
    { id: "status", header: "Status", accessor: (student) => <Badge variant={studentStatusBadgeVariant(student.status)}>{student.status}</Badge>, sortable: true },
    { id: "joined", header: "Joined", accessor: (student) => <span className="text-sm">{formatAcademicDate(student.admissionDate ?? student.createdAt)}</span>, sortable: true },
    {
      id: "actions",
      header: "Actions",
      accessor: (student) => (
        <span className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <MenuButton
            label={`Student actions for ${studentFullName(student)}`}
            icon={<UserCog size={14} />}
            items={[
              { label: "View", icon: <Eye size={14} />, onSelect: () => router.push(`/students/all/${student.id}`) },
              { label: "Edit", icon: <Pencil size={14} />, onSelect: () => router.push(`/students/all/${student.id}/edit`) },
              {
                label: "Archive",
                icon: <Archive size={14} />,
                onSelect: () => actions.openArchive(student),
              },
              {
                label: "Fire",
                icon: <Trash2 size={14} />,
                destructive: true,
                onSelect: () => actions.openStatus(student, "FIRE"),
              },
              {
                label: "Postpone",
                icon: <Clock size={14} />,
                onSelect: () => actions.openStatus(student, "POSTPONE"),
              },
              {
                label: "Transfer",
                icon: <TrendingUp size={14} />,
                onSelect: () => actions.transferTo(student),
              },
              {
                label: "Delete",
                icon: <Trash2 size={14} />,
                destructive: true,
                onSelect: () => actions.openDelete(student),
              },
            ]}
          />
          <MenuButton
            label={`Admission actions for ${studentFullName(student)}`}
            icon={<FileText size={14} />}
            items={[
              { label: "View", icon: <Eye size={14} />, onSelect: () => actions.openAdmission(student) },
              { label: "Print…", icon: <Printer size={14} />, onSelect: () => actions.openAdmission(student) },
              { label: "Download…", icon: <Download size={14} />, onSelect: () => actions.openAdmission(student) },
            ]}
          />
        </span>
      ),
    },
  ];

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">Students</h1>
          <p className="text-sm text-muted-foreground">Live student records from the Academic API.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/students/admissions")}><Plus size={16} /> New Admission</Button>
        </div>
      </div>

      <form className="flex flex-col gap-2 sm:flex-row sm:flex-wrap" onSubmit={(event) => { event.preventDefault(); void load(1); }}>
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-2.5 top-2.5 text-muted-foreground" aria-hidden />
          <Input placeholder="Search name or role number" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-8" aria-label="Search students" />
        </div>
        <Button type="submit" disabled={loading}>{loading ? "Searching…" : "Search"}</Button>
        {search ? <Button type="button" variant="ghost" onClick={() => { setSearch(""); void load(1); }}>Clear</Button> : null}
      </form>

      <div className="flex flex-wrap gap-2">
        <select
          value={levelFilter}
          onChange={(event) => { const v = event.target.value; setLevelFilter(v); void load(1, { level: v, grade: gradeFilter, status: statusFilter }); }}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          aria-label="Filter by education level"
        >
          <option value="ALL">All Levels</option>
          <option value="SECONDARY">Secondary</option>
          <option value="INTERMEDIATE">Intermediate</option>
        </select>
        <select
          value={gradeFilter}
          onChange={(event) => { const v = event.target.value; setGradeFilter(v); void load(1, { level: levelFilter, grade: v, status: statusFilter }); }}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          aria-label="Filter by grade"
        >
          <option value="ALL">All Grades</option>
          {["1", "2", "3", "6", "7", "8", "9"].map((g) => (
            <option key={g} value={g}>Grade {g}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => { const v = event.target.value; setStatusFilter(v); void load(1, { level: levelFilter, grade: gradeFilter, status: v }); }}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          aria-label="Filter by status"
        >
          <option value="ALL">All Statuses</option>
          {["PENDING_ADMISSION", "ACTIVE", "INACTIVE", "GRADUATED", "TRANSFERRED", "WITHDRAWN", "POSTPONED", "FIRED"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {error ? <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}

      {actions.actionPending ? (
        <p role="status" className="text-xs text-muted-foreground">Working…</p>
      ) : null}

      {filtered.length === 0 && !loading ? <EmptyState title="No students found" description={search ? "Try a different search." : "Create the first student through New Admission."} action={{ label: "New Admission", onClick: () => router.push("/students/admissions") }} /> : (
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(student) => student.id}
          onRowClick={(student) => router.push(`/students/all/${student.id}`)}
          bulkActions={[{ label: "Bulk Promote", icon: <TrendingUp size={14} />, onClick: (rows) => router.push(`/promotion/promote?students=${encodeURIComponent(rows.map((row) => row.id).join(","))}`) }]}
          pageSize={50}
          emptyTitle="No students"
          emptyDescription="No student records match the current filters."
        />
      )}

      {data.total > data.limit ? <div className="flex flex-wrap items-center justify-end gap-2 text-sm"><Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => void load(page - 1)}>Previous</Button><span>Page {page} of {totalPages}</span><Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => void load(page + 1)}>Next</Button></div> : null}

      {actions.dialogs}
    </div>
  );
}
