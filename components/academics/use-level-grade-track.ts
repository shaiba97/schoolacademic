"use client";

import * as React from "react";

// Shared Education Level → Grade → Track cascade logic, extracted from the
// rules first established in `class-form.tsx`. New forms (exam creation and
// beyond) must use this hook instead of re-implementing the cascade.
// `class-form.tsx` keeps its inline copy untouched to avoid regressing a
// working form; if it is ever refactored, it should adopt this hook.

export const EDUCATION_LEVELS = ["SECONDARY", "INTERMEDIATE"] as const;
export const SECONDARY_GRADES = ["FIRST", "SECOND", "THIRD"] as const;
export const INTERMEDIATE_GRADES = ["SIXTH", "SEVENTH", "EIGHTH", "NINTH"] as const;
export const TRACKS = ["ART", "SCIENCE"] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number];
export type Track = (typeof TRACKS)[number];
export type Grade = (typeof SECONDARY_GRADES)[number] | (typeof INTERMEDIATE_GRADES)[number];

export const GRADE_LABELS: Record<Grade, string> = {
  FIRST: "1st Secondary",
  SECOND: "2nd Secondary",
  THIRD: "3rd Secondary",
  SIXTH: "6th",
  SEVENTH: "7th",
  EIGHTH: "8th",
  NINTH: "9th",
};

export function gradesForLevel(level: EducationLevel): readonly string[] {
  return level === "SECONDARY" ? SECONDARY_GRADES : INTERMEDIATE_GRADES;
}

export function needsTrackFor(level: EducationLevel, grade: string): boolean {
  return level === "SECONDARY" && (grade === "SECOND" || grade === "THIRD");
}

/**
 * Pure validation mirroring the class-form superRefine rules.
 * Returns an error message for the first violation, or null when valid.
 * Usable directly as a Stepper `validate` step or inside a zod superRefine.
 */
export function validateLevelGradeTrack(
  level: EducationLevel,
  grade: string,
  track: string | null,
): string | null {
  if (level === "SECONDARY") {
    if (!(SECONDARY_GRADES as readonly string[]).includes(grade)) {
      return "Grade must be FIRST, SECOND, or THIRD for SECONDARY.";
    }
    if (needsTrackFor(level, grade) && !track) {
      return "Track is required for Second/Third Secondary.";
    }
    if (!needsTrackFor(level, grade) && track) {
      return "Track must be absent unless grade is Second or Third Secondary.";
    }
  } else {
    if (!(INTERMEDIATE_GRADES as readonly string[]).includes(grade)) {
      return "Grade must be SIXTH, SEVENTH, EIGHTH, or NINTH for INTERMEDIATE.";
    }
    if (track) {
      return "Track must be absent for INTERMEDIATE.";
    }
  }
  return null;
}

export function useLevelGradeTrack(initial?: {
  educationLevel?: EducationLevel;
  grade?: string;
  track?: string | null;
}) {
  const [educationLevel, setEducationLevelState] = React.useState<EducationLevel>(
    initial?.educationLevel ?? "SECONDARY",
  );
  const [grade, setGradeState] = React.useState<string>(initial?.grade ?? "FIRST");
  const [track, setTrackState] = React.useState<string | null>(initial?.track ?? null);

  const grades = gradesForLevel(educationLevel);
  const needsTrack = needsTrackFor(educationLevel, grade);

  // Reset grade when it falls outside the new level; clear a hidden track —
  // same behavior as the class form.
  React.useEffect(() => {
    if (!grades.includes(grade)) {
      setGradeState(grades[0]);
    }
    if (!needsTrackFor(educationLevel, grade) && track) {
      setTrackState(null);
    }
  }, [educationLevel, grade, grades, track]);

  function setEducationLevel(level: EducationLevel) {
    setEducationLevelState(level);
  }

  function setGrade(next: string) {
    setGradeState(next);
  }

  function setTrack(next: string | null) {
    setTrackState(next);
  }

  return {
    educationLevel,
    grade,
    track,
    grades,
    needsTrack,
    setEducationLevel,
    setGrade,
    setTrack,
    validate: () => validateLevelGradeTrack(educationLevel, grade, track),
  };
}
