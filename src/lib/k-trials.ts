import type { Judgment } from "@/lib/kmeans";
import { getSupabase } from "@/lib/supabase/client";
import type { StudentSession } from "@/lib/student-session";

/** 5차시에서 K를 해 보는 순서 */
export const K_ORDER = [2, 3, 4, 5];

export type { Judgment };

export const JUDGMENT_LABEL: Record<Judgment, string> = {
  wide: "넓어요",
  good: "알맞아요",
  split: "잘게 나눴어요",
};

export const JUDGMENT_HELP: Record<Judgment, string> = {
  wide: "한 그룹에 서로 다른 간식이 너무 많이 섞였어요",
  good: "비슷한 간식끼리 잘 모였어요",
  split: "비슷한 간식이 여러 그룹으로 너무 잘게 나뉘었어요",
};

export const JUDGMENT_ICON: Record<Judgment, string> = { wide: "🟥", good: "✅", split: "🧩" };

export interface SavedTrial {
  k: number;
  judgment: Judgment;
  /** 학생이 처음 묶은 그룹 (간식 순서대로) */
  initial: number[];
  final: number[];
  meanDistance: number;
  maxRadius: number;
}

export async function loadKTrials(session: StudentSession): Promise<SavedTrial[]> {
  const { data, error } = await getSupabase("student")
    .from("k_trials")
    .select("k, judgment, initial_groups, final_groups, mean_distance, max_radius")
    .eq("student_id", session.studentId)
    .order("k");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    k: r.k,
    judgment: r.judgment as Judgment,
    initial: r.initial_groups,
    final: r.final_groups,
    meanDistance: Number(r.mean_distance),
    maxRadius: Number(r.max_radius),
  }));
}

export async function saveKTrial(session: StudentSession, t: SavedTrial): Promise<void> {
  const { error } = await getSupabase("student").rpc("save_k_trial", {
    p_class_id: session.classId,
    p_k: t.k,
    p_judgment: t.judgment,
    p_initial: t.initial,
    p_final: t.final,
    p_mean_distance: Math.round(t.meanDistance * 1000) / 1000,
    p_max_radius: Math.round(t.maxRadius * 1000) / 1000,
  });
  if (error) throw error;
}
