"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { SCHOOLS } from "@/lib/schools";
import { joinClass, listClasses, type ListedClass, type StudentSession } from "@/lib/student-session";

type Step = "school" | "class" | "number";

/** 학교 → 학년반 → 번호 순서로 고르는 입장 화면 (이름은 받지 않는다) */
export function JoinForm({ onJoined }: { onJoined?: (s: StudentSession) => void }) {
  const [step, setStep] = useState<Step>("school");
  const [school, setSchool] = useState("");
  const [classes, setClasses] = useState<ListedClass[] | null>(null);
  const [cls, setCls] = useState<ListedClass | null>(null);
  const [number, setNumber] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!isSupabaseConfigured) {
    return (
      <p className="rounded-2xl bg-rose-50 p-4 text-lg font-bold text-rose-700">
        아직 서버 설정이 끝나지 않았어요. 선생님께 알려 주세요.
      </p>
    );
  }

  async function chooseSchool(name: string) {
    setSchool(name);
    setClasses(null);
    setError("");
    setStep("class");
    try {
      setClasses(await listClasses(name));
    } catch (e) {
      setError((e as Error).message);
      setClasses([]);
    }
  }

  async function submit() {
    if (!cls || number === null) return;
    setBusy(true);
    setError("");
    try {
      onJoined?.(await joinClass(cls.id, number));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const choice =
    "min-h-16 rounded-2xl border-4 border-slate-200 bg-white px-4 text-2xl font-extrabold transition active:scale-95 hover:bg-sky-50";

  return (
    <div className="w-full space-y-4">
      {/* 지금까지 고른 것 */}
      {step !== "school" && (
        <p className="text-xl font-bold text-slate-700">
          {school}
          {cls && ` ${cls.grade}학년 ${cls.class_no}반`}
        </p>
      )}

      {step === "school" && (
        <>
          <h2 className="text-2xl font-extrabold">우리 학교를 골라요</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {SCHOOLS.map((s) => (
              <button key={s.name} className={choice} onClick={() => chooseSchool(s.name)}>{s.name}</button>
            ))}
          </div>
        </>
      )}

      {step === "class" && (
        <>
          <h2 className="text-2xl font-extrabold">우리 반을 골라요</h2>
          {classes === null ? (
            <p className="text-xl">불러오는 중…</p>
          ) : classes.length === 0 ? (
            <p className="rounded-2xl bg-amber-50 p-4 text-lg font-bold">
              아직 열린 학급이 없어요. 선생님께 물어봐요.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {classes.map((c) => (
                <button
                  key={c.id}
                  className={choice}
                  onClick={() => {
                    setCls(c);
                    setNumber(null);
                    setError("");
                    setStep("number");
                  }}
                >
                  {c.grade}학년 {c.class_no}반
                </button>
              ))}
            </div>
          )}
          <Button variant="ghost" onClick={() => { setStep("school"); setCls(null); }}>← 학교 다시 고르기</Button>
        </>
      )}

      {step === "number" && cls && (
        <>
          <h2 className="text-2xl font-extrabold">내 번호를 눌러요</h2>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-6" role="radiogroup" aria-label="내 번호">
            {Array.from({ length: cls.student_count }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                role="radio"
                aria-checked={number === n}
                onClick={() => setNumber(n)}
                className={`min-h-16 rounded-2xl border-4 text-2xl font-extrabold transition active:scale-95 ${
                  number === n ? "border-sky-600 bg-sky-600 text-white" : "border-slate-200 bg-white hover:bg-sky-50"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          {error && <p className="text-lg font-bold text-rose-600" role="alert">{error}</p>}
          <Button className="min-h-16 w-full text-2xl" disabled={number === null || busy} onClick={submit}>
            {busy ? "들어가는 중…" : number === null ? "번호를 먼저 골라요" : `${number}번으로 들어가기`}
          </Button>
          <Button variant="ghost" onClick={() => setStep("class")}>← 반 다시 고르기</Button>
        </>
      )}
    </div>
  );
}
