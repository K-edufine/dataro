import { describe, expect, it } from "vitest";
import { SCHOOLS, classLabel, presetFor } from "./schools";

describe("학교 목록", () => {
  it("연구회 학교 5곳이 등록되어 있다", () => {
    expect(SCHOOLS.map((s) => s.name)).toEqual(["삼상초", "이담초", "옥정초", "신천초", "덕정초"]);
  });

  it("학교·학년·반이 정확히 맞는 학생 수를 찾는다", () => {
    expect(presetFor("삼상초", 3, 1)?.students).toBe(17);
    expect(presetFor("옥정초", 4, 3)?.students).toBe(24);
    expect(presetFor("옥정초", 6, 5)?.students).toBe(25);
    expect(presetFor("덕정초", 6, 3)?.students).toBe(22);
  });

  it("반이 미정인 학교는 학년만 맞으면 인원을 알려 준다", () => {
    expect(presetFor("신천초", 4, 2)?.students).toBe(25);
    expect(presetFor("신천초", 5, 2)).toBeUndefined();
  });

  it("등록되지 않은 조합은 없음", () => {
    expect(presetFor("삼상초", 6, 1)).toBeUndefined();
    expect(presetFor("없는초", 3, 1)).toBeUndefined();
  });

  it("학급 이름을 만든다", () => {
    expect(classLabel({ school: "삼상초", grade: 3, class_no: 1 })).toBe("삼상초 3학년 1반");
  });
});
