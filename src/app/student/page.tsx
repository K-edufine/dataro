"use client";

import Link from "next/link";
import { LinkButton } from "@/components/ui/Button";
import { MODE_LABEL, lessonsFor } from "@/lib/lessons";
import { clearStudentSession, sessionLabel, useStudentSession } from "@/lib/student-session";
import { useOpenLessons } from "@/lib/use-open-lessons";
import { useMySurvey } from "@/lib/use-my-survey";

export default function StudentHome() {
  const { session, hydrated } = useStudentSession();
  const open = useOpenLessons(session);
  const { loaded: surveyLoaded, survey } = useMySurvey(session);

  if (!hydrated) return <main className="p-6 text-xl">불러오는 중…</main>;
  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-6 text-center">
        <p className="text-2xl font-bold">먼저 학교와 내 번호를 골라요.</p>
        <LinkButton href="/">입장하러 가기</LinkButton>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <header className="mb-6 rounded-3xl bg-sky-50 p-5">
        <p className="text-lg text-slate-600">{sessionLabel(session)}</p>
        <h1 className="text-3xl font-extrabold">
          나는 <span className="text-sky-700">{session.anonCode}</span> 이에요
        </h1>
        <p className="mt-1 text-base text-slate-600">이름은 저장하지 않아요. 친구들에게는 이 번호표만 보여요.</p>
      </header>

      <ul className="space-y-3">
        {lessonsFor(session.gradeBand).map((l) => {
          const isOpen = open?.includes(l.n) ?? false;
          const canGo = isOpen && l.href;
          const status = open === null ? "…" : !isOpen ? "🔒 아직 닫혀 있어요" : l.href ? "열려 있어요" : "곧 만들어져요";
          const body = (
            <>
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-2xl font-extrabold">{l.n}</span>
              <span className="flex-1 text-left">
                <span className="block text-sm text-slate-600">{l.n}차시 · {MODE_LABEL[l.mode]}</span>
                <span className="block text-xl font-extrabold">{l.title}</span>
                {session.gradeBand === "low" && l.n === 6 && surveyLoaded && (
                  <span className="mt-0.5 block text-base font-bold text-slate-700">
                    {survey ? `내 점수: 소비 ${Math.round(survey.consume)} · 저축 ${Math.round(survey.save)}` : "아직 설문을 안 했어요"}
                  </span>
                )}
              </span>
              <span className="text-base font-bold">{status}</span>
            </>
          );
          return (
            <li key={l.n}>
              {canGo ? (
                <Link href={l.href!} className="flex min-h-20 items-center gap-4 rounded-3xl bg-amber-300 p-3 shadow-md transition active:scale-[0.98]">
                  {body}
                </Link>
              ) : (
                <div className="flex min-h-20 items-center gap-4 rounded-3xl bg-slate-100 p-3 text-slate-500" aria-disabled>{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex flex-wrap gap-3">
        <LinkButton href="/" variant="ghost">처음 화면</LinkButton>
        <button onClick={clearStudentSession} className="min-h-14 rounded-2xl px-4 text-base font-bold text-slate-500 underline">
          다른 번호로 들어가기
        </button>
      </div>
    </main>
  );
}
