import survey from "@/data/survey.json";

export type Axis = "consume" | "save";

export interface Question {
  /** 문항 번호 (CS1~, SV1~) */
  code: string;
  text: string;
  axis: Axis;
}

if (survey.consume.length !== survey.save.length) {
  throw new Error("소비 문항과 저축 문항의 개수가 같아야 해요.");
}

/** 앞 절반이 소비, 뒤 절반이 저축 (DB 함수 submit_survey 와 같은 규칙) */
export const QUESTIONS: Question[] = [
  ...survey.consume.map((q): Question => ({ code: q.code, text: q.text, axis: "consume" })),
  ...survey.save.map((q): Question => ({ code: q.code, text: q.text, axis: "save" })),
];

export const SCALE_MIN = survey.scale.min;
export const SCALE_MAX = survey.scale.max;
export const ITEMS_PER_AXIS = survey.consume.length;

/** 한 축 점수(문항 합계)의 범위. 예: 4문항 x 4점 척도 = 4~16 */
export const AXIS_MIN = ITEMS_PER_AXIS * SCALE_MIN;
export const AXIS_MAX = ITEMS_PER_AXIS * SCALE_MAX;
/** 높음/낮음을 가르는 척도의 한가운데 (예: 10) */
export const AXIS_MID = (AXIS_MIN + AXIS_MAX) / 2;

/** 척도 보기. 5점은 가운데에 "보통이야"가 있고, 4점은 없다. */
const LABELS: Record<number, { emoji: string; label: string }[]> = {
  5: [
    { emoji: "😟", label: "전혀 아니야" },
    { emoji: "🙁", label: "아니야" },
    { emoji: "😐", label: "보통이야" },
    { emoji: "🙂", label: "그래" },
    { emoji: "😄", label: "매우 그래" },
  ],
  4: [
    { emoji: "😟", label: "전혀 아니야" },
    { emoji: "🙁", label: "아니야" },
    { emoji: "🙂", label: "그래" },
    { emoji: "😄", label: "매우 그래" },
  ],
};

export const SCALE_LABELS = (LABELS[SCALE_MAX - SCALE_MIN + 1] ?? LABELS[5]).map((l, i) => ({ value: SCALE_MIN + i, ...l }));

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
