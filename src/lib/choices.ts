import data from "@/data/scenarios.json";
import type { ClusterType } from "@/lib/cluster-types";

export const SCENARIO = data.scenarios[0];
/** 용돈 총액과 슬라이더 단위 (원) */
export const TOTAL = SCENARIO.total;
export const STEP = SCENARIO.step;
export const CRITICAL_QUESTIONS: string[] = data.criticalQuestions;

/** 교사가 나눠 주는 학습지(정보)가 부추기는 방향. both 는 소비·저축 정보를 모두 받아 방향이 없다. */
export type Direction = "consume" | "save" | "both";
export const TYPE_DIRECTION = data.typeDirections as Record<ClusterType, Direction>;

export const DIRECTION_TEXT: Record<Direction, string> = {
  consume: "소비 쪽 이야기가 많은 정보",
  save: "저축 쪽 이야기가 많은 정보",
  both: "소비와 저축 정보를 모두",
};

/** 금액을 단위에 맞추고 0~총액 안으로 맞춘다 */
export function clampConsume(value: number, total = TOTAL, step = STEP): number {
  const snapped = Math.round(value / step) * step;
  return Math.min(total, Math.max(0, snapped));
}

export const saveAmount = (consume: number, total = TOTAL): number => total - consume;

/**
 * 1차 → 2차로 선택이 어떻게 움직였는지.
 * toward: 내 그룹이 받은 정보가 알려 준 쪽 / against: 반대쪽 / same: 그대로 / both: 방향 없는 그룹이 움직임
 */
export type MovementKind = "toward" | "against" | "same" | "both";

export function classifyMovement(direction: Direction, first: number, second: number): MovementKind {
  const delta = second - first;
  if (delta === 0) return "same";
  if (direction === "both") return "both";
  const wantsMoreConsume = direction === "consume";
  return delta > 0 === wantsMoreConsume ? "toward" : "against";
}

export const KIND_TEXT: Record<MovementKind, string> = {
  toward: "정보가 알려 준 쪽으로 선택이 움직였어요.",
  against: "정보가 알려 준 쪽과 반대로 움직였어요.",
  same: "선택을 바꾸지 않았어요.",
  both: "두 가지 정보를 모두 받았어요. 선택이 어느 쪽으로 움직였는지 함께 이야기해 봐요.",
};

export const KIND_LABEL: Record<MovementKind, string> = {
  toward: "정보 쪽으로",
  against: "반대로",
  same: "그대로",
  both: "방향 없음",
};

/** "소비를 2,000원 늘렸어요" */
export function describeChange(first: number, second: number): string {
  const delta = second - first;
  const amount = `${Math.abs(delta).toLocaleString("ko-KR")}원`;
  if (delta === 0) return "소비 금액이 그대로예요";
  return `소비를 ${amount} ${delta > 0 ? "늘렸어요" : "줄였어요"}`;
}

export interface ShiftRow {
  code: string;
  /** 내 그룹의 유형. 그룹이 없으면 null */
  type: ClusterType | null;
  first: number;
  second: number;
}

export interface ShiftSummary {
  students: number;
  moved: number;
  toward: number;
  against: number;
  same: number;
  both: number;
  /** 그룹이 없어 판정할 수 없는 학생 */
  noGroup: number;
  avgFirst: number;
  avgSecond: number;
}

export function kindOf(row: ShiftRow): MovementKind | null {
  return row.type ? classifyMovement(TYPE_DIRECTION[row.type], row.first, row.second) : null;
}

/** 학급 전체: 1·2차를 모두 한 학생들의 변화 요약 */
export function summarizeShifts(rows: readonly ShiftRow[]): ShiftSummary {
  const out: ShiftSummary = { students: rows.length, moved: 0, toward: 0, against: 0, same: 0, both: 0, noGroup: 0, avgFirst: 0, avgSecond: 0 };
  for (const r of rows) {
    if (r.first !== r.second) out.moved++;
    const kind = kindOf(r);
    if (kind === null) out.noGroup++;
    else out[kind]++;
  }
  if (rows.length) {
    out.avgFirst = rows.reduce((s, r) => s + r.first, 0) / rows.length;
    out.avgSecond = rows.reduce((s, r) => s + r.second, 0) / rows.length;
  }
  return out;
}
