"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarRange, ClipboardCheck, DoorOpen, Plus, SquareStack } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listExams } from "@/lib/api/exams";
import type { ApiExam } from "@/lib/api/types";
import { academicErrorMessage } from "@/components/academics/academic-utils";

function examDate(e: ApiExam): string {
  if (e.startsOn) {
    const d = new Date(e.startsOn);
    if (!Number.isNaN(d.getTime())) {
      return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    }
  }
  return "—";
}

function examStatus(e: ApiExam): string {
  const s = e.status.toLowerCase();
  return s.replace(/_/g, " ");
}

export function ExamWizardView() {
  const router = useRouter();
  const [exams, setExams] = React.useState<ApiExam[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    listExams({ page: 1, limit: 100 })
      .then((res) => setExams(res.data))
      .catch((cause) => setError(academicErrorMessage(cause, "Unable to load exams")))
      .finally(() => setLoading(false));
  }, []);

  const wizards = [
    {
      href: "/exams/create",
      title: "Exam Wizard",
      description: "Create an exam in one unified form — subjects, marks, and rooms.",
      icon: ClipboardCheck,
    },
    {
      href: "/exams/rooms",
      title: "Room Wizard",
      description: "Register exam rooms with class, auto room number, and seating allocation.",
      icon: DoorOpen,
    },
    {
      href: "/exams/results",
      title: "Results Wizard",
      description: "Master marks matrix — search, filter, edit, and print transcripts.",
      icon: SquareStack,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Examination Center</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">Exams</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Three wizards run the whole exam cycle: rooms, exams, then results.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {wizards.map((w) => {
          const Icon = w.icon;
          return (
            <Link
              key={w.href}
              href={w.href}
              className="group rounded-lg border bg-background p-4 transition-colors hover:bg-muted/50"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon size={16} aria-hidden />
              </span>
              <p className="mt-3 text-sm font-semibold">{w.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{w.description}</p>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm">Exams</CardTitle>
              <CardDescription>Master exam table — open one for full details.</CardDescription>
            </div>
            <Button type="button" size="sm" onClick={() => router.push("/exams/create")}>
              <Plus size={14} /> New exam
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : loading ? (
            <div className="space-y-2" aria-busy="true">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : exams.length === 0 ? (
            <div role="status" className="rounded-xl border border-dashed bg-card px-6 py-12 text-center">
              <h3 className="text-sm font-medium">No exams yet</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Create the first exam with the Exam Wizard.
              </p>
              <Button className="mt-4" size="sm" onClick={() => router.push("/exams/create")}>
                <Plus size={14} /> New exam
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-start text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pe-3 text-start font-medium">Exam name</th>
                    <th className="py-2 pe-3 text-start font-medium">Date (Y/M)</th>
                    <th className="py-2 pe-3 text-start font-medium">Subjects</th>
                    <th className="py-2 pe-3 text-start font-medium">Rooms</th>
                    <th className="py-2 text-start font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((e) => {
                    const subjects = e._count?.examSubjects ?? e.examSubjects?.length ?? 0;
                    const roomsCount = e._count?.examRoomAssignments ?? e.examRoomAssignments?.length ?? 0;
                    return (
                      <tr key={e.id} className="border-b last:border-0">
                        <td className="py-2 pe-3">
                          <Link href={`/exams/${e.id}`} className="font-medium hover:underline">
                            {e.name}
                          </Link>
                        </td>
                        <td className="py-2 pe-3">
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <CalendarRange size={12} aria-hidden /> {examDate(e)}
                          </span>
                        </td>
                        <td className="py-2 pe-3 text-muted-foreground">{subjects}</td>
                        <td className="py-2 pe-3 text-muted-foreground">{roomsCount}</td>
                        <td className="py-2">
                          <Badge variant="outline">{examStatus(e)}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
