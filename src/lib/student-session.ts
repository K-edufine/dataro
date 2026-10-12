import { useSyncExternalStore } from "react";
import { errorCode, getSupabase } from "@/lib/supabase/client";

/** 학생이 입장한 학급 정보. 브라우저에 저장해 다음 차시에도 유지한다. 이름 등 개인정보는 없다. */
export interface StudentSession {
  classId: string;
  className: string;
  classCode: string;
  studentId: string;
  anonCode: string;
}

const KEY = "dataro.studentSession";
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function getRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): StudentSession | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    return s && typeof s.classId === "string" && typeof s.studentId === "string" ? (s as StudentSession) : null;
  } catch {
    return null;
  }
}

/** 첫 렌더(서버)에서는 읽을 수 없으므로 hydrated 로 구분한다. */
export function useStudentSession(): { session: StudentSession | null; hydrated: boolean } {
  const raw = useSyncExternalStore(subscribe, getRaw, () => null);
  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);
  return { session: parse(raw), hydrated };
}

export function clearStudentSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* 무시 */
  }
  emit();
}

const JOIN_MESSAGES: Record<string, string> = {
  class_not_found: "학급 코드를 찾을 수 없어요. 선생님께 코드를 다시 물어봐요.",
  not_configured: "아직 서버 설정이 끝나지 않았어요. 선생님께 알려 주세요.",
};

/** 학급 코드로 입장한다. 처음이면 익명 계정을 만들고, 다시 입장하면 같은 익명 코드를 돌려받는다. */
export async function joinClass(code: string): Promise<StudentSession> {
  try {
    const supabase = getSupabase("student");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
    }
    const { data: res, error } = await supabase.rpc("join_class", { p_code: code });
    if (error) throw error;
    const session: StudentSession = {
      classId: res.class_id,
      className: res.class_name,
      classCode: res.class_code,
      studentId: res.student_id,
      anonCode: res.anon_code,
    };
    localStorage.setItem(KEY, JSON.stringify(session));
    emit();
    return session;
  } catch (e) {
    throw new Error(JOIN_MESSAGES[errorCode(e)] ?? "입장하지 못했어요. 잠시 뒤에 다시 해 봐요.");
  }
}
