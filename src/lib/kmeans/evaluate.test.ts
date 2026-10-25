import { describe, expect, it } from "vitest";
import { MAX_SINGLE_GROUPS, WIDE_RADIUS_LIMIT, evaluateK, groupMetrics, toScale, type Point } from "./index";

// 가격 차이가 큰 세 덩어리 (정규화하면 모두 0~1 안)
const clear: Point[] = [
  { id: "a1", x: 300, y: 1 }, { id: "a2", x: 500, y: 1.5 }, { id: "a3", x: 400, y: 1 },
  { id: "b1", x: 1800, y: 4.5 }, { id: "b2", x: 2000, y: 5 }, { id: "b3", x: 1900, y: 4 },
  { id: "c1", x: 4000, y: 2 }, { id: "c2", x: 4200, y: 2.5 }, { id: "c3", x: 4100, y: 2 },
];

describe("K 평가", () => {
  it("네 모서리 점 한 그룹: 모든 거리가 √0.5 이고 '넓다'", () => {
    const corners: Point[] = [
      { id: "1", x: 0, y: 1 }, { id: "2", x: 1000, y: 1 },
      { id: "3", x: 0, y: 5 }, { id: "4", x: 1000, y: 5 },
    ];
    const ev = evaluateK(corners, 1);
    expect(ev.meanDistance).toBeCloseTo(Math.SQRT1_2, 6);
    expect(ev.maxRadius).toBeCloseTo(Math.SQRT1_2, 6);
    expect(ev.issues).toContain("wide");
    expect(ev.issues).not.toContain("single");
  });

  it("점마다 그룹이 되면 거리 0, '혼자인 그룹' 경고", () => {
    const corners: Point[] = [
      { id: "1", x: 0, y: 1 }, { id: "2", x: 1000, y: 1 },
      { id: "3", x: 0, y: 5 }, { id: "4", x: 1000, y: 5 },
    ];
    const ev = evaluateK(corners, 4);
    expect(ev.meanDistance).toBe(0);
    expect(ev.issues).toEqual(["single"]);
  });

  it("뚜렷한 3덩어리는 K=3 에서 평균 거리가 크게 줄고 경고가 없다", () => {
    const k1 = evaluateK(clear, 1, { seed: 1 });
    const k2 = evaluateK(clear, 2, { seed: 1 });
    const k3 = evaluateK(clear, 3, { seed: 1 });
    expect(k1.meanDistance).toBeGreaterThan(k2.meanDistance);
    expect(k2.meanDistance).toBeGreaterThan(k3.meanDistance);
    expect(k3.issues).toEqual([]);
    expect(k3.maxRadius).toBeLessThan(WIDE_RADIUS_LIMIT);
    expect(k1.issues).toContain("wide");
  });

  it("혼자인 그룹이 하나뿐이면 괜찮고, 많으면 경고한다", () => {
    // 가까운 두 점 + 가까운 두 점 + 멀리 떨어진 점 하나
    const outlier: Point[] = [
      { id: "1", x: 300, y: 1 }, { id: "2", x: 400, y: 1.5 },
      { id: "3", x: 1800, y: 4.5 }, { id: "4", x: 1900, y: 4 },
      { id: "5", x: 4200, y: 2 },
    ];
    const ev = evaluateK(outlier, 3, { seed: 1 });
    expect(ev.groups.filter((g) => g.count === 1)).toHaveLength(1);
    expect(MAX_SINGLE_GROUPS).toBe(1);
    expect(ev.issues).toEqual([]);
    expect(evaluateK(outlier, 5, { seed: 1 }).issues).toContain("single");
  });

  it("그룹별 개수와 평균 거리를 계산한다", () => {
    const ev = evaluateK(clear, 3, { seed: 1 });
    const total = ev.groups.reduce((s, g) => s + g.count, 0);
    expect(total).toBe(clear.length);
    expect(ev.groups.every((g) => g.count === 3)).toBe(true);
    expect(ev.groups.every((g) => g.meanDistance <= g.radius)).toBe(true);
    expect(groupMetrics(ev.state)).toEqual(ev.groups);
  });

  it("같은 입력과 시드면 같은 평가", () => {
    expect(evaluateK(clear, 3, { seed: 4 })).toEqual(evaluateK(clear, 3, { seed: 4 }));
  });

  it("0~10 눈금으로 환산", () => {
    expect(toScale(0.4)).toBeCloseTo(4);
    expect(toScale(1)).toBe(10);
  });
});
