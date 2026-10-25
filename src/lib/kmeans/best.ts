import { init, runToEnd } from "./kmeans";
import { normalizeValue } from "./normalize";
import type { KMeansState, Point } from "./types";

/** 군집 안 거리 제곱의 합(정규화 값). 작을수록 알맞게 모인 것이다. */
export function inertia(state: KMeansState): number {
  return state.points.reduce((sum, p, i) => {
    const [x, y] = normalizeValue(p.x, p.y, state.bounds);
    const [cx, cy] = state.centroidsNorm[state.assignments[i]];
    return sum + (x - cx) ** 2 + (y - cy) ** 2;
  }, 0);
}

export const DEFAULT_BEST_SEEDS = 20;

/**
 * 시작 중심점(시드)을 여러 개 시험해 가장 좋은 결과를 고른다.
 * 같은 입력이면 언제나 같은 결과다. (동점이면 작은 시드)
 */
export function runBest(
  points: readonly Point[],
  k: number,
  options: { seeds?: number; maxIterations?: number } = {},
): KMeansState {
  const count = options.seeds ?? DEFAULT_BEST_SEEDS;
  let best: KMeansState | null = null;
  let bestScore = Infinity;
  for (let seed = 1; seed <= count; seed++) {
    const end = runToEnd(init(points, k, { seed, maxIterations: options.maxIterations }));
    const score = inertia(end);
    if (score < bestScore - 1e-12) {
      best = end;
      bestScore = score;
    }
  }
  return best!;
}
