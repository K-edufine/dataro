import { init, initFromGroups, runToEnd, type InitOptions } from "./kmeans";
import { normalizeValue } from "./normalize";
import type { KMeansState, Point } from "./types";

/**
 * "K가 알맞은가"를 판단하는 기준. 모든 거리는 정규화(0~1)한 값으로 잰다.
 * 가격(원)과 선호도(점)처럼 단위가 달라도 같은 눈금으로 비교하기 위해서다.
 */

/** 그룹 반지름이 이 값(눈금 4)보다 크면 "너무 넓다". 임시값이라 실제 데이터를 보고 조정한다. */
export const WIDE_RADIUS_LIMIT = 0.4;

/**
 * 점이 1개뿐인 그룹은 이 개수까지는 괜찮다. (간식 10개 중 비싼 것 하나는 혼자 그룹이 될 수 있다)
 * 이보다 많으면 "너무 잘게 나눴다"고 본다. 임시값이라 실제 데이터를 보고 조정한다.
 */
export const MAX_SINGLE_GROUPS = 1;

/** 화면에는 0~10 눈금으로 보여 준다. */
export const SCALE_MAX = 10;
export const toScale = (distance: number): number => distance * SCALE_MAX;

export interface GroupMetrics {
  index: number;
  count: number;
  /** 그룹 안 점들이 중심에서 떨어진 평균 거리 */
  meanDistance: number;
  /** 중심에서 가장 먼 점까지의 거리 (그룹의 넓이) */
  radius: number;
}

export type Issue = "wide" | "single";

export interface KEvaluation {
  k: number;
  state: KMeansState;
  groups: GroupMetrics[];
  /** 모든 점이 자기 그룹 중심에서 떨어진 평균 거리 */
  meanDistance: number;
  /** 가장 넓은 그룹의 반지름 */
  maxRadius: number;
  /** wide: 넓은 그룹이 있음 / single: 점이 1개뿐인 그룹이 너무 많음 */
  issues: Issue[];
}

export function groupMetrics(state: KMeansState): GroupMetrics[] {
  const norm = state.points.map((p) => normalizeValue(p.x, p.y, state.bounds));
  return state.centroidsNorm.map((c, index) => {
    const dists = norm
      .filter((_, i) => state.assignments[i] === index)
      .map((v) => Math.hypot(v[0] - c[0], v[1] - c[1]));
    return {
      index,
      count: dists.length,
      meanDistance: dists.length ? dists.reduce((s, d) => s + d, 0) / dists.length : 0,
      radius: dists.length ? Math.max(...dists) : 0,
    };
  });
}

/** 학생이 고르는 판단과 같은 말로 컴퓨터 판정을 낸다. wide=넓어요, good=알맞아요, split=잘게 나눴어요 */
export type Judgment = "wide" | "good" | "split";

export function computerJudgment(ev: Pick<KEvaluation, "issues">): Judgment {
  if (ev.issues.includes("wide")) return "wide";
  if (ev.issues.includes("single")) return "split";
  return "good";
}

/** 배정이 끝난 상태(assigned 이후)를 평가한다. */
export function evaluate(state: KMeansState, wideLimit = WIDE_RADIUS_LIMIT): KEvaluation {
  const groups = groupMetrics(state);
  const total = groups.reduce((s, g) => s + g.meanDistance * g.count, 0);
  const meanDistance = state.points.length ? total / state.points.length : 0;
  const maxRadius = Math.max(0, ...groups.map((g) => g.radius));
  const issues: Issue[] = [];
  if (groups.some((g) => g.radius > wideLimit)) issues.push("wide");
  if (groups.filter((g) => g.count === 1).length > MAX_SINGLE_GROUPS) issues.push("single");
  return { k: state.k, state, groups, meanDistance, maxRadius, issues };
}

/** 학생이 묶은 그룹에서 시작해 끝까지 군집화한 뒤 평가한다. */
export function evaluateFromGroups(
  points: readonly Point[],
  groups: readonly number[],
  options: InitOptions = {},
): KEvaluation {
  return evaluate(runToEnd(initFromGroups(points, groups, options)));
}

/** K를 정해 끝까지 군집화한 뒤 평가한다. 같은 입력·시드면 항상 같은 결과. */
export function evaluateK(
  points: readonly Point[],
  k: number,
  options: InitOptions = {},
): KEvaluation {
  return evaluate(runToEnd(init(points, k, options)));
}
