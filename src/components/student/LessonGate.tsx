"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LinkButton } from "@/components/ui/Button";
import { JoinForm } from "./JoinForm";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useStudentSession, type StudentSession } from "@/lib/student-session";
import { useOpenLessons } from "@/lib/use-open-lessons";

/**
 * 학급에 입장했고, 지정한 차시 중 하나가 열려 있을 때만 children 을 보여 준다.
 * (진짜 보안은 DB 의 RLS 와 함수가 지킨다. 여기는 안내용 화면이다.)
 */
export function LessonGate({
  lessons, children,
}: { lessons: number[]; children: (session: StudentSession) => ReactNode }) {
  const { session, hydrated } = useStudentSession();
  const open = useOpenLessons(session);

  if (!hydrated) return <Center>불러오는 중…</Center>;

  if (!isSupabaseConfigured) {
    return (
      <Center>
        <p className="text-xl font-bold text-rose-700">아직 서버 설정이 끝나지 않았어요. 선생님께 알려 주세요.</p>
      </Center>
    );
  }

  if (!session) {
    return (
      <Center>
        <h1 className="text-3xl font-extrabold">먼저 학급에 들어가요</h1>
        <JoinForm />
        <Link href="/" className="text-base font-bold text-sky-700 underline">← 처음으로</Link>
      </Center>
    );
  }

  if (open === null) return <Center>불러오는 중…</Center>;

  if (!lessons.some((n) => open.includes(n))) {
    return (
      <Center>
        <div className="text-6xl" aria-hidden>🔒</div>
        <h1 className="text-3xl font-extrabold">아직 열리지 않았어요</h1>
        <p className="text-xl text-slate-700">선생님이 열어 주면 시작할 수 있어요.</p>
        <LinkButton href="/student">내 화면으로</LinkButton>
      </Center>
    );
  }

  return <>{children(session)}</>;
}

function Center({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-6 text-center text-xl">
      {children}
    </main>
  );
}
