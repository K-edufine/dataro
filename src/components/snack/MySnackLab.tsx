"use client";

import { useEffect, useState } from "react";
import { KAnalysis } from "./KAnalysis";
import { LinkButton } from "@/components/ui/Button";
import { LessonGate } from "@/components/student/LessonGate";
import { loadMySnacks } from "@/lib/snack-db";
import type { StudentSession } from "@/lib/student-session";
import type { Snack } from "@/types/snack";

/** 5차시: 4차시에 저장한 선호도로 군집을 분석한다. */
export function MySnackLab() {
  return <LessonGate lessons={[5]}>{(session) => <Loader session={session} />}</LessonGate>;
}

function Loader({ session }: { session: StudentSession }) {
  const [snacks, setSnacks] = useState<Snack[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    loadMySnacks(session)
      .then((s) => alive && setSnacks(s))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [session]);

  if (failed) return <Message>데이터를 불러오지 못했어요. 잠시 뒤에 다시 해 봐요.</Message>;
  if (!snacks) return <Message>불러오는 중…</Message>;
  if (snacks.length === 0) {
    return (
      <Message>
        <p>아직 선호도를 입력하지 않았어요.</p>
        <LinkButton href="/snack/input">4차시에서 선호도 입력하기</LinkButton>
        <LinkButton href="/student" variant="ghost">차시 선택으로</LinkButton>
      </Message>
    );
  }
  return <KAnalysis snacks={snacks} gradeBand={session.gradeBand} title={`내 간식 군집 분석 (${session.anonCode})`} />;
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-6 text-center text-2xl font-bold">
      {children}
    </main>
  );
}
