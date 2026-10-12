"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { StudentSession } from "@/lib/student-session";

export interface MySurvey {
  answers: number[];
  consume: number;
  save: number;
}

/** 내가 제출한 설문. 아직 안 했으면 survey 가 null, 불러오는 중이면 loaded 가 false. */
export function useMySurvey(session: StudentSession | null): { loaded: boolean; survey: MySurvey | null } {
  const [state, setState] = useState<{ studentId: string; survey: MySurvey | null } | null>(null);
  const studentId = session?.studentId;

  useEffect(() => {
    if (!studentId) return;
    let alive = true;
    Promise.resolve(
      getSupabase("student")
        .from("survey_responses").select("answers, consume_score, save_score").eq("student_id", studentId).maybeSingle(),
    )
      .then(({ data }) => {
        if (!alive) return;
        setState({
          studentId,
          survey: data
            ? { answers: data.answers, consume: Number(data.consume_score), save: Number(data.save_score) }
            : null,
        });
      })
      .catch(() => alive && setState({ studentId, survey: null }));
    return () => {
      alive = false;
    };
  }, [studentId]);

  const loaded = !!studentId && state?.studentId === studentId;
  return { loaded, survey: loaded ? state!.survey : null };
}
