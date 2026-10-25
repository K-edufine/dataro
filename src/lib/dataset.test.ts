import { describe, expect, it } from "vitest";
import { climateSpec, snackSpec, type Item } from "./dataset";

const snacks: Item[] = [
  { id: "a", name: "츄팝춥스", x: 300, y: 2 },
  { id: "b", name: "프링글스", x: 4200, y: 5 },
];
const cities: Item[] = [
  { id: "1", name: "서울", sub: "대한민국", x: 12.5, y: 1450 },
  { id: "2", name: "야쿠츠크", sub: "러시아", x: -9, y: 240 },
  { id: "3", name: "마나우스", sub: "브라질", x: 27, y: 2300 },
];

describe("데이터셋 설정", () => {
  it("간식: 가격은 0부터, 선호도는 1~5 눈금", () => {
    const s = snackSpec(snacks);
    expect(s.xDomain[0]).toBe(0);
    expect(s.xDomain[1]).toBeGreaterThanOrEqual(4200);
    expect(s.yTicks).toEqual([1, 2, 3, 4, 5]);
    expect(s.describe(snacks[0])).toBe("츄팝춥스 (300원, 2.0점)");
  });

  it("기후: 영하 기온과 큰 강수량이 축 범위 안에 들어간다", () => {
    const s = climateSpec(cities);
    expect(s.xDomain[0]).toBeLessThanOrEqual(-9);
    expect(s.xDomain[1]).toBeGreaterThanOrEqual(27);
    expect(s.yDomain[0]).toBe(0);
    expect(s.yDomain[1]).toBeGreaterThanOrEqual(2300);
    expect(s.xTicks.every((t) => t >= s.xDomain[0] && t <= s.xDomain[1])).toBe(true);
    expect(s.yTicks.every((t) => t >= 0 && t <= s.yDomain[1])).toBe(true);
    expect(s.xLabel).toBe("연평균 기온(℃)");
    expect(s.yLabel).toBe("연강수량(mm)");
  });

  it("기후: 도시 설명에 국가·기온·강수량이 들어간다", () => {
    expect(climateSpec(cities).describe(cities[0])).toBe("서울 (대한민국) · 12.5℃ · 1,450mm");
  });

  it("점이 많으면 이름표를 처음부터 켜지 않는다", () => {
    expect(climateSpec(cities).labelsByDefault).toBe(true);
    const many = Array.from({ length: 25 }, (_, i) => ({ id: String(i), name: `c${i}`, x: i, y: i * 100 }));
    expect(climateSpec(many).labelsByDefault).toBe(false);
  });

  it("값이 한 곳에 몰려도 축 범위가 비지 않는다", () => {
    const s = climateSpec([{ id: "1", name: "a", x: 20, y: 800 }, { id: "2", name: "b", x: 20, y: 800 }]);
    expect(s.xDomain[1] - s.xDomain[0]).toBeGreaterThanOrEqual(10);
    expect(s.yDomain[1]).toBeGreaterThanOrEqual(1000);
  });
});
