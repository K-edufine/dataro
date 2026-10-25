"use client";

import { useEffect, useState } from "react";
import { BackLink } from "@/components/ui/BackLink";
import { Button, LinkButton } from "@/components/ui/Button";
import { LessonGate } from "@/components/student/LessonGate";
import { ChoiceBar, ChoiceLegend } from "./ChoiceBars";
import { useMyClusterData, type MyClusterData } from "./useMyClusterData";
import { CRITICAL_QUESTIONS, KIND_TEXT, TOTAL, classifyMovement, describeChange } from "@/lib/choices";
import {
  loadMyChoices, loadMyReflection, saveMyReflection, type Choice, type Reflection,
} from "@/lib/choice-db";
import { CLUSTER_TYPE_LABEL } from "@/lib/cluster-types";
import type { StudentSession } from "@/lib/student-session";

const STEPS = ["내 선택 비교", "다른 그룹 정보", "내 생각 쓰기", "마무리"];
const AGREE_LABEL = ["", "전혀 아니에요", "아니에요", "보통이에요", "맞아요", "정말 맞아요"];

/** 9차시: 1·2차 비교 → 다른 그룹 학습지 읽기 → 컴퓨터 결과와 나의 생각 → 마무리 */
export function ReflectFlow() {
  return <LessonGate lessons={[9]}>{(session) => <Loader session={session} />}</LessonGate>;
}

