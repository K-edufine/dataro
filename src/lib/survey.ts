import survey from "@/data/survey.json";

export type Axis = "consume" | "save";

export interface Question {
  text: string;
  axis: Axis;
}

export const QUESTIONS: Question[] = [
  ...survey.consume.map((text): Question => ({ text, axis: "consume" })),
  ...survey.save.map((text): Question => ({ text, axis: "save" })),
];

export const SCALE_LABELS = [
  { value: 1, emoji: "😟", label: "전혀 아니야" },
  { value: 2, emoji: "🙁", label: "아니야" },
  { value: 3, emoji: "😐", label: "보통이야" },
  { value: 4, emoji: "🙂", label: "그래" },
  { value: 5, emoji: "😄", label: "매우 그래" },
];

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * 축별 평균 = 소비 점수(X), 저축 점수(Y).
 * DB 함수 submit_survey 와 같은 규칙이다. (화면 미리보기·테스트용)
 */
export function calcSurveyScores(answers: readonly number[]): { consume: number; save: number } {
  if (answers.length !== QUESTIONS.length) throw new Error("모든 문항에 답해야 해요.");
  if (answers.some((a) => !Number.isInteger(a) || a < 1 || a > 5)) throw new Error("답은 1~5점이어야 해요.");
  const avg = (axis: Axis) => {
    const vals = answers.filter((_, i) => QUESTIONS[i].axis === axis);
    return round2(vals.reduce((s, v) => s + v, 0) / vals.length);
  };
  return { consume: avg("consume"), save: avg("save") };
}
