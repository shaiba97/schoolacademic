"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  Building2,
  CalendarClock,
  Contact,
  FileText,
  GraduationCap,
  Layers,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listClasses } from "@/lib/api/classes";
import { listSubjects } from "@/lib/api/subjects";
import { listStudents } from "@/lib/api/students";
import { getCurrentAcademicYear } from "@/lib/api/profile";
import { useI18n, type MessageKey } from "@/lib/i18n/locale-provider";

type Counts = {
  year: string | null;
  classes: number | null;
  subjects: number | null;
  students: number | null;
};

type QuickLink = {
  href: string;
  labelKey: MessageKey;
  descriptionKey: MessageKey;
  icon: typeof Users;
};

export default function DashboardPage() {
  const { t } = useI18n();
  const [counts, setCounts] = React.useState<Counts | null>(null);

  React.useEffect(() => {
    let alive = true;
    async function load() {
      const [year, classes, subjects, students] = await Promise.all([
        getCurrentAcademicYear().catch(() => null),
        listClasses({ limit: 1 }).then((page) => page.total ?? null).catch(() => null),
        listSubjects({ limit: 1 }).then((page) => page.total ?? null).catch(() => null),
        listStudents({ limit: 1 }).then((page) => page.total ?? null).catch(() => null),
      ]);
      if (!alive) return;
      setCounts({
        year: year?.name ?? null,
        classes,
        subjects,
        students,
      });
    }
    void load();
    return () => {
      alive = false;
    };
  }, []);

  const links: QuickLink[] = [
    { href: "/academics/grades", labelKey: "dashboard.href.grades", descriptionKey: "dashboard.href.gradesDesc", icon: Layers },
    { href: "/academics/subjects", labelKey: "dashboard.href.subjects", descriptionKey: "dashboard.href.subjectsDesc", icon: BookOpen },
    { href: "/academics/timetable", labelKey: "dashboard.href.timetable", descriptionKey: "dashboard.href.timetableDesc", icon: CalendarClock },
  ];

  const tile = (label: string, value: React.ReactNode, hint?: string) => (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-2 font-mono text-2xl font-semibold tracking-tight">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("dashboard.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
      </div>

      {!counts ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tile(t("dashboard.currentYear"), counts.year ?? t("dashboard.noYear"))}
          {tile(t("dashboard.students"), counts.students ?? "—", t("dashboard.studentsHint"))}
          {tile(t("dashboard.classes"), counts.classes ?? "—", t("dashboard.classesHint"))}
          {tile(t("dashboard.subjects"), counts.subjects ?? "—", t("dashboard.subjectsHint"))}
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{t("dashboard.quickLinks")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href} className="group">
                <Card className="h-full transition-colors group-hover:border-primary/40">
                  <CardHeader>
                    <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon size={18} aria-hidden />
                    </span>
                    <CardTitle className="mt-2 text-sm">{t(link.labelKey)}</CardTitle>
                    <CardDescription>{t(link.descriptionKey)}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <GraduationCap size={14} aria-hidden />
        {t("dashboard.subtitle")}
      </p>
    </div>
  );
}
