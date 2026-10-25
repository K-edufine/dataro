import data from "@/data/schools.json";

export interface Preset {
  grade: number;
  /** null 이면 반 미정 */
  classNo: number | null;
  students: number;
}

export interface School {
  name: string;
  presets: Preset[];
}

export const SCHOOLS: School[] = data.schools;
export const GRADES = [3, 4, 5, 6];
export const CLASS_NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1);
export const DEFAULT_STUDENT_COUNT = 25;

export type GradeBand = "low" | "high";

export const GRADE_BAND_LABEL: Record<GradeBand, string> = { low: "저학년용", high: "고학년용" };

/** 학교·학년·반에 맞는 미리 등록된 학생 수. 반이 정확히 같은 것을 우선하고, 없으면 반 미정 항목을 쓴다. */
export function presetFor(school: string, grade: number, classNo: number): Preset | undefined {
  const presets = SCHOOLS.find((s) => s.name === school)?.presets ?? [];
  return (
    presets.find((p) => p.grade === grade && p.classNo === classNo) ??
    presets.find((p) => p.grade === grade && p.classNo === null)
  );
}

export function classLabel(c: { school: string; grade: number; class_no: number }): string {
  return `${c.school} ${c.grade}학년 ${c.class_no}반`;
}
