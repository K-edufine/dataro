import { describe, expect, it } from "vitest";
import {
  STEP, TOTAL, TYPE_DIRECTION, classifyMovement, clampConsume, describeChange, kindOf, saveAmount, summarizeShifts,
} from "./choices";

describe("용돈 선택", () => {
  it("총액과 단위", () => {
    expect([TOTAL, STEP]).toEqual([10000, 500]);
    expect(saveAmount(3000)).toBe(7000);
  });

  it("금액은 단위에 맞추고 0~총액으로 제한한다", () => {
    expect(clampConsume(3120)).toBe(3000);
    expect(clampConsume(3260)).toBe(3500);
    expect(clampConsume(-500)).toBe(0);
    expect(clampConsume(99999)).toBe(10000);
  });

  it("바꾼 정도를 말로 설명한다", () => {
    expect(describeChange(3000, 5000)).toBe("소비를 2,000원 늘렸어요");
    expect(describeChange(5000, 4500)).toBe("소비를 500원 줄였어요");
    expect(describeChange(5000, 5000)).toBe("소비 금액이 그대로예요");
  });
});

describe("정보 쪽으로 움직였는지", () => {
  it("소비 쪽 정보를 받은 그룹: 소비를 늘리면 정보 쪽, 줄이면 반대", () => {
    expect(classifyMovement("consume", 3000, 5000)).toBe("toward");
    expect(classifyMovement("consume", 5000, 3000)).toBe("against");
  });

  it("저축 쪽 정보를 받은 그룹: 소비를 줄이면 정보 쪽", () => {
    expect(classifyMovement("save", 5000, 3000)).toBe("toward");
    expect(classifyMovement("save", 3000, 5000)).toBe("against");
  });

  it("바뀌지 않으면 방향과 상관없이 그대로", () => {
    expect(classifyMovement("consume", 4000, 4000)).toBe("same");
    expect(classifyMovement("both", 4000, 4000)).toBe("same");
  });

  it("두 가지 정보를 받은 그룹은 움직여도 방향 없음", () => {
    expect(classifyMovement("both", 3000, 5000)).toBe("both");
    expect(classifyMovement("both", 5000, 3000)).toBe("both");
  });

  it("유형별 방향 설정 (고민 중이라 JSON 에서 바꾼다)", () => {
    expect(TYPE_DIRECTION).toEqual({ "high-low": "consume", "low-high": "save", "high-high": "both", "low-low": "both" });
  });
});

describe("학급 요약", () => {
  const rows = [
    { code: "s1", type: "high-low" as const, first: 3000, second: 5000 }, // 정보 쪽
    { code: "s2", type: "high-low" as const, first: 5000, second: 4000 }, // 반대
    { code: "s3", type: "low-high" as const, first: 6000, second: 4000 }, // 정보 쪽
    { code: "s4", type: "high-high" as const, first: 5000, second: 6000 }, // 방향 없음
    { code: "s5", type: "low-high" as const, first: 4000, second: 4000 }, // 그대로
    { code: "s6", type: null, first: 5000, second: 7000 }, // 그룹 없음
  ];

  it("그룹 없는 학생은 따로 센다", () => {
    expect(kindOf(rows[5])).toBeNull();
    expect(kindOf(rows[0])).toBe("toward");
  });

  it("정보 쪽 / 반대 / 그대로 / 방향 없음 / 그룹 없음 집계", () => {
    const s = summarizeShifts(rows);
    expect(s).toMatchObject({ students: 6, moved: 5, toward: 2, against: 1, same: 1, both: 1, noGroup: 1 });
    expect(s.avgFirst).toBeCloseTo(4666.67, 1);
    expect(s.avgSecond).toBeCloseTo(5000, 1);
  });

  it("학생이 없으면 0", () => {
    expect(summarizeShifts([])).toMatchObject({ students: 0, avgFirst: 0, avgSecond: 0 });
  });
});
