// Role number spec: [$Year School name(Comboni)=C + EducationLevel first letter (SECONDARY→S→CS1/CS2/CS3, INTERMEDIATE→I→CI6/CI7/CI8/CI9) + R|T + NN]
// e.g., 26CS1R09 regular, 26CI6R01 intermediate
import { EducationLevel, type Grade } from "./types";

const SCHOOL_CODE = "C"; // Comboni

function eduLetter(level: EducationLevel): string {
  if (level === EducationLevel.SECONDARY) return "S";
  if (level === EducationLevel.INTERMEDIATE) return "I";
  return "S";
}

function twoDigitYear(date: Date = new Date()): string {
  return String(date.getFullYear()).slice(-2).padStart(2, "0");
}

export function rolePrefix(params: { educationLevel: EducationLevel; grade: Grade; isTransferred: boolean; year?: string }): string {
  const yy = params.year ?? twoDigitYear();
  const e = eduLetter(params.educationLevel);
  return `${yy}${SCHOOL_CODE}${e}${params.grade}${params.isTransferred ? "T" : "R"}`;
}

export function generateRoleNumber(params: { educationLevel: EducationLevel; grade: Grade; isTransferred: boolean; seq: number; year?: string }): string {
  const prefix = rolePrefix(params);
  const nn = String(params.seq).padStart(2, "0");
  return `${prefix}${nn}`;
}

export function nextSequence(existing: string[], prefix: string): number {
  let max = 0;
  for (const rn of existing) {
    if (typeof rn !== "string" || !rn.startsWith(prefix)) continue;
    const suffix = rn.slice(prefix.length);
    const n = parseInt(suffix, 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return max + 1;
}

export function previewRoleNumber(
  existing: string[],
  educationLevel: EducationLevel,
  grade: Grade,
  isTransferred: boolean,
  year?: string,
): string {
  const prefix = rolePrefix({ educationLevel, grade, isTransferred, year });
  const seq = nextSequence(existing, prefix);
  return generateRoleNumber({ educationLevel, grade, isTransferred, seq, year });
}
