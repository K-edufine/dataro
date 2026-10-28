import { describe, expect, it } from "vitest";
import {
  AXIS_MAX, AXIS_MID, AXIS_MIN, ITEMS_PER_AXIS, QUESTIONS, SCALE_LABELS, SCALE_MAX, calcSurveyScores,
} from "./survey";

describe("설문 점수 (5점 척도, 합계)", () => {
  it("문항은 소비 6개 + 저축 6개이고 앞 절반이 소비", () => {
    expect(QUESTIONS).toHaveLength(12);
    expect(ITEMS_PER_AXIS).toBe(6);
    expect(QUESTIONS.slice(0, 6).every((q) => q.axis === "consume")).toBe(true);
    expect(QUESTIONS.slice(6).every((q) => q.axis === "save")).toBe(true);
    expect(QUESTIONS.map((q) => q.code)).toEqual([
      "CS1", "CS2", "CS3", "CS4", "CS5", "CS6", "SV1", "SV2", "SV3", "SV4", "SV5", "SV6",
    ]);
    expect(QUESTIONS.every((q) => q.text.startsWith("나는 "))).toBe(true);
  });

  it("5점 척도: 가운데에 '보통이야'가 있다", () => {
    expect(SCALE_MAX).toBe(5);
    expect(SCALE_LABELS.map((s) => s.value)).toEqual([1, 2, 3, 4, 5]);
    expect(SCALE_LABELS[2].label).toBe("보통이야");
    expect(SCALE_LABELS[4].label).toBe("매우 그래");
  });

  it("축 점수 범위와 가운데 값", () => {
    expect([AXIS_MIN, AXIS_MAX, AXIS_MID]).toEqual([6, 30, 18]);
  });

  it("축별 합계가 소비(X)·저축(Y) 점수", () => {
    expect(calcSurveyScores([5, 5, 5, 5, 5, 5, 1, 1, 1, 1, 1, 1])).toEqual({ consume: 30, save: 6 });
    expect(calcSurveyScores([1, 2, 3, 4, 5, 3, 5, 5, 4, 4, 3, 3])).toEqual({ consume: 18, save: 24 });
  });

  it("개수가 틀리거나 범위 밖이면 오류", () => {
    expect(() => calcSurveyScores([1, 2, 3])).toThrow();
    expect(() => calcSurveyScores([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 6])).toThrow();
    expect(() => calcSurveyScores([0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])).toThrow();
    expect(() => calcSurveyScores([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.5])).toThrow();
  });
});
