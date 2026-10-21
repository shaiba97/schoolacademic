"use client";

import * as React from "react";
import { BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { getExamAnalytics, listExams } from "@/lib/api/exams";
import type { ApiExam, ApiExamAnalytics } from "@/lib/api/types";
import { academicErrorMessage } from "@/components/academics/academic-utils";

function formatNumber(value: number | null, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

function formatPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(0)}%`;
}

export function AnalyticsClient() {
  const [exams, setExams] = React.useState<ApiExam[]>([]);
  const [examId, setExamId] = React.useState("");
  const [report, setReport] = React.useState<ApiExamAnalytics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [reportLoading, setReportLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    listExams({ page: 1, limit: 100 })
      .then((res) => setExams(res.data))
      .catch((cause) => setError(academicErrorMessage(cause, "Unable to load exams")))
      .finally(() => setLoading(false));
  }, []);

  async function handleExamChange(id: string) {
    setExamId(id);
    setReport(null);
    if (!id) return;
    setReportLoading(true);
    try {
      setReport(await getExamAnalytics(id));
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to load analytics"));
    } finally {
      setReportLoading(false);
    }
  }

  const examName = exams.find((e) => e.id === examId)?.name ?? "";

  const chartData = React.useMemo(
    () =>
      (report?.subjects ?? []).map((s) => ({
        name: s.className ? `${s.subjectName} (${s.className})` : s.subjectName,
        average: s.average != null ? Math.round(s.average * 10) / 10 : 0,
        passRate: s.passRate != null ? Math.round(s.passRate * 100) : 0,
      })),
    [report],
  );
  const maxAverage = Math.max(0, ...chartData.map((d) => d.average));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Examination Center · Analytics
        </p>
        <h1 className="text-xl font-semibold tracking-tight mt-1">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Read-only performance reports from entered results.
        </p>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-12 w-full" />
        </div>
      ) : exams.length === 0 ? (
        <EmptyState
          title="No exams yet"
          description="Analytics appear once exams with entered marks exist."
        />
      ) : (
        <div className="max-w-sm space-y-2">
          <span className="text-sm font-medium">Exam</span>
          <Select value={examId} onValueChange={(v) => void handleExamChange(v)}>
            <SelectTrigger><SelectValue placeholder="Select an exam…" /></SelectTrigger>
            <SelectContent>
              {exams.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {reportLoading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}

      {report ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 size={14} className="text-muted-foreground" aria-hidden />
                  Results entered
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{report.overall.entered}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Overall average</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{formatNumber(report.overall.average)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Overall pass rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{formatPercent(report.overall.passRate)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Subject breakdown · {examName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {chartData.length > 0 ? (
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Average marks</p>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-20} dy={8} height={56} />
                          <YAxis domain={[0, Math.ceil(maxAverage) || 10]} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="average" name="Average" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Pass rate (%)</p>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-20} dy={8} height={56} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(value) => [`${value}%`, "Pass rate"]} />
                          <Bar dataKey="passRate" name="Pass rate" fill="var(--chart-2, #16a34a)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              ) : null}
              {report.subjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">This exam has no subjects yet.</p>
              ) : (
                <div className="rounded-lg border divide-y">
                  <div className="grid grid-cols-[1fr_repeat(5,64px)] gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    <span>Subject</span>
                    <span className="text-right">Avg</span>
                    <span className="text-right">High</span>
                    <span className="text-right">Low</span>
                    <span className="text-right">Pass</span>
                    <span className="text-right">Count</span>
                  </div>
                  {report.subjects.map((s) => (
                    <div key={s.examSubjectId} className="grid grid-cols-[1fr_repeat(5,64px)] gap-2 px-3 py-1.5 items-center text-sm">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{s.subjectName}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.className}</p>
                      </div>
                      <span className="text-right">{formatNumber(s.average)}</span>
                      <span className="text-right">{formatNumber(s.highest, 0)}</span>
                      <span className="text-right">{formatNumber(s.lowest, 0)}</span>
                      <span className="text-right">
                        {s.passRate != null ? (
                          <Badge variant="outline">{formatPercent(s.passRate)}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </span>
                      <span className="text-right text-muted-foreground">{s.entered}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
