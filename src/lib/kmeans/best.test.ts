import { describe, expect, it } from "vitest";
import { createRng, init, inertia, runBest, runToEnd, type Point } from "./index";

function blobs(seed: number): Point[] {
  const r = createRng(seed);
  const centers = [[6, 6], [14, 6], [6, 14], [14, 14]];
  return Array.from({ length: 24 }, (_, i) => {
    const [cx, cy] = centers[i % 4];
    return { id: `s${i + 1}`, x: Math.round(cx + (r() - 0.5) * 4), y: Math.round(cy + (r() - 0.5) * 4) };
  });
}

describe("여러 시드 중 가장 좋은 결과", () => {
  it("같은 입력이면 언제나 같다", () => {
    const pts = blobs(3);
    expect(runBest(pts, 4)).toEqual(runBest(pts, 4));
  });

  it("어떤 단일 시드보다 나쁘지 않다", () => {
    const pts = blobs(5);
    const best = inertia(runBest(pts, 4));
    for (let seed = 1; seed <= 20; seed++) {
      expect(best).toBeLessThanOrEqual(inertia(runToEnd(init(pts, 4, { seed }))) + 1e-9);
    }
  });

  it("뚜렷한 4덩어리를 4그룹으로 나눈다", () => {
    const pts = blobs(7);
    const end = runBest(pts, 4);
    const groupOf = (i: number) => end.assignments[i];
    // 같은 덩어리(i % 4)끼리는 같은 그룹, 다른 덩어리는 다른 그룹
    for (let i = 4; i < pts.length; i++) expect(groupOf(i)).toBe(groupOf(i % 4));
    expect(new Set([0, 1, 2, 3].map(groupOf)).size).toBe(4);
  });

  it("점이 K보다 적어도 동작한다", () => {
    const pts = blobs(1).slice(0, 3);
    expect(runBest(pts, 4).k).toBe(3);
  });
});
