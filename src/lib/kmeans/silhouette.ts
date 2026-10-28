import type { Point } from "./types";

export interface SilhouetteResult {
  /** 점마다 실루엣 값 (-1~1). 점이 하나뿐인 그룹의 점은 0 */
  perPoint: number[];
  /** 모든 점의 평균 (실루엣 계수). 1에 가까울수록 잘 묶인 것 */
  mean: number;
}

/**
 * 실루엣 계수. 거리는 원래 단위(정규화하지 않음)의 유클리드 거리다.
 * a = 같은 그룹 안 다른 점들까지의 평균 거리, b = 가장 가까운 다른 그룹까지의 평균 거리
 * 점의 실루엣 = (b - a) / max(a, b)
 */
export function silhouette(points: readonly Point[], assignments: readonly number[]): SilhouetteResult {
  const groups = [...new Set(assignments)];
  const dist = (i: number, j: number) => Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
  const perPoint = points.map((_, i) => {
    const own = assignments[i];
    const meanTo = (g: number) => {
      const members = points.map((_, j) => j).filter((j) => assignments[j] === g && j !== i);
      return members.length ? members.reduce((s, j) => s + dist(i, j), 0) / members.length : NaN;
    };
    const a = meanTo(own);
    if (Number.isNaN(a) || groups.length < 2) return 0;
    const b = Math.min(...groups.filter((g) => g !== own).map(meanTo));
    const m = Math.max(a, b);
    return m === 0 ? 0 : (b - a) / m;
  });
  const mean = perPoint.length ? perPoint.reduce((s, v) => s + v, 0) / perPoint.length : 0;
  return { perPoint, mean };
}