function Loader({ session }: { session: StudentSession }) {
  const [data, setData] = useState<{ choices: Record<number, Choice>; reflection: Reflection | null } | null>(null);
  const [failed, setFailed] = useState(false);
  const cluster = useMyClusterData(session);

  useEffect(() => {
    let alive = true;
    Promise.all([loadMyChoices(session), loadMyReflection(session).catch(() => null)])
      .then(([choices, reflection]) => alive && setData({ choices, reflection }))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [session]);

  if (failed) return <Message>데이터를 불러오지 못했어요. 잠시 뒤에 다시 해 봐요.</Message>;
  if (!data || cluster === undefined) return <Message>불러오는 중…</Message>;
  if (!data.choices[1] || !data.choices[2]) {
    return (
      <Message>
        <p>8차시에서 1차, 2차 선택을 먼저 해요.</p>
        <LinkButton href="/tendency/choice">용돈 선택하러 가기</LinkButton>
        <LinkButton href="/student" variant="ghost">차시 선택으로</LinkButton>
      </Message>
    );
  }
  return <Flow session={session} choices={data.choices} saved={data.reflection} cluster={cluster} />;
}

function Flow({
  session, choices, saved, cluster,
}: { session: StudentSession; choices: Record<number, Choice>; saved: Reflection | null; cluster: MyClusterData | null }) {
  const mine = cluster?.mine ?? null;
  const others = cluster?.others ?? [];
  const [step, setStep] = useState(0);
  const [read, setRead] = useState<Record<number, boolean>>({});
  const [agree, setAgree] = useState(saved?.agree ?? 0);
  const [reason, setReason] = useState(saved?.reason ?? "");
  const [unknownMe, setUnknownMe] = useState(saved?.unknownMe ?? "");
  const [criticalNote, setCriticalNote] = useState(saved?.criticalNote ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const c1 = choices[1];
  const c2 = choices[2];
  const canSave = agree > 0 && reason.trim().length > 0 && unknownMe.trim().length > 0;

  async function save() {
    setSaving(true);
    setError("");
    try {
      await saveMyReflection(session, { agree, reason: reason.trim(), unknownMe: unknownMe.trim(), criticalNote: criticalNote.trim() });
      setStep(3);
    } catch {
      setError("저장하지 못했어요. 선생님이 9차시를 열었는지 확인하고 다시 눌러 봐요.");
    } finally {
      setSaving(false);
    }
  }

  const textArea = (label: string, value: string, set: (v: string) => void, hint?: string) => (
    <label className="block space-y-1">
      <span className="text-lg font-bold">{label}</span>
      {hint && <span className="block text-base text-slate-500">{hint}</span>}
      <textarea
        value={value}
        onChange={(e) => set(e.target.value)}
        maxLength={200}
        rows={3}
        className="w-full rounded-2xl border-2 border-slate-300 p-3 text-lg focus:border-sky-600 focus:outline-none"
      />
      <span className="block text-right text-sm text-slate-500">{value.length}/200</span>
    </label>
  );

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <header>
        <BackLink />
        <h1 className="text-3xl font-extrabold">나의 선택 돌아보기 ({session.anonCode})</h1>
        <ol className="mt-3 flex flex-wrap gap-2" aria-label="진행 순서">
          {STEPS.map((s, i) => (
            <li
              key={s}
              aria-current={i === step}
              className={`rounded-full px-4 py-2 text-base font-extrabold ${
                i === step ? "bg-sky-600 text-white" : i < step ? "bg-emerald-100" : "bg-slate-100 text-slate-500"
              }`}
            >
              {i + 1}. {s}
            </li>
          ))}
        </ol>
      </header>

      {step === 0 && (
        <section className="space-y-4" aria-label="내 선택 비교">
          <ChoiceBar label="1차 선택 (학습지를 읽기 전)" total={TOTAL} consume={c1.consume} />
          <ChoiceBar label="2차 선택 (학습지를 읽은 뒤)" total={TOTAL} consume={c2.consume} />
          <ChoiceLegend />
          <p className="text-2xl font-extrabold">{describeChange(c1.consume, c2.consume)}.</p>
          {mine && (
            <div className="space-y-1 rounded-3xl bg-sky-50 p-4 text-lg">
              <p>컴퓨터는 나를 <b>‘{mine.name}’</b> ({CLUSTER_TYPE_LABEL[mine.type]}) 그룹으로 보았어요.</p>
              <p className="font-bold">{KIND_TEXT[classifyMovement(mine.direction, c1.consume, c2.consume)]}</p>
            </div>
          )}
          {(c1.reason || c2.reason) && (
            <ul className="space-y-1 text-lg text-slate-700">
              {c1.reason && <li>1차 이유: {c1.reason}</li>}
              {c2.reason && <li>2차 이유: {c2.reason}</li>}
            </ul>
          )}
          <p className="text-xl font-bold">정보를 읽고 나서 내 선택이 달라졌나요? 왜 그랬는지 생각해 봐요.</p>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-4" aria-label="다른 그룹 정보">
          <p className="rounded-3xl bg-amber-50 p-4 text-xl font-bold leading-relaxed">
            컴퓨터는 나에게 맞는 정보만 골라서 보여 줬어요. 이번에는 <span className="text-sky-700">나에게 보여 주지 않았던 다른 그룹의 정보</span>를 읽어 봐요.
            선생님께 학습지를 받아요. 📄
          </p>
          {others.length === 0 ? (
            <p className="text-lg text-slate-600">다른 그룹 정보를 찾지 못했어요. 선생님께 학습지를 받아 읽어요.</p>
          ) : (
            <ul className="space-y-2">
              {others.map((o) => (
                <li key={o.group}>
                  <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-3xl border-2 border-slate-200 bg-white p-3 text-xl font-bold">
                    <input
                      type="checkbox" className="size-7"
                      checked={!!read[o.group]}
                      onChange={(e) => setRead({ ...read, [o.group]: e.target.checked })}
                    />
                    <span>‘{o.name}’ 그룹 학습지 <span className="text-base font-normal text-slate-500">({CLUSTER_TYPE_LABEL[o.type]})</span></span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xl font-bold">읽고 나니 어떤 생각이 들었나요? 내가 받은 정보와 무엇이 달랐나요?</p>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-5" aria-label="컴퓨터 결과와 나의 생각">
          <p className="rounded-3xl bg-amber-50 p-4 text-xl font-bold">
            {mine
              ? <>컴퓨터는 나를 <span className="text-sky-700">‘{mine.name}’</span> 그룹으로 나눴어요.</>
              : "컴퓨터가 나눈 결과와 나의 생각을 비교해 봐요."}
          </p>
          <div className="space-y-2">
            <p className="text-lg font-bold">컴퓨터가 나를 이렇게 나눈 것에 얼마나 동의하나요?</p>
            <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="동의 정도">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  role="radio"
                  aria-checked={agree === n}
                  aria-label={`${n}점, ${AGREE_LABEL[n]}`}
                  onClick={() => setAgree(n)}
                  className={`flex min-h-20 flex-col items-center justify-center rounded-2xl border-4 transition active:scale-95 ${
                    agree === n ? "border-sky-600 bg-sky-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <span className={`text-4xl ${n <= agree ? "text-amber-500" : "text-slate-300"}`}>★</span>
                  <span className="text-xl font-extrabold">{n}</span>
                </button>
              ))}
            </div>
            {agree > 0 && <p className="text-center text-lg font-bold text-slate-600">{AGREE_LABEL[agree]}</p>}
          </div>
          {textArea("그렇게 생각한 이유는 무엇인가요?", reason, setReason)}
          {textArea("컴퓨터가 모르는 나의 모습은 무엇인가요?", unknownMe, setUnknownMe, "컴퓨터는 설문 점수만 알아요. 점수에 나타나지 않는 나를 써 봐요.")}
          {textArea("내가 받은 정보 중 한쪽 이야기만 한 것 같은 부분이 있었나요? (쓰지 않아도 돼요)", criticalNote, setCriticalNote)}
          {error && <p className="text-lg font-bold text-rose-600" role="alert">{error}</p>}
          <Button className="w-full text-xl" disabled={!canSave || saving} onClick={save}>
            {saving ? "저장하는 중…" : canSave ? "내 생각 저장하기 ▶" : "별, 이유, 컴퓨터가 모르는 나를 써 주세요"}
          </Button>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4" aria-label="마무리">
          <p className="rounded-3xl bg-emerald-50 p-4 text-xl font-bold">내 생각을 저장했어요! 🎉</p>
          <div className="space-y-3 rounded-3xl border-4 border-sky-600 bg-white p-5">
            <h2 className="text-2xl font-extrabold">정보는 이렇게 받아들여요</h2>
            <ul className="space-y-2 text-xl font-bold">
              {CRITICAL_QUESTIONS.map((q) => <li key={q}>🔎 {q}</li>)}
            </ul>
            <p className="text-lg text-slate-600">컴퓨터가 골라 준 정보라도, 그대로 믿기 전에 스스로 물어봐요.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setStep(2)}>내 생각 고치기</Button>
            <LinkButton href="/student">차시 선택으로</LinkButton>
          </div>
        </section>
      )}

      {step < 3 && (
        <div className="flex justify-between gap-2">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>← 이전</Button>
          {step < 2 && <Button onClick={() => setStep(step + 1)}>다음 ▶</Button>}
        </div>
      )}
    </main>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-6 text-center text-2xl font-bold">
      {children}
    </main>
  );
}
