"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { clearStudentSession, type StudentSession } from "@/lib/student-session";

const POLL_MS = 10_000;

/** 선생님이 열어 둔 차시 목록. 10초마다, 그리고 화면으로 돌아올 때마다 새로 읽는다. */
export function useOpenLessons(session: StudentSession | null): number[] | null {
  const [open, setOpen] = useState<number[] | null>(null);
  const classId = session?.classId;

  useEffect(() => {
    if (!classId) return;
    let alive = true;
    async function load() {
      try {
        const { data, error } = await getSupabase("student")
          .from("classes").select("open_lessons").eq("id", classId).maybeSingle();
        if (!alive) return;
        if (error) return; // 일시적인 오류는 무시하고 다음에 다시
        if (!data) clearStudentSession(); // 학급이 없어졌거나 로그인이 사라짐
        else setOpen(data.open_lessons);
      } catch {
        /* 설정이 없으면 게이트가 따로 안내한다 */
      }
    }
    load();
    const timer = setInterval(load, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [classId]);

  return classId ? open : null;
}
