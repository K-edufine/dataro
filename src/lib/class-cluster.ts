import { runBest, type Point } from "@/lib/kmeans";
import { typeOfCentroid, type ClusterType } from "@/lib/cluster-types";

/** 7차시에서 비교하는 K */
export const CLUSTER_KS = [2, 3, 4];

/** 학급 친구의 번호표와 점수 (이름은 없다) */
export interface ScoreRow {
  anon_code: string;
  number: number;
  consume: number;
  save: number;
}

/** 학급 전체를 K로 나눈 결과. 확정하면 이 모양 그대로 DB에 저장한다. */
export interface ClassClusterResult {
  k: number;
  /** 번호표(s8) → 그룹 번호(0부터) */
  assignments: Record<string, number>;
  /** 그룹 중심 [소비, 저축] (점수 단위) */
  centroids: [number, number][];
  types: ClusterType[];
  seed: number;
  studentCount: number;
}

/**
 * 학급 응답 전체를 K=2·3·4 로 나눈다. 같은 응답이면 언제나 같은 결과다.
 * 그룹 번호는 소비 점수가 낮은 그룹부터(같으면 저축이 낮은 그룹부터) 붙인다.
 */
export function computeClassClusters(rows: readonly ScoreRow[], mid: number): ClassClusterResult[] {
  if (rows.length === 0) return [];
  const points: Point[] = rows.map((r) => ({ id: r.anon_code, x: r.consume, y: r.save }));
  const out: ClassClusterResult[] = [];

  for (const wanted of CLUSTER_KS) {
    if (rows.length < wanted) continue;
    const end = runBest(points, wanted);

    // 그룹 순서를 정해서 번호를 다시 붙인다
    const order = end.centroids
      .map((c, index) => ({ index, c }))
      .sort((a, b) => a.c[0] - b.c[0] || a.c[1] - b.c[1] || a.index - b.index);
    const renumber = new Map(order.map((o, newIndex) => [o.index, newIndex]));
    const centroids = order.map((o) => [o.c[0], o.c[1]] as [number, number]);

    const assignments: Record<string, number> = {};
    rows.forEach((r, i) => {
      assignments[r.anon_code] = renumber.get(end.assignments[i])!;
    });

    out.push({
      k: end.k,
      assignments,
      centroids,
      types: centroids.map(([c, s]) => typeOfCentroid(c, s, mid)),
      seed: end.seed,
      studentCount: rows.length,
    });
  }
  return out;
}

/** 그룹에 속한 번호표 목록 (번호 순) */
export function membersOf(result: ClassClusterResult, group: number): string[] {
  return Object.entries(result.assignments)
    .filter(([, g]) => g === group)
    .map(([code]) => code)
    .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
}

/** 그룹 평균 점수 (rows 중 그 그룹 학생들) */
export function groupMeans(result: ClassClusterResult, rows: readonly ScoreRow[], group: number): { consume: number; save: number } | null {
  const mem = rows.filter((r) => result.assignments[r.anon_code] === group);
  if (mem.length === 0) return null;
  return {
    consume: mem.reduce((s, r) => s + r.consume, 0) / mem.length,
    save: mem.reduce((s, r) => s + r.save, 0) / mem.length,
  };
}
