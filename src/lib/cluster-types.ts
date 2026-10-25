/** 소비·저축 점수의 높고 낮음으로 나눈 4가지 유형 (가치 판단이 없는 중립적인 이름) */
export type ClusterType = "low-low" | "high-low" | "low-high" | "high-high";

export const CLUSTER_TYPE_IDS: ClusterType[] = ["low-low", "high-low", "low-high", "high-high"];

export const CLUSTER_TYPE_LABEL: Record<ClusterType, string> = {
  "low-low": "소비↓ 저축↓",
  "high-low": "소비↑ 저축↓",
  "low-high": "소비↓ 저축↑",
  "high-high": "소비↑ 저축↑",
};

export const CLUSTER_TYPE_HELP: Record<ClusterType, string> = {
  "low-low": "쓰는 마음도 모으는 마음도 낮은 편",
  "high-low": "쓰고 싶은 마음이 크고, 모으는 마음은 낮은 편",
  "low-high": "쓰는 마음은 낮고, 모으는 마음이 큰 편",
  "high-high": "쓰고 싶은 마음도 모으는 마음도 큰 편",
};

/** 중심점(소비, 저축)이 척도의 가운데(mid)보다 높은지 낮은지로 유형을 정한다. 가운데와 같으면 낮음. */
export function typeOfCentroid(consume: number, save: number, mid: number): ClusterType {
  const c = consume > mid ? "high" : "low";
  const s = save > mid ? "high" : "low";
  return `${c}-${s}` as ClusterType;
}

export function isClusterType(v: unknown): v is ClusterType {
  return typeof v === "string" && (CLUSTER_TYPE_IDS as string[]).includes(v);
}
