import { describe, expect, it } from "vitest";
import { AXIS_MAX, AXIS_MID, AXIS_MIN, ITEMS_PER_AXIS, QUESTIONS, SCALE_LABELS, calcSurveyScores } from "./survey";

describe("설문 점수 (4점 척도, 합계)", () => {
  it("문항은 소비 4개 + 저축 4개이고 앞 절반이 소비", () => {
    expect(QUESTIONS).toHaveLength(8);
    expect(ITEMS_PER_AXIS).toBe(4);
    expect(QUESTIONS.slice(0, 4).every((q) => q.axis === "consume")).toBe(true);
    expect(QUESTIONS.slice(4).every((q) => q.axis === "save")).toBe(true);
  });

  it("척도에 가운데(보통)가 없다", () => {
    expect(SCALE_LABELS.map((s) => s.value)).toEqual([1, 2, 3, 4]);
  });

  it("축 점수 범위와 가운데 값", () => {
    expect([AXIS_MIN, AXIS_MAX, AXIS_MID]).toEqual([4, 16, 10]);
  });

  it("축별 합계가 소비(X)·저축(Y) 점수", () => {
    expect(calcSurveyScores([4, 4, 4, 4, 1, 1, 1, 1])).toEqual({ consume: 16, save: 4 });
    expect(calcSurveyScores([1, 2, 3, 4, 4, 4, 3, 3])).toEqual({ consume: 10, save: 14 });
  });

  it("개수가 틀리거나 범위 밖이면 오류", () => {
    expect(() => calcSurveyScores([1, 2, 3])).toThrow();
    expect(() => calcSurveyScores([1, 1, 1, 1, 1, 1, 1, 5])).toThrow();
    expect(() => calcSurveyScores([0, 1, 1, 1, 1, 1, 1, 1])).toThrow();
    expect(() => calcSurveyScores([1, 1, 1, 1, 1, 1, 1, 2.5])).toThrow();
  });
});
