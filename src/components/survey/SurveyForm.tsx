"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, LinkButton } from "@/components/ui/Button";
import { LessonGate } from "@/components/student/LessonGate";
import { getSupabase } from "@/lib/supabase/client";
import { useMySurvey, type MySurvey } from "@/lib/use-my-survey";
import type { StudentSession } from "@/lib/student-session";
import { AXIS_MAX, AXIS_MIN, QUESTIONS, SCALE_LABELS, calcSurveyScores } from "@/lib/survey";

export function SurveyForm() {
  return <LessonGate lessons={[6]}>{(session) => <Loader session={session} />}</LessonGate>;
}

function Loader({ session }: { session: StudentSession }) {
  const { loaded, survey } = useMySurvey(session);
  if (!loaded) return <main className="p-6 text-xl">불러오는 중…</main>;
  return <Survey session={session} previous={survey} />;
}

function Survey({ session, previous }: { session: StudentSession; previous: MySurvey | null }) {
  const [answers, setAnswers] = useState<number[]>(() => previous?.answers ?? QUESTIONS.map(() => 0));
  const [index, setIndex] = useState(0);
  // 이미 제출한 학생은 결과 화면부터 보여 준다 (답 고치기 버튼으로 수정)
  const [done, setDone] = useState<{ consume: number; save: number } | null>(
    previous ? { consume: previous.consume, save: previous.save } : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const q = QUESTIONS[index];
  const answered = answers.filter((a) => a > 0).length;
  const last = index === QUESTIONS.length - 1;
  const allDone = answered === QUESTIONS.length;

  function pick(value: number) {
    setAnswers(answers.map((a, i) => (i === index ? value : a)));
    // 마지막 문항이 아니면 잠깐 뒤 다음 문항으로
    if (!last) setTimeout(() => setIndex((i) => Math.min(i + 1, QUESTIONS.length - 1)), 250);
  }

  async function submit() {
    setBusy(true);
    setError("");
    const { error: err } = await getSupabase("student").rpc("submit_survey", {
      p_class_id: session.classId,
      p_answers: answers,
    });
    setBusy(false);
    if (err) return setError("제출하지 못했어요. 선생님이 6차시를 열었는지 확인하고 다시 해 봐요.");
    setDone(calcSurveyScores(answers));
  }

  if (done) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="text-6xl" aria-hidden>🎉</div>
        <h1 className="text-3xl font-extrabold">설문을 마쳤어요!</h1>
        <div className="grid w-full grid-cols-2 gap-4">
          <div className="rounded-3xl bg-amber-100 p-5">
            <p className="text-lg font-bold">소비 점수</p>
            <p className="text-5xl font-extrabold">{Math.round(done.consume)}<span className="text-2xl font-bold">점</span></p>
            <p className="text-base text-slate-600">{AXIS_MIN}~{AXIS_MAX}점 중</p>
          </div>
          <div className="rounded-3xl bg-sky-100 p-5">
            <p className="text-lg font-bold">저축 점수</p>
            <p className="text-5xl font-extrabold">{Math.round(done.save)}<span className="text-2xl font-bold">점</span></p>
            <p className="text-base text-slate-600">{AXIS_MIN}~{AXIS_MAX}점 중</p>
          </div>
        </div>
        <p className="text-lg text-slate-700">점수가 높을수록 그런 마음이 커요. 맞고 틀린 답은 없어요. 7차시에서 친구들과 함께 살펴봐요.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="ghost" onClick={() => { setDone(null); setIndex(0); }}>답 고치기</Button>
          <LinkButton href="/student">내 화면으로</LinkButton>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-4 sm:p-6">
      <header>
        <Link href="/student" className="text-base font-bold text-sky-700 underline">← 내 화면</Link>
        <h1 className="text-2xl font-extrabold">소비·저축 설문 <span className="text-slate-500">({session.anonCode})</span></h1>
        <div className="mt-2 h-4 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={0} aria-valuemax={QUESTIONS.length} aria-valuenow={answered}>
          <div className="h-full bg-sky-600 transition-all" style={{ width: `${(answered / QUESTIONS.length) * 100}%` }} />
        </div>
        <p className="mt-1 text-base text-slate-600">{answered} / {QUESTIONS.length} 문항에 답했어요</p>
      </header>

      <section aria-live="polite" className="flex-1">
        <p className="mb-2 text-lg font-bold text-sky-700">질문 {index + 1}</p>
        <h2 className="mb-6 rounded-3xl bg-amber-50 p-6 text-3xl font-extrabold leading-snug">{q.text}</h2>
        <div className="grid gap-2 sm:gap-3" style={{ gridTemplateColumns: `repeat(${SCALE_LABELS.length}, minmax(0, 1fr))` }} role="radiogroup" aria-label="얼마나 그런가요?">
          {SCALE_LABELS.map((s) => {
            const on = answers[index] === s.value;
            return (
              <button
                key={s.value}
                role="radio"
                aria-checked={on}
                onClick={() => pick(s.value)}
                className={`flex min-h-32 flex-col items-center justify-center gap-1 rounded-3xl border-4 p-1 transition active:scale-95 ${
                  on ? "border-sky-600 bg-sky-100" : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <span className="text-4xl sm:text-5xl" aria-hidden>{s.emoji}</span>
                <span className="text-xl font-extrabold">{s.value}</span>
                <span className="text-sm font-bold sm:text-base">{s.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {error && <p className="text-lg font-bold text-rose-600" role="alert">{error}</p>}

      <footer className="flex items-center justify-between gap-3">
        <Button variant="ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}>← 이전</Button>
        {last ? (
          <Button disabled={!allDone || busy} onClick={submit}>{busy ? "제출하는 중…" : "다 했어요! 제출하기"}</Button>
        ) : (
          <Button variant="ghost" disabled={answers[index] === 0} onClick={() => setIndex(index + 1)}>다음 →</Button>
        )}
      </footer>
      {last && !allDone && <p className="text-center text-base font-bold text-rose-600">아직 답하지 않은 문항이 있어요. 이전 버튼으로 돌아가 봐요.</p>}
    </main>
  );
}
