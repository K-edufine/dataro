import { defaultClusterName } from "@/components/chart/cluster-style";
import { TYPE_DIRECTION, type Direction } from "@/lib/choices";
import type { ConfirmedState } from "@/lib/class-db";
import type { ClusterType } from "@/lib/cluster-types";

/** 교사가 확정한 결과(대표 K)에서 찾은 내 그룹 */
export interface MyCluster {
  k: number;
  group: number;
  type: ClusterType;
  /** 7차시에서 내가 붙인 이름 (없으면 "N번 그룹") */
  name: string;
  direction: Direction;
}

export function findMyCluster(
  confirmed: ConfirmedState,
  anonCode: string,
  labels: Record<number, string[]>,
): MyCluster | null {
  const res = confirmed.results.find((r) => r.k === confirmed.mainK) ?? confirmed.results[confirmed.results.length - 1];
  if (!res) return null;
  const group = res.assignments[anonCode];
  if (group === undefined) return null;
  const type = res.types[group];
  return {
    k: res.k,
    group,
    type,
    name: labels[res.k]?.[group]?.trim() || defaultClusterName(group),
    direction: TYPE_DIRECTION[type],
  };
}
