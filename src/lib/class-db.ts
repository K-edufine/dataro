import { getSupabase, type Role } from "@/lib/supabase/client";
import { isClusterType, type ClusterType } from "@/lib/cluster-types";
import type { ClassClusterResult, ScoreRow } from "@/lib/class-cluster";
import type { StudentSession } from "@/lib/student-session";

/** 같은 학급 친구들의 번호표와 점수 (이름은 없다) */
export async function fetchClassScores(role: Role, classId: string): Promise<ScoreRow[]> {
  const { data, error } = await getSupabase(role).rpc("class_scores", { p_class_id: classId });
  if (error) throw error;
  return ((data ?? []) as { anon_code: string; number: number; consume: number | string; save: number | string }[]).map((r) => ({
    anon_code: r.anon_code,
    number: r.number,
    consume: Number(r.consume),
    save: Number(r.save),
  }));
}

export interface ConfirmedState {
  results: ClassClusterResult[];
  /** 8~10차시에서 쓸 대표 K */
  mainK: number;
  confirmedAt: string | null;
}

/** 교사가 확정해 둔 학급 군집 결과 (없으면 results 가 빈 배열) */
export async function fetchConfirmed(role: Role, classId: string): Promise<ConfirmedState> {
  const db = getSupabase(role);
  const [res, cls] = await Promise.all([
    db.from("cluster_results").select("k, seed, assignments, centroids, group_types, student_count, confirmed_at").eq("class_id", classId).order("k"),
    db.from("classes").select("main_k").eq("id", classId).maybeSingle(),
  ]);
  if (res.error) throw res.error;
  const rows = res.data ?? [];
  return {
    results: rows.map((r) => ({
      k: r.k,
      seed: r.seed,
      assignments: r.assignments as Record<string, number>,
      centroids: (r.centroids as [number, number][]).map(([c, s]) => [Number(c), Number(s)] as [number, number]),
      types: (r.group_types as unknown[]).map((t) => (isClusterType(t) ? t : "low-low") as ClusterType),
      studentCount: r.student_count,
    })),
    mainK: cls.data?.main_k ?? 4,
    confirmedAt: rows.length ? rows.reduce((latest, r) => (r.confirmed_at > latest ? r.confirmed_at : latest), rows[0].confirmed_at) : null,
  };
}

/** 교사: 이 결과로 학급 군집을 확정한다 (학생들이 붙인 그룹 이름은 지워진다) */
export async function confirmClusters(classId: string, results: ClassClusterResult[], mainK: number): Promise<void> {
  const { error } = await getSupabase("teacher").rpc("confirm_clusters", {
    p_class_id: classId,
    p_main_k: mainK,
    p_results: results.map((r) => ({
      k: r.k,
      seed: r.seed,
      assignments: r.assignments,
      centroids: r.centroids,
      group_types: r.types,
      student_count: r.studentCount,
    })),
  });
  if (error) throw error;
}

/** 교사: 확정한 뒤에 4유형만 고친다 */
export async function setGroupTypes(classId: string, k: number, types: ClusterType[]): Promise<void> {
  const { error } = await getSupabase("teacher").rpc("set_group_types", { p_class_id: classId, p_k: k, p_types: types });
  if (error) throw error;
}

/** 내가 붙인 그룹 이름 (K → 그룹 번호 순서의 이름들) */
export async function fetchMyLabels(session: StudentSession): Promise<Record<number, string[]>> {
  const { data, error } = await getSupabase("student")
    .from("cluster_labels").select("k, names").eq("student_id", session.studentId);
  if (error) throw error;
  const out: Record<number, string[]> = {};
  for (const r of data ?? []) out[r.k] = (r.names as string[]) ?? [];
  return out;
}

export async function saveMyLabels(session: StudentSession, k: number, names: string[]): Promise<void> {
  const { error } = await getSupabase("student").rpc("save_cluster_labels", {
    p_class_id: session.classId, p_k: k, p_names: names,
  });
  if (error) throw error;
}
