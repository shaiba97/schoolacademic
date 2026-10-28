import type { LucideIcon } from "lucide-react";
import type { MessageKey } from "@/lib/i18n/locale-provider";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  ClipboardCheck,
  FileText,
  TrendingUp,
  Files,
  Contact,
  Building2,
  UserRound,
} from "lucide-react";

export type NavChild = {
  labelKey: MessageKey;
  href: string;
  descriptionKey?: MessageKey;
};

export type NavSection = {
  labelKey: MessageKey;
  href: string;
  icon: LucideIcon;
  children: NavChild[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    labelKey: "nav.dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    children: [],
  },
  {
    labelKey: "nav.students",
    href: "/students",
    icon: Users,
    children: [
      { labelKey: "nav.studentsAll", href: "/students/all" },
      { labelKey: "nav.studentsAdmissions", href: "/students/admissions" },
      { labelKey: "nav.studentsEnrollments", href: "/students/enrollments" },
      { labelKey: "nav.studentsGraduations", href: "/students/graduations" },
      { labelKey: "nav.studentsGuardians", href: "/students/guardians" },
    ],
  },
  {
    labelKey: "nav.academics",
    href: "/academics",
    icon: GraduationCap,
    children: [
      { labelKey: "nav.academicsGrades", href: "/academics/grades" },
      { labelKey: "nav.academicsSubjects", href: "/academics/subjects" },
      { labelKey: "nav.academicsTimetable", href: "/academics/timetable" },
    ],
  },
  {
    labelKey: "nav.exams",
    href: "/exams",
    icon: ClipboardCheck,
    children: [
      { labelKey: "nav.examsList", href: "/exams" },
      { labelKey: "nav.examsRooms", href: "/exams/rooms" },
      { labelKey: "nav.examsResults", href: "/exams/results" },
    ],
  },
  {
    labelKey: "nav.teachers",
    href: "/teachers",
    icon: Contact,
    children: [],
  },
  {
    labelKey: "nav.departments",
    href: "/departments",
    icon: Building2,
    children: [],
  },
{
    labelKey: "nav.documents",
    href: "/documents",
    icon: Files,
    children: [
      { labelKey: "nav.documentsCertificates", href: "/documents/certificates" },
      { labelKey: "nav.documentsAcademic", href: "/documents/academic" },
    ],
  },
  {
    labelKey: "nav.profile",
    href: "/profile",
    icon: UserRound,
    children: [],
  },
];

export function findSectionByHref(pathname: string): NavSection | undefined {
  const sorted = [...NAV_SECTIONS].sort((a, b) => b.href.length - a.href.length);
  return sorted.find((s) => pathname === s.href || pathname.startsWith(s.href + "/"));
}

export function breadcrumbs(pathname: string): { labelKey?: MessageKey; fallbackLabel?: string; href?: string }[] {
  const segs = pathname.split("/").filter(Boolean);
  if (segs.length === 0) return [{ labelKey: "nav.dashboard", href: "/dashboard" }];
  const section = findSectionByHref(pathname);
  if (!section) return [{ labelKey: "nav.dashboard", href: "/dashboard" }];
  const crumbs: { labelKey?: MessageKey; fallbackLabel?: string; href?: string }[] = [
    { labelKey: section.labelKey, href: section.href },
  ];
  const remaining = pathname.slice(section.href.length);
  const parts = remaining.split("/").filter(Boolean);
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    // try match child href
    const acc = section.href + "/" + parts.slice(0, i + 1).join("/");
    const child = section.children.find((c) => c.href === acc);
    if (child) crumbs.push({ labelKey: child.labelKey, href: child.href });
    else {
      // dynamic segment like a record ID (UUID) — the page renders its own
      // breadcrumb with the real name; never title-case a raw ID into a crumb,
      // and let the shell render nothing so only the page's breadcrumb shows.
      const isDetailId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p);
      if (isDetailId) return [];
      // dynamic segment like [id] — title-case
      const title = p.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const isLast = i === parts.length - 1;
      crumbs.push({
        fallbackLabel: title.length > 20 ? title.slice(0, 20) + "…" : title,
        href: isLast ? undefined : acc,
      });
    }
  }
  return crumbs;
}
