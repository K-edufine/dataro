import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export type Role = "student" | "teacher";

const clients: Partial<Record<Role, SupabaseClient>> = {};

/**
 * 학생(익명 로그인)과 교사(이메일 로그인)는 로그인 정보를 따로 저장한다.
 * 같은 기기에서 교사가 학생 화면을 확인해도 서로 로그아웃되지 않는다.
 */
export function getSupabase(role: Role): SupabaseClient {
  if (!url || !anonKey) throw new Error("not_configured");
  clients[role] ??= createClient(url, anonKey, {
    auth: { storageKey: `dataro-${role}-auth`, persistSession: true, autoRefreshToken: true },
  });
  return clients[role]!;
}

/** Supabase 함수에서 던진 오류 코드(예: class_not_found)를 꺼낸다 */
export function errorCode(err: unknown): string {
  const msg = (err as { message?: string } | null)?.message ?? "";
  return msg.trim();
}
