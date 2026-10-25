import { getSupabase, type Role } from "@/lib/supabase/client";
import type { ClimateRow } from "@/lib/climate";
import type { StudentSession } from "@/lib/student-session";

/** 내가 저장한 기후 데이터 (입력한 순서대로) */
export async function loadMyClimate(session: StudentSession): Promise<ClimateRow[]> {
  const { data, error } = await getSupabase("student")
    .from("climate_data").select("country, city, temp, rain, sort_order")
    .eq("student_id", session.studentId).order("sort_order");
  if (error) throw error;
  return (data ?? []).map((r) => ({ country: r.country, city: r.city, temp: Number(r.temp), rain: Number(r.rain) }));
}

/** 모두 채운 행만 서버에 저장한다 (통째로 교체) */
export async function saveMyClimate(session: StudentSession, rows: ClimateRow[]): Promise<void> {
  const { error } = await getSupabase("student").rpc("save_my_climate", { p_class_id: session.classId, p_rows: rows });
  if (error) throw error;
}

export interface ClassClimate {
  studentId: string;
  sortOrder: number;
  country: string;
  city: string;
  temp: number;
  rain: number;
}

/** 교사: 학급 학생들이 입력한 기후 데이터 전체 */
export async function fetchClassClimate(role: Role, classId: string): Promise<ClassClimate[]> {
  const { data, error } = await getSupabase(role)
    .from("climate_data").select("student_id, sort_order, country, city, temp, rain").eq("class_id", classId);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    studentId: r.student_id as string, sortOrder: r.sort_order as number,
    country: r.country as string, city: r.city as string, temp: Number(r.temp), rain: Number(r.rain),
  }));
}
