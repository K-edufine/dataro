"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { ClassRow, StudentRow, SurveyRow } from "@/lib/supabase/types";
import { LESSONS } from "@/lib/lessons";
import { GRADE_BAND_LABEL, classLabel } from "@/lib/schools";
import { JUDGMENT_ICON, K_ORDER, type Judgment } from "@/lib/k-trials";
import { useTeacherGuard } from "@/lib/teacher";

const POLL_MS = 10_000;

export default function TeacherClassPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { ready } = useTeacherGuard();
  const [cls, setCls] = useState<ClassRow | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [snackCounts, setSnackCounts] = useState<Record<string, number>>({});
  const [trials, setTrials] = useState<{ student_id: string; k: number; judgment: Judgment }[]>([]);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const db = getSupabase("teacher");
    const [c, s, sv, sn, kt] = await Promise.all([
      db.from("classes").select("*").eq("id", id).maybeSingle(),
      db.from("students").select("*").eq("class_id", id).order("created_at"),
      db.from("survey_responses").select("student_id, class_id, answers, consume_score, save_score").eq("class_id", id),
      db.from("snack_data").select("student_id").eq("class_id", id),
      db.from("k_trials").select("student_id, k, judgment").eq("class_id", id),
    ]);
    if (!c.data) return setMissing(true);
    setCls(c.data as ClassRow);
    setStudents((s.data as StudentRow[]) ?? []);
    setSurveys((sv.data as SurveyRow[]) ?? []);
    const counts: Record<string, number> = {};
    (sn.data ?? []).forEach((r: { student_id: string }) => (counts[r.student_id] = (counts[r.student_id] ?? 0) + 1));
    setSnackCounts(counts);
    setTrials((kt.data as { student_id: string; k: number; judgment: Judgment }[]) ?? []);
  }, [id]);

  useEffect(() => {
    if (!ready) return;
    const first = setTimeout(load, 0);
    const timer = setInterval(load, POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [ready, load]);

  async function toggle(n: number) {
    if (!cls) return;
    const next = cls.open_lessons.includes(n)
      ? cls.open_lessons.filter((x) => x !== n)
      : [...cls.open_lessons, n].sort((a, b) => a - b);
    setCls({ ...cls, open_lessons: next }); // 먼저 화면에 반영
    setError("");
    const { error: err } = await getSupabase("teacher").from("classes").update({ open_lessons: next }).eq("id", cls.id);
    if (err) {
      setError("차시를 바꾸지 못했어요. 다시 해 주세요.");
      load();
    }
  }

  async function remove() {
    if (!cls) return;
    const ok = window.confirm(
      `${classLabel(cls)}을(를) 삭제할까요?\n학생 입장 기록, 간식 데이터, 설문 결과가 모두 지워지고 되돌릴 수 없어요.`,
    );
    if (!ok) return;
    const { error: err } = await getSupabase("teacher").from("classes").delete().eq("id", cls.id);
    if (err) setError("삭제하지 못했어요. 다시 해 주세요.");
    else router.replace("/teacher");
  }

  if (missing) {
    return (
      <main className="p-6 text-xl">
        학급을 찾을 수 없어요. <Link href="/teacher" className="font-bold text-sky-700 underline">내 학급으로</Link>
      </main>
    );
  }
  if (!ready || !cls) return <main className="p-6 text-xl">불러오는 중…</main>;

  const surveyOf = (sid: string) => surveys.find((x) => x.student_id === sid);

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <Link href="/teacher" className="text-base font-bold text-sky-700 underline">← 내 학급</Link>
      <header className="mb-6 mt-1 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold">{classLabel(cls)}</h1>
          <p className="mt-1 text-lg font-bold text-slate-600">
            {GRADE_BAND_LABEL[cls.grade_band]} · 학생 {cls.student_count}명
          </p>
        </div>
        <button onClick={remove} className="min-h-12 rounded-2xl px-4 text-base font-bold text-rose-600 underline">학급 삭제</button>
      </header>

      <section className="mb-8" aria-label="차시 열고 닫기">
        <h2 className="mb-3 text-2xl font-extrabold">차시 열고 닫기</h2>
        <p className="mb-3 text-base text-slate-600">누르면 학생 화면에서 바로 열리고 닫혀요. (학생 화면은 10초마다 새로 확인해요)</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {LESSONS.map((l) => {
            const on = cls.open_lessons.includes(l.n);
            return (
              <li key={l.n}>
                <button
                  onClick={() => toggle(l.n)}
                  role="switch"
                  aria-checked={on}
                  className={`flex min-h-20 w-full items-center gap-4 rounded-3xl border-4 p-3 text-left transition active:scale-[0.98] ${
                    on ? "border-emerald-600 bg-emerald-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-2xl font-extrabold">{l.n}</span>
                  <span className="flex-1 text-lg font-extrabold">
                    {l.title}
                    {!l.href && <span className="block text-sm font-normal text-slate-500">아직 만들지 않은 차시</span>}
                  </span>
                  <span className={`rounded-full px-4 py-2 text-base font-extrabold ${on ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                    {on ? "열림" : "닫힘"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {error && <p className="mt-2 font-bold text-rose-600" role="alert">{error}</p>}
      </section>

      <section aria-label="학생 현황">
        <h2 className="mb-1 text-2xl font-extrabold">학생 현황</h2>
        <p className="mb-3 text-lg">
          입장 <b>{students.length}</b>/{cls.student_count}명 · 간식 입력 <b>{students.filter((s) => snackCounts[s.id]).length}</b>명 · K 판단 완료 <b>{students.filter((s) => K_ORDER.every((k) => trials.some((t) => t.student_id === s.id && t.k === k))).length}</b>명 · 설문 <b>{surveys.length}</b>명
        </p>
        <div className="overflow-x-auto rounded-3xl border-2 border-slate-200 bg-white">
          <table className="w-full text-left text-lg">
            <thead className="bg-slate-50 text-base text-slate-600">
              <tr>
                <th className="p-3">번호</th>
                <th className="p-3">입장</th>
                <th className="p-3">간식 선호도</th>
                <th className="p-3">K 판단 (2·3·4·5)</th>
                <th className="p-3">소비 점수</th>
                <th className="p-3">저축 점수</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: cls.student_count }, (_, i) => i + 1).map((n) => {
                const stu = students.find((x) => x.number === n);
                const sv = stu ? surveyOf(stu.id) : undefined;
                return (
                  <tr key={n} className="border-t border-slate-100">
                    <td className="p-3 font-extrabold">{n}번 <span className="text-sm font-normal text-slate-500">({`s${n}`})</span></td>
                    <td className="p-3">{stu ? "✅" : "-"}</td>
                    <td className="p-3">{stu && snackCounts[stu.id] ? `${snackCounts[stu.id]}개` : "-"}</td>
                    <td className="whitespace-nowrap p-3" title="✅ 알맞아요 · 🟥 넓어요 · 🧩 잘게 나눴어요">
                      {stu
                        ? K_ORDER.map((k) => {
                            const t = trials.find((x) => x.student_id === stu.id && x.k === k);
                            return <span key={k} className="mr-2">{t ? JUDGMENT_ICON[t.judgment] : "-"}</span>;
                          })
                        : "-"}
                    </td>
                    <td className="p-3">{sv ? Number(sv.consume_score).toFixed(2) : "-"}</td>
                    <td className="p-3">{sv ? Number(sv.save_score).toFixed(2) : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
