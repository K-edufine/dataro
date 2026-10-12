import { computeBounds, denormalizeValue, normalizeValue } from "./normalize";
import { createRng } from "./seeded-random";
import type {
  ClusterSummary,
  KMeansState,
  Point,
  StepAction,
} from "./types";

type Vec = readonly [number, number];

export const DEFAULT_MAX_ITERATIONS = 50;
const EPSILON = 1e-9;

export interface InitOptions {
  seed?: number;
  maxIterations?: number;
}

/** 시작 상태를 만든다. k가 점 개수보다 크면 점 개수로 줄인다. */
export function init(
  points: readonly Point[],
  k: number,
  options: InitOptions = {},
): KMeansState {
  if (points.length === 0) throw new Error("점이 하나도 없어요.");
  if (k < 1) throw new Error("k는 1 이상이어야 해요.");
  return {
    points,
    k: Math.min(Math.floor(k), points.length),
    seed: options.seed ?? 1,
    maxIterations: options.maxIterations ?? DEFAULT_MAX_ITERATIONS,
    bounds: computeBounds(points),
    phase: "ready",
    assignments: points.map(() => -1),
    centroidsNorm: [],
    centroids: [],
    iteration: 0,
  };
}

/** 지금 눌러야 할 다음 단계. 끝났으면 null */
export function nextAction(state: KMeansState): StepAction | null {
  switch (state.phase) {
    case "ready":
      return "centroids";
    case "centroids":
    case "moved":
      return "assign";
    case "assigned":
      return "move";
    case "converged":
      return null;
  }
}

/** 한 단계만 진행한다. 이미 끝났으면 같은 상태를 돌려준다. */
export function step(state: KMeansState): KMeansState {
  switch (nextAction(state)) {
    case "centroids":
      return createCentroids(state);
    case "assign":
      return assign(state);
    case "move":
      return move(state);
    default:
      return state;
  }
}

/** 끝날 때까지 step을 반복한다. step과 같은 로직을 쓰므로 결과가 같다. */
export function runToEnd(state: KMeansState): KMeansState {
  let s = state;
  while (s.phase !== "converged") s = step(s);
  return s;
}

/** 그룹별 개수와 평균(원래 단위) */
export function summarize(state: KMeansState): ClusterSummary[] {
  const out: ClusterSummary[] = [];
  for (let c = 0; c < state.centroids.length; c++) {
    const members = state.points.filter((_, i) => state.assignments[i] === c);
    const [cx, cy] = state.centroids[c];
    out.push({
      index: c,
      count: members.length,
      memberIds: members.map((p) => p.id),
      meanX: members.length ? mean(members.map((p) => p.x)) : cx,
      meanY: members.length ? mean(members.map((p) => p.y)) : cy,
    });
  }
  return out;
}

// ---------------------------------------------------------------- 내부 함수

function createCentroids(state: KMeansState): KMeansState {
  const rng = createRng(state.seed);
  const norm = state.points.map((p) => normalizeValue(p.x, p.y, state.bounds));

  // 시드 기반으로 점을 섞은 뒤 앞에서부터 고른다. 같은 위치의 점은 가능하면 피한다.
  const order = norm.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const chosen: number[] = [];
  const seen = new Set<string>();
  for (const i of order) {
    if (chosen.length === state.k) break;
    const key = `${norm[i][0]},${norm[i][1]}`;
    if (!seen.has(key)) {
      seen.add(key);
      chosen.push(i);
    }
  }
  for (const i of order) {
    if (chosen.length === state.k) break;
    if (!chosen.includes(i)) chosen.push(i);
  }

  return withCentroids({ ...state, phase: "centroids" }, chosen.map((i) => norm[i]));
}

function assign(state: KMeansState): KMeansState {
  const assignments = state.points.map((p) => {
    const v = normalizeValue(p.x, p.y, state.bounds);
    let best = 0;
    let bestDist = Infinity;
    state.centroidsNorm.forEach((c, idx) => {
      const d = dist2(v, c);
      if (d < bestDist) {
        bestDist = d;
        best = idx;
      }
    });
    return best;
  });
  return { ...state, phase: "assigned", assignments };
}

function move(state: KMeansState): KMeansState {
  const norm = state.points.map((p) => normalizeValue(p.x, p.y, state.bounds));
  const next: Vec[] = state.centroidsNorm.map((old, c) => {
    const members = norm.filter((_, i) => state.assignments[i] === c);
    if (members.length === 0) return old; // 빈 그룹은 제자리
    return [mean(members.map((m) => m[0])), mean(members.map((m) => m[1]))];
  });

  const shifted = next.some((c, i) => dist2(c, state.centroidsNorm[i]) > EPSILON * EPSILON);
  const iteration = state.iteration + 1;
  const done = !shifted || iteration >= state.maxIterations;
  return withCentroids(
    { ...state, phase: done ? "converged" : "moved", iteration },
    next,
  );
}

function withCentroids(state: KMeansState, centroidsNorm: Vec[]): KMeansState {
  return {
    ...state,
    centroidsNorm,
    centroids: centroidsNorm.map((c) => denormalizeValue(c[0], c[1], state.bounds)),
  };
}

function dist2(a: Vec, b: Vec): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}
