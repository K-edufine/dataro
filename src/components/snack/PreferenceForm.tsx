"use client";

import { useEffect, useState } from "react";
import { BackLink } from "@/components/ui/BackLink";
import { Button, LinkButton } from "@/components/ui/Button";
import { LessonGate } from "@/components/student/LessonGate";
import { won } from "@/lib/format";
import { PREFERENCE_LABELS, lesson4Snacks } from "@/lib/snack-data";
import { loadMySnacks, saveMySnacks } from "@/lib/snack-db";
import type { StudentSession } from "@/lib/student-session";

/** 4차시: 간식 10개에 내 선호도(★1~5)를 입력한다. */
export function PreferenceForm() {
  return <LessonGate lessons={[4]}>{(session) => <Loader session={session} />}</LessonGate>;
}

function Loader({ session }: { session: StudentSession }) {
  const [saved, setSaved] = useState<number[] | null>(null);

  useEffect(() => {
    let alive = true;
    loadMySnacks(session)
      .then((rows) => {
        if (!alive) return;
        // 이미 저장한 선호도가 있으면 이름으로 찾아 채운다
        setSaved(lesson4Snacks.map((s) => Math.round(rows.find((r) => r.name === s.name)?.taste ?? 0)));
      })
      .catch(() => alive && setSaved(lesson4Snacks.map(() => 0))); // 못 불러오면 빈 입력칸으로 시작
    return () => {
      alive = false;
    };
  }, [session]);

  if (!saved) return <main className="p-6 text-xl">불러오는 중…</main>;
  return <Form session={session} initial={saved} />;
}

function Form({ session, initial }: { session: StudentSession; initial: number[] }) {
  const [prefs, setPrefs] = useState<number[]>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const answered = prefs.filter((p) => p > 0).length;
  const total = lesson4Snacks.length;
  const allDone = answered === total;

  async function save() {
    setSaving(true);
    setError("");
    try {
      await saveMySnacks(
        session,
        lesson4Snacks.map((s, i) => ({ id: s.id, name: s.name, price: s.price, taste: prefs[i] })),
      );
      setSaved(true);
    } catch {
      setError("저장하지 못했어요. 선생님이 4차시를 열었는지 확인하고 다시 해 봐요.");
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="text-6xl" aria-hidden>🎉</div>
        <h1 className="text-3xl font-extrabold">선호도를 저장했어요!</h1>
        <p className="text-xl text-slate-700">5차시에서 이 데이터로 군집을 분석해요.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="ghost" onClick={() => setSaved(false)}>답 고치기</Button>
          <LinkButton href="/student">차시 선택으로</LinkButton>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-4 pb-32 sm:p-6 sm:pb-32">
      <BackLink />
      <h1 className="mb-1 text-3xl font-extrabold">내 간식 선호도 ({session.anonCode})</h1>
      <p className="mb-4 text-lg text-slate-700">
        간식마다 내가 얼마나 좋아하는지 별(★)로 알려 줘요. 별 1개는 별로, 별 5개는 정말 좋아요!
      </p>

      <ol className="grid gap-3 sm:grid-cols-2">
        {lesson4Snacks.map((s, i) => (
          <li key={s.id} className="rounded-3xl border-2 border-slate-200 bg-white p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xl font-extrabold">{i + 1}. {s.name}</span>
              <span className="text-lg font-bold text-slate-600">{won(s.price)}</span>
            </div>
            <div className="mt-1 flex items-center gap-1" role="radiogroup" aria-label={`${s.name} 선호도`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  role="radio"
                  aria-checked={prefs[i] === n}
                  aria-label={`${n}점`}
                  onClick={() => setPrefs(prefs.map((p, idx) => (idx === i ? n : p)))}
                  className={`min-h-14 min-w-12 flex-1 rounded-xl text-4xl transition active:scale-90 ${
                    n <= prefs[i] ? "text-amber-500" : "text-slate-300"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            <p className="min-h-6 text-center text-base font-bold text-slate-600">{PREFERENCE_LABELS[prefs[i]] || ""}</p>
          </li>
        ))}
      </ol>

      <div className="fixed inset-x-0 bottom-0 border-t-2 border-slate-200 bg-white/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <p className="text-xl font-extrabold">{answered} / {total}</p>
          {error && <p className="flex-1 text-base font-bold text-rose-600" role="alert">{error}</p>}
          <Button className="ml-auto min-w-48" disabled={!allDone || saving} onClick={save}>
            {saving ? "저장하는 중…" : allDone ? "저장하기" : "모두 골라야 해요"}
          </Button>
        </div>
      </div>
    </main>
  );
}
