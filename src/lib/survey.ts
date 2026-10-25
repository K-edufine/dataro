import survey from "@/data/survey.json";

export type Axis = "consume" | "save";

export interface Question {
  text: string;
  axis: Axis;
}

if (survey.consume.length !== survey.save.length) {
  throw new Error("소비 문항과 저축 문항의 개수가 같아야 해요.");
}

/** 앞 절반이 소비, 뒤 절반이 저축 (DB 함수 submit_survey 와 같은 규칙) */
export const QUESTIONS: Question[] = [
  ...survey.consume.map((text): Question => ({ text, axis: "consume" })),
  ...survey.save.map((text): Question => ({ text, axis: "save" })),
];

export const SCALE_MIN = survey.scale.min;
export const SCALE_MAX = survey.scale.max;
export const ITEMS_PER_AXIS = survey.consume.length;

/** 한 축 점수(문항 합계)의 범위. 예: 4문항 x 4점 척도 = 4~16 */
export const AXIS_MIN = ITEMS_PER_AXIS * SCALE_MIN;
export const AXIS_MAX = ITEMS_PER_AXIS * SCALE_MAX;
/** 높음/낮음을 가르는 척도의 한가운데 (예: 10) */
export const AXIS_MID = (AXIS_MIN + AXIS_MAX) / 2;

/** 4점 척도: 가운데(보통)가 없다 */
export const SCALE_LABELS = [
  { value: 1, emoji: "😟", label: "전혀 아니야" },
  { value: 2, emoji: "🙁", label: "아니야" },
  { value: 3, emoji: "🙂", label: "그래" },
  { value: 4, emoji: "😄", label: "매우 그래" },
].filter((s) => s.value >= SCALE_MIN && s.value <= SCALE_MAX);

/**
 * 축별 합계 = 소비 점수(X), 저축 점수(Y).
 * 평균이 아니라 합계를 쓰는 이유: 같은 군집이 나오지만 (30, 6) 처럼 읽기 쉽다.
 * DB 함수 submit_survey 와 같은 규칙이다. (화면 표시·테스트용)
 */
export function calcSurveyScores(answers: readonly number[]): { consume: number; save: number } {
  if (answers.length !== QUESTIONS.length) throw new Error("모든 문항에 답해야 해요.");
  if (answers.some((a) => !Number.isInteger(a) || a < SCALE_MIN || a > SCALE_MAX)) {
    throw new Error(`답은 ${SCALE_MIN}~${SCALE_MAX}점이어야 해요.`);
  }
  const sum = (axis: Axis) => answers.filter((_, i) => QUESTIONS[i].axis === axis).reduce((s, v) => s + v, 0);
  return { consume: sum("consume"), save: sum("save") };
}
