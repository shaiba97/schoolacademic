"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { ApiAcademicYear, ApiExam, ApiExamType, ApiGradingScale, ApiPaginated } from "@/lib/api/types";
import { ExamTypesTab } from "@/components/examinations/exam-types-tab";
import { GradingScalesTab } from "@/components/examinations/grading-scales-tab";
import { ExamsTab } from "@/components/examinations/exams-tab";

export function ExamSetupClient({
  initialTypes,
  initialExams,
  initialScales,
  years,
  initialError = "",
}: {
  initialTypes: ApiExamType[];
  initialExams: ApiPaginated<ApiExam>;
  initialScales: ApiGradingScale[];
  years: ApiAcademicYear[];
  initialError?: string;
}) {
  const [tab, setTab] = React.useState("types");

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Examination Center · Exams
        </p>
        <h1 className="text-xl font-semibold tracking-tight mt-1">Exams</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Types, exams, subjects, and grading scales. Everything downstream gates on this stage.
        </p>
      </div>

      {initialError ? (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {initialError}
        </p>
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="types">Exam Types</TabsTrigger>
          <TabsTrigger value="exams">Exams</TabsTrigger>
          <TabsTrigger value="scales">Grading Scales</TabsTrigger>
        </TabsList>
        <TabsContent value="types">
          <ExamTypesTab initialData={initialTypes} />
        </TabsContent>
        <TabsContent value="exams">
          <ExamsTab initialData={initialExams} types={initialTypes} scales={initialScales} years={years} />
        </TabsContent>
        <TabsContent value="scales">
          <GradingScalesTab initialData={initialScales} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
