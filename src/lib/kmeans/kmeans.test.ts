import { describe, expect, it } from "vitest";
import {
  init,
  nextAction,
  runToEnd,
  step,
  summarize,
  normalizeValue,
  computeBounds,
  createRng,
  type Point,
} from "./index";

// 가격 단위가 맛 점수보다 훨씬 큰 두 덩어리
const points: Point[] = [
  { id: "a", x: 500, y: 1 },
  { id: "b", x: 600, y: 2 },
  { id: "c", x: 700, y: 1.5 },
  { id: "d", x: 3000, y: 4.5 },
  { id: "e", x: 3200, y: 5 },
  { id: "f", x: 3100, y: 4 },
];

describe("정규화", () => {
  it("각 축을 0~1로 바꾼다", () => {
    const b = computeBounds(points);
    expect(normalizeValue(500, 1, b)).toEqual([0, 0]);
    expect(normalizeValue(3200, 5, b)).toEqual([1, 1]);
  });

  it("값이 모두 같은 축은 0으로 둔다", () => {
    const b = computeBounds([
      { id: "1", x: 5, y: 1 },
      { id: "2", x: 5, y: 3 },
    ]);
    expect(normalizeValue(5, 3, b)).toEqual([0, 1]);
  });

  it("가격만이 아니라 맛 점수도 군집에 영향을 준다", () => {
    // 가격은 비슷하고 맛 점수만 크게 다른 두 덩어리
    const pts: Point[] = [
      { id: "1", x: 1000, y: 1 },
      { id: "2", x: 1100, y: 1.2 },
      { id: "3", x: 1050, y: 1.1 },
      { id: "4", x: 1200, y: 4.8 },
      { id: "5", x: 1000, y: 5 },
      { id: "6", x: 1100, y: 4.9 },
    ];
    const end = runToEnd(init(pts, 2, { seed: 3 }));
    expect(end.assignments[0]).toBe(end.assignments[1]);
    expect(end.assignments[0]).toBe(end.assignments[2]);
    expect(end.assignments[3]).toBe(end.assignments[4]);
    expect(end.assignments[0]).not.toBe(end.assignments[3]);
  });
});

describe("시드", () => {
  it("같은 시드면 같은 난수", () => {
    const a = createRng(7);
    const b = createRng(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("같은 입력과 시드면 같은 결과", () => {
    const r1 = runToEnd(init(points, 2, { seed: 11 }));
    const r2 = runToEnd(init(points, 2, { seed: 11 }));
    expect(r1.assignments).toEqual(r2.assignments);
    expect(r1.centroids).toEqual(r2.centroids);
  });
});

describe("단계 실행", () => {
  it("ready → centroids → assigned → moved … 순서로 진행한다", () => {
    let s = init(points, 2, { seed: 1 });
    expect(s.phase).toBe("ready");
    expect(nextAction(s)).toBe("centroids");
    s = step(s);
    expect(s.phase).toBe("centroids");
    expect(s.centroids).toHaveLength(2);
    s = step(s);
    expect(s.phase).toBe("assigned");
    expect(s.assignments.every((a) => a >= 0)).toBe(true);
    expect(nextAction(s)).toBe("move");
    s = step(s);
    expect(["moved", "converged"]).toContain(s.phase);
  });

  it("step을 반복한 결과와 runToEnd 결과가 같다", () => {
    for (const seed of [1, 2, 3, 42]) {
      for (const k of [2, 3]) {
        let s = init(points, k, { seed });
        while (s.phase !== "converged") s = step(s);
        const r = runToEnd(init(points, k, { seed }));
        expect(s).toEqual(r);
      }
    }
  });

  it("수렴하면 더 이상 바뀌지 않는다", () => {
    const end = runToEnd(init(points, 2, { seed: 5 }));
    expect(end.phase).toBe("converged");
    expect(nextAction(end)).toBeNull();
    expect(step(end)).toBe(end);
  });

  it("두 덩어리를 올바르게 나눈다", () => {
    const end = runToEnd(init(points, 2, { seed: 5 }));
    const g = end.assignments;
    expect(g[0]).toBe(g[1]);
    expect(g[1]).toBe(g[2]);
    expect(g[3]).toBe(g[4]);
    expect(g[4]).toBe(g[5]);
    expect(g[0]).not.toBe(g[3]);
  });

  it("최대 반복에 닿으면 멈춘다", () => {
    const end = runToEnd(init(points, 3, { seed: 2, maxIterations: 1 }));
    expect(end.phase).toBe("converged");
    expect(end.iteration).toBe(1);
  });
});

describe("요약", () => {
  it("그룹별 평균을 원래 단위로 계산한다", () => {
    const end = runToEnd(init(points, 2, { seed: 5 }));
    const sums = summarize(end);
    const low = sums.find((s) => s.memberIds.includes("a"))!;
    expect(low.count).toBe(3);
    expect(low.meanX).toBeCloseTo(600);
    expect(low.meanY).toBeCloseTo(1.5);
    // 수렴 후 중심점은 평균과 같다
    expect(end.centroids[low.index][0]).toBeCloseTo(600);
  });

  it("배정 전에는 중심점 위치를 평균 자리에 돌려준다", () => {
    const s = step(init(points, 2, { seed: 1 }));
    const sums = summarize(s);
    expect(sums.every((x) => x.count === 0)).toBe(true);
    expect([sums[0].meanX, sums[0].meanY]).toEqual([...s.centroids[0]]);
  });
});

describe("예외 상황", () => {
  it("k가 점 개수보다 크면 점 개수로 줄인다", () => {
    const s = init(points.slice(0, 2), 5);
    expect(s.k).toBe(2);
    const end = runToEnd(s);
    expect(new Set(end.assignments).size).toBe(2);
  });

  it("모든 점이 같은 위치여도 끝난다", () => {
    const same: Point[] = [1, 2, 3].map((n) => ({ id: String(n), x: 1000, y: 3 }));
    const end = runToEnd(init(same, 2));
    expect(end.phase).toBe("converged");
  });

  it("빈 그룹이 생겨도 중심점이 유지된다", () => {
    const same: Point[] = [1, 2, 3].map((n) => ({ id: String(n), x: 1000, y: 3 }));
    const end = runToEnd(init(same, 2));
    expect(end.centroids).toHaveLength(2);
  });

  it("점이 없으면 오류", () => {
    expect(() => init([], 2)).toThrow();
  });
});
