export enum EducationLevel {
  SECONDARY = "SECONDARY",
  INTERMEDIATE = "INTERMEDIATE",
}

export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
}

export type Grade = 1 | 2 | 3 | 6 | 7 | 8 | 9;

export const GRADE_BY_LEVEL: Record<EducationLevel, Grade[]> = {
  [EducationLevel.SECONDARY]: [1, 2, 3],
  [EducationLevel.INTERMEDIATE]: [6, 7, 8, 9],
};

export function isValidGradeForLevel(level: EducationLevel, grade: number): boolean {
  return (GRADE_BY_LEVEL[level] as number[]).includes(grade);
}

function educationLetter(level: EducationLevel): string {
  return level === EducationLevel.INTERMEDIATE ? "I" : "S";
}

function twoDigitYear(date = new Date()): string {
  return String(date.getFullYear()).slice(-2).padStart(2, "0");
}

function rolePrefix(level: EducationLevel, grade: Grade, isTransferred: boolean, year: string): string {
  return `${year}C${educationLetter(level)}${grade}${isTransferred ? "T" : "R"}`;
}

function nextSequence(existing: string[], prefix: string): number {
  let maximum = 0;
  for (const roleNumber of existing) {
    if (!roleNumber.startsWith(prefix)) continue;
    const sequence = Number.parseInt(roleNumber.slice(prefix.length), 10);
    if (Number.isFinite(sequence) && sequence > maximum) maximum = sequence;
  }
  return maximum + 1;
}

export function previewRoleNumber(
  existing: string[],
  educationLevel: EducationLevel,
  grade: Grade,
  isTransferred: boolean,
  year = twoDigitYear(),
): string {
  const prefix = rolePrefix(educationLevel, grade, isTransferred, year);
  return `${prefix}${String(nextSequence(existing, prefix)).padStart(2, "0")}`;
}
