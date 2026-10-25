import { getSupabase, type Role } from "@/lib/supabase/client";
import type { StudentSession } from "@/lib/student-session";

export interface Choice {
  round: number;
  total: number;
  consume: number;
  reason: string;
}

export interface Reflection {
  agree: number;
  reason: string;
  unknownMe: string;
  criticalNote: string;
}

/** 내 선택 (라운드 → 선택) */
export async function loadMyChoices(session: StudentSession): Promise<Record<number, Choice>> {
  const { data, error } = await getSupabase("student")
    .from("choices").select("round, total_amount, consume_amount, reason").eq("student_id", session.studentId);
  if (error) throw error;
  const out: Record<number, Choice> = {};
  for (const r of data ?? []) out[r.round] = { round: r.round, total: r.total_amount, consume: r.consume_amount, reason: r.reason };
  return out;
}

export async function saveChoice(session: StudentSession, round: number, total: number, consume: number, reason: string): Promise<void> {
  const { error } = await getSupabase("student").rpc("save_choice", {
    p_class_id: session.classId, p_round: round, p_total: total, p_consume: consume, p_reason: reason,
  });
  if (error) throw error;
}

export async function loadMyReflection(session: StudentSession): Promise<Reflection | null> {
  const { data, error } = await getSupabase("student")
    .from("ai_reflections").select("agree, reason, unknown_me, critical_note").eq("student_id", session.studentId).maybeSingle();
  if (error) throw error;
  return data ? { agree: data.agree, reason: data.reason, unknownMe: data.unknown_me, criticalNote: data.critical_note } : null;
}

export async function saveMyReflection(session: StudentSession, r: Reflection): Promise<void> {
  const { error } = await getSupabase("student").rpc("save_ai_reflection", {
    p_class_id: session.classId, p_agree: r.agree, p_reason: r.reason, p_unknown_me: r.unknownMe, p_critical_note: r.criticalNote,
  });
  if (error) throw error;
}

/** 교사: 학급 전체 선택·성찰 (student_id 로 학생과 연결) */
export async function fetchClassChoices(role: Role, classId: string) {
  const db = getSupabase(role);
  const [c, r] = await Promise.all([
    db.from("choices").select("student_id, round, total_amount, consume_amount, reason").eq("class_id", classId),
    db.from("ai_reflections").select("student_id, agree, reason, unknown_me, critical_note").eq("class_id", classId),
  ]);
  if (c.error) throw c.error;
  if (r.error) throw r.error;
  return {
    choices: (c.data ?? []).map((x) => ({ studentId: x.student_id as string, round: x.round as number, total: x.total_amount as number, consume: x.consume_amount as number, reason: x.reason as string })),
    reflections: (r.data ?? []).map((x) => ({ studentId: x.student_id as string, agree: x.agree as number, reason: x.reason as string, unknownMe: x.unknown_me as string, criticalNote: x.critical_note as string })),
  };
}
