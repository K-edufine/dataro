import { useSyncExternalStore } from "react";
import { errorCode, getSupabase } from "@/lib/supabase/client";

/** 학생이 입장한 학급 정보. 브라우저에 저장해 다음 차시에도 유지한다. 이름은 저장하지 않고 번호만 쓴다. */
export interface StudentSession {
  classId: string;
  school: string;
  grade: number;
  classNo: number;
  gradeBand: "low" | "high";
  studentCount: number;
  studentId: string;
  /** 출석 번호 */
  number: number;
  /** s + 번호 (예: s8). 친구들에게 보이는 이름표 */
  anonCode: string;
}

/** 학교에 개설된 학급 (입장 전에 고르는 목록) */
export interface ListedClass {
  id: string;
  grade: number;
  class_no: number;
  student_count: number;
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
    return s && typeof s.classId === "string" && typeof s.studentId === "string" && typeof s.number === "number" ? (s as StudentSession) : null;
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
  class_not_found: "학급을 찾을 수 없어요. 선생님께 물어봐요.",
  invalid_number: "번호가 맞지 않아요. 다시 골라 봐요.",
  not_configured: "아직 서버 설정이 끝나지 않았어요. 선생님께 알려 주세요.",
};

/** 학교에 선생님이 열어 둔 학급 목록 (로그인 전에도 볼 수 있다) */
export async function listClasses(school: string): Promise<ListedClass[]> {
  const { data, error } = await getSupabase("student").rpc("list_classes", { p_school: school });
  if (error) throw new Error("학급 목록을 불러오지 못했어요. 잠시 뒤에 다시 해 봐요.");
  return (data ?? []) as ListedClass[];
}

/** 학급과 번호로 입장한다. 같은 번호로 다시 들어오면 같은 학생으로 이어진다. */
export async function joinClass(classId: string, number: number): Promise<StudentSession> {
  try {
    const supabase = getSupabase("student");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
    }
    const { data: res, error } = await supabase.rpc("join_class", { p_class_id: classId, p_number: number });
    if (error) throw error;
    const session: StudentSession = {
      classId: res.class_id,
      school: res.school,
      grade: res.grade,
      classNo: res.class_no,
      gradeBand: res.grade_band,
      studentCount: res.student_count,
      studentId: res.student_id,
      number: res.number,
      anonCode: res.anon_code,
    };
    localStorage.setItem(KEY, JSON.stringify(session));
    emit();
    return session;
  } catch (e) {
    throw new Error(JOIN_MESSAGES[errorCode(e)] ?? "입장하지 못했어요. 잠시 뒤에 다시 해 봐요.");
  }
}

/** 화면에 보일 "삼상초 3학년 1반 8번" */
export function sessionLabel(s: StudentSession): string {
  return `${s.school} ${s.grade}학년 ${s.classNo}반 ${s.number}번`;
}
