import type { Judgment } from "@/lib/kmeans";
import { iGa } from "@/lib/korean";
import type { GradeBand } from "@/lib/schools";
import { getSupabase } from "@/lib/supabase/client";
import type { StudentSession } from "@/lib/student-session";

/** 5차시에서 K를 해 보는 순서: 저학년 2~5, 고학년 2~6 */
export const K_ORDER = [2, 3, 4, 5];
export const K_ORDER_HIGH = [2, 3, 4, 5, 6];
export const kOrderFor = (band: GradeBand): number[] => (band === "high" ? K_ORDER_HIGH : K_ORDER);

/** manual = 학생이 직접 묶음, auto = 컴퓨터가 자동으로 묶음 */
export type TrialMode = "manual" | "auto";

export type { Judgment };

export const JUDGMENT_LABEL: Record<Judgment, string> = {
  wide: "넓어요",
  good: "알맞아요",
  split: "잘게 나눴어요",
};

/** 판단 보기 아래에 붙는 설명. noun 은 "간식", "도시" 처럼 다루는 점의 이름 */
export function judgmentHelp(j: Judgment, noun: string): string {
  switch (j) {
    case "wide":
      return `한 그룹에 서로 다른 ${iGa(noun)} 너무 많이 섞였어요`;
    case "good":
      return `비슷한 ${noun}끼리 잘 모였어요`;
    case "split":
      return `비슷한 ${iGa(noun)} 여러 그룹으로 너무 잘게 나뉘었어요`;
  }
}

export const JUDGMENT_ICON: Record<Judgment, string> = { wide: "🟥", good: "✅", split: "🧩" };

export interface SavedTrial {
  k: number;
  judgment: Judgment;
  mode: TrialMode;
  /** 학생이 처음 묶은 그룹 (점 순서대로). 자동이면 최종 결과와 같다 */
  initial: number[];
  final: number[];
  meanDistance: number;
  maxRadius: number;
}

export async function loadKTrials(session: StudentSession): Promise<SavedTrial[]> {
  const { data, error } = await getSupabase("student")
    .from("k_trials")
    .select("k, judgment, mode, initial_groups, final_groups, mean_distance, max_radius")
    .eq("student_id", session.studentId)
    .order("k");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    k: r.k,
    judgment: r.judgment as Judgment,
    mode: (r.mode as TrialMode) ?? "manual",
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
    p_mode: t.mode,
  });
  if (error) throw error;
}
