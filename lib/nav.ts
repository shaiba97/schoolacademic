import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  FileText,
  TrendingUp,
  Files,
  Contact,
  Building2,
} from "lucide-react";

export type NavChild = {
  label: string;
  href: string;
  description: string;
};

export type NavSection = {
  label: string;
  href: string;
  icon: LucideIcon;
  children: NavChild[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    children: [],
  },
  {
    label: "Students",
    href: "/students",
    icon: Users,
    children: [
      { label: "All Students", href: "/students/all", description: "List + detail tabs" },
      { label: "Admissions", href: "/students/admissions", description: "Wizard intake" },
      { label: "Enrollments", href: "/students/enrollments", description: "Class/section enrollment" },
      { label: "Transfers", href: "/students/transfers", description: "Transfer wizard" },
      { label: "Graduations", href: "/students/graduations", description: "Terminal grade — shared with Promotion" },
      { label: "Guardians", href: "/students/guardians", description: "Guardian linking" },
    ],
  },
  {
    label: "Academics",
    href: "/academics",
    icon: GraduationCap,
    children: [
      { label: "Grades", href: "/academics/grades", description: "Grade overview and class management" },
      { label: "Subjects", href: "/academics/subjects", description: "Catalog + class assignments" },
      { label: "Timetables", href: "/academics/timetable", description: "Class / Teacher / Sport weeks" },
    ],
  },
  {
    label: "Teachers",
    href: "/teachers",
    icon: Contact,
    children: [],
  },
  {
    label: "Departments",
    href: "/departments",
    icon: Building2,
    children: [],
  },
  {
    label: "Examination Center",
    href: "/examinations",
    icon: FileText,
    children: [
      { label: "Exams", href: "/examinations/exam-setup", description: "Types, exams, subjects, grading scales" },
      { label: "Room Tickets", href: "/examinations/hall-tickets", description: "Generate tickets for seated students" },
      { label: "Marks & Results", href: "/examinations/marks-results", description: "Entry, processing, publishing" },
      { label: "Rooms", href: "/examinations/rooms", description: "Hall registry and room assignments" },
      { label: "Analytics", href: "/examinations/analytics", description: "Read-only performance reports" },
    ],
  },
  {
    label: "Promotion",
    href: "/promotion",
    icon: TrendingUp,
    children: [
      { label: "Promote Students", href: "/promotion/promote", description: "From published results" },
      { label: "Repeat", href: "/promotion/repeat", description: "Stay in same class" },
      { label: "Graduation", href: "/promotion/graduation", description: "Terminal — shared service" },
    ],
  },
  {
    label: "Documents",
    href: "/documents",
    icon: Files,
    children: [
      { label: "Certificates", href: "/documents/certificates", description: "Gated graduated" },
      { label: "Academic Documents", href: "/documents/academic", description: "Gated published" },
    ],
  },
];

export function findSectionByHref(pathname: string): NavSection | undefined {
  const sorted = [...NAV_SECTIONS].sort((a, b) => b.href.length - a.href.length);
  return sorted.find((s) => pathname === s.href || pathname.startsWith(s.href + "/"));
}

export function breadcrumbs(pathname: string): { label: string; href?: string }[] {
  const segs = pathname.split("/").filter(Boolean);
  if (segs.length === 0) return [{ label: "Dashboard", href: "/dashboard" }];
  const section = findSectionByHref(pathname);
  if (!section) return [{ label: "Dashboard", href: "/dashboard" }];
  const crumbs: { label: string; href?: string }[] = [{ label: section.label, href: section.href }];
  const remaining = pathname.slice(section.href.length);
  const parts = remaining.split("/").filter(Boolean);
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    // try match child href
    const acc = section.href + "/" + parts.slice(0, i + 1).join("/");
    const child = section.children.find((c) => c.href === acc);
    if (child) crumbs.push({ label: child.label, href: child.href });
    else {
      // dynamic segment like a record ID (UUID) — the page renders its own
      // breadcrumb with the real name; never title-case a raw ID into a crumb,
      // and let the shell render nothing so only the page's breadcrumb shows.
      const isDetailId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p);
      if (isDetailId) return [];
      // dynamic segment like [id] — title-case
      const title = p.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const isLast = i === parts.length - 1;
      crumbs.push({ label: title.length > 20 ? title.slice(0, 20) + "…" : title, href: isLast ? undefined : acc });
    }
  }
  return crumbs;
}
