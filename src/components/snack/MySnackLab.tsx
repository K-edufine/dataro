"use client";

import { useEffect, useState } from "react";
import { KLab } from "./KLab";
import { LinkButton } from "@/components/ui/Button";
import { LessonGate } from "@/components/student/LessonGate";
import { loadKTrials, type SavedTrial } from "@/lib/k-trials";
import { loadMySnacks } from "@/lib/snack-db";
import type { StudentSession } from "@/lib/student-session";
import type { Snack } from "@/types/snack";

/** 5차시: 4차시에 저장한 선호도로 K=2→3→4→5를 직접 묶어 보며 알맞은 K를 판단한다. */
export function MySnackLab() {
  return <LessonGate lessons={[5]}>{(session) => <Loader session={session} />}</LessonGate>;
}

function Loader({ session }: { session: StudentSession }) {
  const [data, setData] = useState<{ snacks: Snack[]; trials: SavedTrial[] } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      loadMySnacks(session),
      loadKTrials(session).catch(() => [] as SavedTrial[]), // 판단 기록을 못 불러와도 처음부터 할 수 있다
    ])
      .then(([snacks, trials]) => alive && setData({ snacks, trials }))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [session]);

  if (failed) return <Message>데이터를 불러오지 못했어요. 잠시 뒤에 다시 해 봐요.</Message>;
  if (!data) return <Message>불러오는 중…</Message>;
  if (data.snacks.length < 5) {
    return (
      <Message>
        <p>아직 선호도를 입력하지 않았어요.</p>
        <LinkButton href="/snack/input">4차시에서 선호도 입력하기</LinkButton>
        <LinkButton href="/student" variant="ghost">차시 선택으로</LinkButton>
      </Message>
    );
  }
  return (
    <KLab
      session={session}
      snacks={data.snacks}
      saved={data.trials}
      title={`내 간식 군집 분석 (${session.anonCode})`}
    />
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-6 text-center text-2xl font-bold">
      {children}
    </main>
  );
}
