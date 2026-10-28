"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, GraduationCap, Loader2, Phone, TrendingDown, TrendingUp, Minus } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listStudentResults, listStudentAttendanceRecords } from "@/lib/api/students";
import { studentFullName, currentClassLabel } from "@/lib/api/mappers";
import { academicErrorMessage } from "@/components/academics/academic-utils";
import type { ApiStudent, ApiStudentResult, ApiStudentAttendanceRecord } from "@/lib/api/types";
import { getStudent } from "@/lib/api/students";

function toNumber(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

type ScorePoint = {
  label: string;
  subject: string;
  assessment: string;
  percent: number;
  createdOn: string;
};

type Trend = { label: "Improving" | "Stable" | "Going down"; variant: "success" | "warning" | "destructive"; delta: number } | null;

function computeTrend(points: ScorePoint[]): Trend {
  if (points.length < 2) return null;
  const recentCount = Math.min(3, Math.max(1, Math.ceil(points.length / 2)));
  const recent = points.slice(-recentCount);
  const earlier = points.slice(0, -recentCount);
  if (earlier.length === 0) return null;
  const mean = (arr: ScorePoint[]) => arr.reduce((a, p) => a + p.percent, 0) / arr.length;
  const delta = Math.round((mean(recent) - mean(earlier)) * 10) / 10;
  if (delta >= 5) return { label: "Improving", variant: "success", delta };
  if (delta <= -5) return { label: "Going down", variant: "destructive", delta };
  return { label: "Stable", variant: "warning", delta };
}

export function StudentResultsClient({ studentId }: { studentId: string }) {
  const [student, setStudent] = React.useState<ApiStudent | null>(null);
  const [results, setResults] = React.useState<ApiStudentResult[]>([]);
  const [attendance, setAttendance] = React.useState<ApiStudentAttendanceRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.allSettled([getStudent(studentId), listStudentResults(studentId), listStudentAttendanceRecords(studentId)])
      .then(([studentRes, resultsRes, attendanceRes]) => {
        if (cancelled) return;
        if (studentRes.status === "rejected") {
          setError(academicErrorMessage(studentRes.reason, "Student record could not be loaded."));
        } else {
          setStudent(studentRes.value);
        }
        setResults(resultsRes.status === "fulfilled" ? resultsRes.value : []);
        setAttendance(attendanceRes.status === "fulfilled" ? attendanceRes.value : []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  // Chronological score series for trend + line chart.
  const scorePoints = React.useMemo<ScorePoint[]>(() => {
    const points: ScorePoint[] = [];
    for (const result of results) {
      const marks = toNumber(result.marks);
      const max = toNumber(result.examSubject?.maxMarks);
      if (marks == null || max == null || max <= 0) continue;
      points.push({
        label:
          (result.examSubject?.classSubject?.subject?.name ?? "—") +
          (result.examSubject?.exam?.name ? ` · ${result.examSubject.exam.name}` : ""),
        subject: result.examSubject?.classSubject?.subject?.name ?? "—",
        assessment: result.examSubject?.exam?.name ?? "—",
        percent: Math.round((marks / max) * 1000) / 10,
        createdOn: result.createdAt ?? "",
      });
    }
    points.sort((a, b) => new Date(a.createdOn).getTime() - new Date(b.createdOn).getTime());
    return points;
  }, [results]);

  const trend = React.useMemo(() => computeTrend(scorePoints), [scorePoints]);

  const subjectAverages = React.useMemo(() => {
    const groups = new Map<string, number[]>();
    for (const point of scorePoints) {
      const list = groups.get(point.subject) ?? [];
      list.push(point.percent);
      groups.set(point.subject, list);
    }
    return [...groups.entries()]
      .map(([subject, values]) => ({
        subject,
        average: Math.round((values.reduce((a, v) => a + v, 0) / values.length) * 10) / 10,
      }))
      .sort((a, b) => b.average - a.average);
  }, [scorePoints]);

  const metrics = React.useMemo(() => {
    const numbers = scorePoints.map((p) => p.percent);
    const average = numbers.length ? Math.round((numbers.reduce((a, v) => a + v, 0) / numbers.length) * 10) / 10 : null;
    const highest = numbers.length ? Math.max(...numbers) : null;
    const lowest = numbers.length ? Math.min(...numbers) : null;
    const attendanceRate = (() => {
      const total = attendance.length;
      if (total === 0) return null;
      const present = attendance.filter((r) => r.status?.toUpperCase() === "PRESENT").length;
      return Math.round((present / total) * 1000) / 10;
    })();
    return { average, highest, lowest, attendanceRate, entries: numbers.length };
  }, [scorePoints, attendance]);

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        <p className="font-medium">Student not found</p>
        <p className="mt-1 text-destructive/80">{error || "The student record could not be loaded."}</p>
        <Link href="/exams/results" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium hover:underline">
          <ArrowLeft size={14} /> Back to results
        </Link>
      </div>
    );
  }

  const primaryGuardian =
    results.length >= 0
      ? student.guardians && (student.guardians.find((g) => g.isPrimary) ?? student.guardians[0])
      : undefined;

  return (
    <div className="space-y-4">
      <div>
        <Link href="/exams/results" className="-ms-2 mb-1 inline-flex items-center gap-1.5 text-sm font-medium hover:underline">
          <ArrowLeft size={14} /> Back to results
        </Link>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Examination Center · Performance Report</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{studentFullName(student)}</h1>
      </div>

      {/* Summary header card */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <div className="flex items-center gap-2">
            <GraduationCap size={16} className="text-muted-foreground" aria-hidden />
            <span className="font-medium">{currentClassLabel(student)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Roll No: </span>
            <span className="font-medium">{student.roleNumber}</span>
          </div>
          {primaryGuardian ? (
            <div className="flex items-center gap-1.5">
              <Phone size={14} className="text-muted-foreground" aria-hidden />
              <span className="text-muted-foreground">Guardian: </span>
              <span className="font-medium">
                {[primaryGuardian.guardian.firstName, primaryGuardian.guardian.lastName].filter(Boolean).join(" ")}
              </span>
              {primaryGuardian.guardian.phone ? <span className="text-muted-foreground">· {primaryGuardian.guardian.phone}</span> : null}
            </div>
          ) : (
            <div className="text-muted-foreground">No guardian linked</div>
          )}
          {trend ? (
            <div className="ms-auto flex items-center gap-1.5">
              {trend.label === "Improving" ? (
                <TrendingUp size={14} aria-hidden />
              ) : trend.label === "Going down" ? (
                <TrendingDown size={14} aria-hidden />
              ) : (
                <Minus size={14} aria-hidden />
              )}
              <Badge variant={trend.variant}>
                {trend.label} · {trend.delta > 0 ? `+${trend.delta}` : trend.delta} pts
              </Badge>
            </div>
          ) : (
            <div className="ms-auto">
              <Badge variant="outline">Not enough history for a trend</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metric cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Average score</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{metrics.average != null ? `${metrics.average}%` : "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Highest score</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{metrics.highest != null ? `${metrics.highest}%` : "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Lowest score</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{metrics.lowest != null ? `${metrics.lowest}%` : "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Attendance rate</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {metrics.attendanceRate != null ? (
              `${metrics.attendanceRate}%`
            ) : (
              <Loader2 size={20} className="animate-spin text-muted-foreground" aria-label="Loading attendance" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Score progression</CardTitle>
            <CardDescription>Chronological percentage score across assessments.</CardDescription>
          </CardHeader>
          <CardContent>
            {scorePoints.length === 0 ? (
              <p className="text-sm text-muted-foreground">No marked results yet.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scorePoints} margin={{ top: 8, right: 12, bottom: 8, left: -18 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="subject" tick={{ fontSize: 11 }} interval={0} angle={-30} height={48} textAnchor="end" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip
                      formatter={(value) => [`${value}%`, "Score"]}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.assessment ?? ""}
                    />
                    <Line type="monotone" dataKey="percent" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Subject averages</CardTitle>
            <CardDescription>Mean percentage per subject across all assessments.</CardDescription>
          </CardHeader>
          <CardContent>
            {subjectAverages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No marked results yet.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectAverages} margin={{ top: 8, right: 12, bottom: 8, left: -18 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="subject" tick={{ fontSize: 11 }} interval={0} angle={-30} height={48} textAnchor="end" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip formatter={(value) => [`${value}%`, "Average"]} />
                    <Bar dataKey="average" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historical results table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Historical results</CardTitle>
          <CardDescription>Every recorded result, grouped by academic year, newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">No results recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pe-3 text-start font-medium">Academic Year</th>
                    <th className="py-2 pe-3 text-start font-medium">Grade/Level</th>
                    <th className="py-2 pe-3 text-start font-medium">Assessment</th>
                    <th className="py-2 pe-3 text-start font-medium">Subject</th>
                    <th className="py-2 pe-3 text-end font-medium">Score / Max</th>
                    <th className="py-2 pe-3 text-end font-medium">Percentage</th>
                    <th className="py-2 text-end font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => {
                    const exam = result.examSubject?.exam;
                    const marks = toNumber(result.marks);
                    const max = toNumber(result.examSubject?.maxMarks);
                    const pass = toNumber(result.examSubject?.passingMarks);
                    const percent = marks != null && max != null && max > 0 ? Math.round((marks / max) * 1000) / 10 : null;
                    const status =
                      result.grade ??
                      (marks != null && pass != null ? (marks >= pass ? "Passed" : "Failed") : exam?.status ?? "—");
                    return (
                      <tr key={result.id} className="border-b last:border-0">
                        <td className="py-2 pe-3 text-muted-foreground">{exam?.academicYear?.name ?? "—"}</td>
                        <td className="py-2 pe-3">{result.examSubject?.classSubject?.schoolClass?.className ?? "—"}</td>
                        <td className="py-2 pe-3">{exam?.name ?? "—"}</td>
                        <td className="py-2 pe-3">{result.examSubject?.classSubject?.subject?.name ?? "—"}</td>
                        <td className="py-2 pe-3 text-end whitespace-nowrap">
                          {marks != null ? (
                            <>
                              {marks} <span className="text-muted-foreground">/ {max ?? "—"}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2 pe-3 text-end">{percent != null ? `${percent}%` : "—"}</td>
                        <td className="py-2 text-end">
                          <Badge variant={status === "Passed" ? "success" : status === "Failed" ? "destructive" : "outline"}>
                            {status}
                          </Badge>
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
