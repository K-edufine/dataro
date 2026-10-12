"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClassCodeForm } from "@/components/student/ClassCodeForm";
import { LinkButton } from "@/components/ui/Button";
import { useStudentSession } from "@/lib/student-session";

export default function Home() {
  const router = useRouter();
  const { session } = useStudentSession();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 p-6 text-center">
      <h1 className="text-5xl font-extrabold">데이터 시민 탐험</h1>
      <p className="text-xl text-slate-700">점들을 모아 비슷한 친구끼리 묶어 보는 K-평균 군집화를 체험해요.</p>

      {session && (
        <div className="w-full rounded-3xl bg-sky-50 p-5">
          <p className="mb-3 text-xl font-bold">
            {session.className}에 <span className="text-sky-700">{session.anonCode}</span>(으)로 들어와 있어요.
          </p>
          <LinkButton href="/student" className="w-full text-2xl">이어서 하기</LinkButton>
        </div>
      )}

      <ClassCodeForm onJoined={() => router.push("/student")} />

      <div className="flex flex-col items-center gap-3">
        <LinkButton href="/snack/common" variant="ghost">🍪 학급 코드 없이 공통 간식 체험하기</LinkButton>
        <Link href="/teacher" className="text-base font-bold text-slate-500 underline">선생님 로그인</Link>
      </div>
    </main>
  );
}
