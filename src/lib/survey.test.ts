import { describe, expect, it } from "vitest";
import { QUESTIONS, calcSurveyScores } from "./survey";

describe("설문 점수", () => {
  it("문항은 소비 4개 + 저축 4개", () => {
    expect(QUESTIONS).toHaveLength(8);
    expect(QUESTIONS.filter((q) => q.axis === "consume")).toHaveLength(4);
    expect(QUESTIONS.slice(0, 4).every((q) => q.axis === "consume")).toBe(true);
  });

  it("축별 평균이 소비(X)·저축(Y) 점수", () => {
    expect(calcSurveyScores([5, 5, 5, 5, 1, 1, 1, 1])).toEqual({ consume: 5, save: 1 });
    expect(calcSurveyScores([1, 2, 3, 4, 5, 5, 4, 4])).toEqual({ consume: 2.5, save: 4.5 });
  });

  it("소수 둘째 자리까지 반올림", () => {
    expect(calcSurveyScores([1, 1, 1, 2, 3, 3, 3, 3]).consume).toBe(1.25);
  });

  it("개수가 틀리거나 범위 밖이면 오류", () => {
    expect(() => calcSurveyScores([1, 2, 3])).toThrow();
    expect(() => calcSurveyScores([1, 1, 1, 1, 1, 1, 1, 6])).toThrow();
    expect(() => calcSurveyScores([1, 1, 1, 1, 1, 1, 1, 2.5])).toThrow();
  });
});
