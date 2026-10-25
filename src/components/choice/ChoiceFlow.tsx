"use client";

import { useEffect, useState } from "react";
import { BackLink } from "@/components/ui/BackLink";
import { Button, LinkButton } from "@/components/ui/Button";
import { LessonGate } from "@/components/student/LessonGate";
import { AmountPicker } from "./AmountPicker";
import { ChoiceBar, ChoiceLegend } from "./ChoiceBars";
import { useMyClusterData } from "./useMyClusterData";
import { SCENARIO, STEP, TOTAL, describeChange } from "@/lib/choices";
import { loadMyChoices, saveChoice, type Choice } from "@/lib/choice-db";
import { CLUSTER_TYPE_LABEL } from "@/lib/cluster-types";
import type { MyCluster } from "@/lib/my-cluster";
import type { StudentSession } from "@/lib/student-session";

type Stage = "first" | "info" | "second" | "done";

/** 8차시: 1차 선택 → 내 그룹 안내와 학습지 읽기 → 2차 선택 → 결과 */
export function ChoiceFlow() {
  return <LessonGate lessons={[8]}>{(session) => <Loader session={session} />}</LessonGate>;
}

function Loader({ session }: { session: StudentSession }) {
  const [choices, setChoices] = useState<Record<number, Choice> | null>(null);
  const [failed, setFailed] = useState(false);
  const cluster = useMyClusterData(session);

  useEffect(() => {
    let alive = true;
    loadMyChoices(session)
      .then((c) => alive && setChoices(c))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [session]);

  if (failed) return <Message>데이터를 불러오지 못했어요. 잠시 뒤에 다시 해 봐요.</Message>;
  if (!choices || cluster === undefined) return <Message>불러오는 중…</Message>;
  return <Flow session={session} saved={choices} mine={cluster?.mine ?? null} />;
}

function Flow({ session, saved, mine }: { session: StudentSession; saved: Record<number, Choice>; mine: MyCluster | null }) {
  const [choices, setChoices] = useState(saved);
  const [stage, setStage] = useState<Stage>(saved[2] ? "done" : saved[1] ? "info" : "first");
  const [first, setFirst] = useState(saved[1]?.consume ?? TOTAL / 2);
  const [firstReason, setFirstReason] = useState(saved[1]?.reason ?? "");
  const [second, setSecond] = useState(saved[2]?.consume ?? saved[1]?.consume ?? TOTAL / 2);
  const [secondReason, setSecondReason] = useState(saved[2]?.reason ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(round: 1 | 2) {
    const consume = round === 1 ? first : second;
    const reason = (round === 1 ? firstReason : secondReason).trim();
    setSaving(true);
    setError("");
    try {
      await saveChoice(session, round, TOTAL, consume, reason);
      setChoices({ ...choices, [round]: { round, total: TOTAL, consume, reason } });
      // 2차 선택은 1차 선택 값에서 시작한다 (아직 2차를 저장하기 전이라면)
      if (round === 1 && !choices[2]) setSecond(consume);
      setStage(round === 1 ? "info" : "done");
    } catch {
      setError("저장하지 못했어요. 선생님이 8차시를 열었는지 확인하고 다시 눌러 봐요.");
    } finally {
      setSaving(false);
    }
  }

  const reasonBox = (value: string, onChange: (v: string) => void) => (
    <label className="block space-y-1">
      <span className="text-lg font-bold">왜 그렇게 정했나요? <span className="font-normal text-slate-500">(쓰지 않아도 돼요)</span></span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={60}
        rows={2}
        className="w-full rounded-2xl border-2 border-slate-300 p-3 text-lg focus:border-sky-600 focus:outline-none"
      />
      <span className="block text-right text-sm text-slate-500">{value.length}/60</span>
    </label>
  );

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <header>
        <BackLink />
        <h1 className="text-3xl font-extrabold">용돈 선택 ({session.anonCode})</h1>
        <p className="mt-1 text-2xl font-bold text-sky-800">{SCENARIO.title}</p>
      </header>

      {stage === "first" && (
        <section className="space-y-4" aria-label="1차 선택">
          <p className="rounded-3xl bg-amber-50 p-4 text-xl font-bold">① 1차 선택: 내 생각대로 정해 보세요.</p>
          <AmountPicker total={TOTAL} step={STEP} value={first} onChange={setFirst} />
          {reasonBox(firstReason, setFirstReason)}
          {error && <p className="text-lg font-bold text-rose-600" role="alert">{error}</p>}
          <Button className="w-full text-xl" disabled={saving} onClick={() => save(1)}>
            {saving ? "저장하는 중…" : "1차 선택 저장하기 ▶"}
          </Button>
        </section>
      )}

      {stage === "info" && (
        <section className="space-y-4" aria-label="내 그룹 안내">
          <ChoiceBar label="나의 1차 선택" total={TOTAL} consume={choices[1].consume} />
          <ChoiceLegend />
          <div className="space-y-2 rounded-3xl border-4 border-sky-600 bg-white p-5">
            {mine ? (
              <>
                <p className="text-2xl font-extrabold">
                  컴퓨터가 나를 <span className="text-sky-700">‘{mine.name}’</span> 그룹으로 보았어요.
                </p>
                <p className="text-lg text-slate-600">{CLUSTER_TYPE_LABEL[mine.type]} 그룹</p>
                <p className="text-xl font-bold">선생님께 이 그룹의 학습지를 받아 읽어요. 📄</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-extrabold">컴퓨터가 나를 아직 어느 그룹에도 넣지 않았어요.</p>
                <p className="text-lg text-slate-600">6차시 설문을 하지 않았거나, 선생님이 결과를 정한 뒤에 설문했을 수 있어요. 선생님께 물어봐요.</p>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setStage("first")}>← 1차 다시 고르기</Button>
            <Button className="min-w-48 flex-1 text-xl" onClick={() => setStage("second")}>다 읽었어요 ▶</Button>
          </div>
        </section>
      )}

      {stage === "second" && (
        <section className="space-y-4" aria-label="2차 선택">
          <p className="rounded-3xl bg-amber-50 p-4 text-xl font-bold">② 2차 선택: 학습지를 읽은 뒤 다시 정해 보세요. 그대로여도 괜찮아요.</p>
          <AmountPicker
            total={TOTAL} step={STEP} value={second} onChange={setSecond}
            reference={{ label: "나의 1차 선택", consume: choices[1].consume }}
          />
          {reasonBox(secondReason, setSecondReason)}
          {error && <p className="text-lg font-bold text-rose-600" role="alert">{error}</p>}
          <Button className="w-full text-xl" disabled={saving} onClick={() => save(2)}>
            {saving ? "저장하는 중…" : "2차 선택 저장하기 ▶"}
          </Button>
        </section>
      )}

      {stage === "done" && choices[1] && choices[2] && (
        <section className="space-y-4" aria-label="결과">
          <p className="rounded-3xl bg-emerald-50 p-4 text-xl font-bold">1차, 2차 선택을 모두 저장했어요! 🎉</p>
          <ChoiceBar label="1차 선택" total={TOTAL} consume={choices[1].consume} />
          <ChoiceBar label="2차 선택" total={TOTAL} consume={choices[2].consume} />
          <ChoiceLegend />
          <p className="text-2xl font-extrabold">{describeChange(choices[1].consume, choices[2].consume)}.</p>
          <p className="text-lg text-slate-600">9차시에서 이 선택이 왜 달라졌는지 함께 생각해 봐요.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setStage("second")}>2차 다시 고르기</Button>
            <LinkButton href="/student">차시 선택으로</LinkButton>
          </div>
        </section>
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
