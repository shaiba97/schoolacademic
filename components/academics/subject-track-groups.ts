import type { ApiSubject } from "@/lib/api/types";

// Track-grouped subject picker support for SECOND/THIRD Secondary: the five
// common subjects appear for both tracks, plus the track-specific list.
// Matching is case-insensitive `includes` so catalog names like
// "Fundamentals of Engineering Sciences" still match. Anything unmatched
// lands in `other` so no subject ever disappears from a picker.

const COMMON_PATTERNS = ["quran", "islamic", "arabic", "english", "math"];

const SCIENCE_PATTERNS = ["physic", "chemist", "biolog", "computer", "engineer"];

const ART_PATTERNS = ["histor", "geograph", "military"];

export type SubjectGroup = { id: string; label: string; subjects: ApiSubject[] };

function matchesAny(name: string, patterns: string[]): boolean {
  const lowered = name.toLowerCase();
  return patterns.some((pattern) => lowered.includes(pattern));
}

/**
 * Which track a subject belongs to for assignment purposes: SCIENCE-only,
 * ART-only, or null (common subjects go to every class). Common wins ties.
 */
export function trackScopeForSubject(name: string): "SCIENCE" | "ART" | null {
  if (matchesAny(name, COMMON_PATTERNS)) return null;
  if (matchesAny(name, SCIENCE_PATTERNS)) return "SCIENCE";
  if (matchesAny(name, ART_PATTERNS)) return "ART";
  return null;
}

export function groupSubjectsForTrack(subjects: ApiSubject[], track: string | null): SubjectGroup[] {
  if (track !== "SCIENCE" && track !== "ART") return [{ id: "all", label: "Subjects", subjects }];
  const specific = track === "SCIENCE" ? SCIENCE_PATTERNS : ART_PATTERNS;
  const specificLabel = track === "SCIENCE" ? "Science subjects" : "Art subjects";
  const common = subjects.filter((s) => matchesAny(s.name, COMMON_PATTERNS));
  const specificSubjects = subjects.filter(
    (s) => !matchesAny(s.name, COMMON_PATTERNS) && matchesAny(s.name, specific),
  );
  const other = subjects.filter(
    (s) => !matchesAny(s.name, COMMON_PATTERNS) && !matchesAny(s.name, specific),
  );
  const groups: SubjectGroup[] = [
    { id: "common", label: "Common subjects", subjects: common },
    { id: "specific", label: specificLabel, subjects: specificSubjects },
  ];
  if (other.length > 0) groups.push({ id: "other", label: "Other", subjects: other });
  return groups.filter((group) => group.subjects.length > 0);
}

/**
 * Grade-level variant: SECOND/THIRD Secondary without a known track shows
 * all three groups (common + science + art); anything else is flat.
 */
export function groupSubjectsForGrade(
  subjects: ApiSubject[],
  level: string,
  grade: string,
  track: string | null,
): SubjectGroup[] {
  const needsTrack = level === "SECONDARY" && (grade === "SECOND" || grade === "THIRD");
  if (!needsTrack) return [{ id: "all", label: "Subjects", subjects }];
  if (track === "SCIENCE" || track === "ART") return groupSubjectsForTrack(subjects, track);
  const common = subjects.filter((s) => matchesAny(s.name, COMMON_PATTERNS));
  const science = subjects.filter(
    (s) => !matchesAny(s.name, COMMON_PATTERNS) && matchesAny(s.name, SCIENCE_PATTERNS),
  );
  const art = subjects.filter(
    (s) =>
      !matchesAny(s.name, COMMON_PATTERNS) &&
      !matchesAny(s.name, SCIENCE_PATTERNS) &&
      matchesAny(s.name, ART_PATTERNS),
  );
  const other = subjects.filter(
    (s) =>
      !matchesAny(s.name, COMMON_PATTERNS) &&
      !matchesAny(s.name, SCIENCE_PATTERNS) &&
      !matchesAny(s.name, ART_PATTERNS),
  );
  const groups: SubjectGroup[] = [
    { id: "common", label: "Common subjects", subjects: common },
    { id: "science", label: "Science subjects", subjects: science },
    { id: "art", label: "Art subjects", subjects: art },
  ];
  if (other.length > 0) groups.push({ id: "other", label: "Other", subjects: other });
  return groups.filter((group) => group.subjects.length > 0);
}
