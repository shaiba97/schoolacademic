// Shared grade definitions. Deliberately NOT a client component: the grades
// table, the grade detail page (a Server Component), and the detail client
// all import from here, and routing data through a "use client" module broke
// Turbopack dev resolution (GRADES.find is not a function at runtime).

export type GradeKey = { level: "SECONDARY" | "INTERMEDIATE"; grade: string; label: string };

export const GRADES: GradeKey[] = [
  { level: "INTERMEDIATE", grade: "SIXTH", label: "6th" },
  { level: "INTERMEDIATE", grade: "SEVENTH", label: "7th" },
  { level: "INTERMEDIATE", grade: "EIGHTH", label: "8th" },
  { level: "INTERMEDIATE", grade: "NINTH", label: "9th" },
  { level: "SECONDARY", grade: "FIRST", label: "1st" },
  { level: "SECONDARY", grade: "SECOND", label: "2nd" },
  { level: "SECONDARY", grade: "THIRD", label: "3rd" },
];

export function gradeDetailHref(level: string, grade: string) {
  return `/academics/grades/${level.toLowerCase()}/${grade.toLowerCase()}`;
}
