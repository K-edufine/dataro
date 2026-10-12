"use client";

import { useEffect, useState } from "react";
import { SnackLab } from "./SnackLab";
import { LinkButton } from "@/components/ui/Button";
import { LessonGate } from "@/components/student/LessonGate";
import { loadMySnacks } from "@/lib/snack-db";
import type { StudentSession } from "@/lib/student-session";
import type { Snack } from "@/types/snack";

export function MySnackLab() {
  return <LessonGate lessons={[4, 5]}>{(session) => <Loader session={session} />}</LessonGate>;
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

  if (failed) return <Message>간식 데이터를 불러오지 못했어요. 잠시 뒤에 다시 해 봐요.</Message>;
  if (!snacks) return <Message>불러오는 중…</Message>;
  if (snacks.length === 0) {
    return (
      <Message>
        <p>아직 만든 간식 데이터가 없어요.</p>
        <LinkButton href="/snack/input">내 데이터 입력하기</LinkButton>
      </Message>
    );
  }
  return <SnackLab snacks={snacks} title={`내 간식 데이터 (${session.anonCode})`} />;
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-6 text-center text-2xl font-bold">
      {children}
    </main>
  );
}
