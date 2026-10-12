/** 원래 단위의 점. (간식: x=가격 원, y=맛 점수 / 성향: x=소비 점수, y=저축 점수) */
export interface Point {
  id: string;
  x: number;
  y: number;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * ready      : 아직 아무것도 안 함
 * centroids  : 중심점이 만들어짐 (아직 배정 전)
 * assigned   : 가까운 중심점으로 그룹 배정 완료
 * moved      : 중심점이 그룹 평균으로 이동 완료 (다시 배정 필요)
 * converged  : 더 이상 바뀌지 않음 (또는 최대 반복에 도달)
 */
export type Phase = "ready" | "centroids" | "assigned" | "moved" | "converged";

export type StepAction = "centroids" | "assign" | "move";

export interface KMeansState {
  readonly points: readonly Point[];
  readonly k: number;
  readonly seed: number;
  readonly maxIterations: number;
  readonly bounds: Bounds;
  readonly phase: Phase;
  /** 점마다 소속 그룹 번호. 아직 배정 전이면 -1 */
  readonly assignments: readonly number[];
  /** 정규화(0~1) 공간의 중심점. 내부 계산용 */
  readonly centroidsNorm: readonly (readonly [number, number])[];
  /** 원래 단위의 중심점. 화면 표시용 */
  readonly centroids: readonly (readonly [number, number])[];
  /** 중심점 이동 횟수 */
  readonly iteration: number;
}

export interface ClusterSummary {
  index: number;
  count: number;
  memberIds: string[];
  /** 멤버가 있으면 멤버 평균, 없으면 중심점 (원래 단위) */
  meanX: number;
  meanY: number;
}
