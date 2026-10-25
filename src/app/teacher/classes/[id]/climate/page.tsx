"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CLIMATE_COUNT, MIN_FOR_ANALYSIS } from "@/lib/climate";
import { fetchClassClimate, type ClassClimate } from "@/lib/climate-db";
import { findFlags } from "@/lib/climate-check";
import { classLabel } from "@/lib/schools";
import { getSupabase } from "@/lib/supabase/client";
import type { ClassRow, StudentRow } from "@/lib/supabase/types";
import { useTeacherGuard } from "@/lib/teacher";

const POLL_MS = 10_000;

/** 고학년 4차시: 학생들이 입력한 기후 데이터의 입력 현황과 의심 값을 확인하는 교사 화면 */
export default function TeacherClimatePage() {
  const { id } = useParams<{ id: string }>();
  const { ready } = useTeacherGuard();
  const [cls, setCls] = useState<ClassRow | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [rows, setRows] = useState<ClassClimate[]>([]);
  const [pick, setPick] = useState("");
  const [missing, setMissing] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const db = getSupabase("teacher");
      const [c, s, r] = await Promise.all([
        db.from("classes").select("*").eq("id", id).maybeSingle(),
        db.from("students").select("*").eq("class_id", id).order("number"),
        fetchClassClimate("teacher", id),
      ]);
      if (!c.data) return setMissing(true);
      setCls(c.data as ClassRow);
      setStudents((s.data as StudentRow[]) ?? []);
      setRows(r);
      setMessage("");
    } catch {
      setMessage("데이터를 불러오지 못했어요. 잠시 뒤에 다시 해 주세요.");
    }
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

  const flags = useMemo(() => findFlags(rows), [rows]);
  const numberOf = useMemo(() => new Map(students.map((s) => [s.id, s.number])), [students]);
  const countOf = (sid: string) => rows.filter((r) => r.studentId === sid).length;
  const flagKeys = useMemo(() => new Set(flags.map((f) => `${f.studentId}-${f.sortOrder}`)), [flags]);

  const complete = students.filter((s) => countOf(s.id) >= CLIMATE_COUNT).length;
  const ok = students.filter((s) => countOf(s.id) >= MIN_FOR_ANALYSIS).length;
  const chosen = students.find((s) => s.id === pick);
  const chosenRows = rows.filter((r) => r.studentId === pick).sort((a, b) => a.sortOrder - b.sortOrder);
  const flagged = [...flags].sort((a, b) => (numberOf.get(a.studentId) ?? 0) - (numberOf.get(b.studentId) ?? 0) || a.sortOrder - b.sortOrder);

  if (missing) return <main className="p-6 text-xl">학급을 찾을 수 없어요. <Link href="/teacher" className="font-bold text-sky-700 underline">내 학급으로</Link></main>;
  if (!ready || !cls) return <main className="p-6 text-xl">불러오는 중…</main>;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div>
        <Link href={`/teacher/classes/${id}`} className="text-base font-bold text-sky-700 underline">← {classLabel(cls)}</Link>
        <h1 className="mt-1 text-3xl font-extrabold">기후 데이터 확인</h1>
        <p className="text-lg text-slate-600">
          입장 {students.length}/{cls.student_count}명 · {CLIMATE_COUNT}개 모두 입력 <b>{complete}</b>명 · {MIN_FOR_ANALYSIS}개 이상 <b>{ok}</b>명 · 의심 값 <b>{flags.length}</b>개
        </p>
        {message && <p className="font-bold text-rose-600" role="alert">{message}</p>}
      </div>

      <section aria-label="의심 값" className="space-y-2">
        <h2 className="text-2xl font-extrabold">의심 값</h2>
        <p className="text-base text-slate-600">
          보기 드문 값이거나, 같은 도시를 입력한 친구들(3명 이상)의 값과 크게 다른 경우예요. 실수일 수도, 실제로 그런 값일 수도 있으니 확인만 해 주세요.
        </p>
        {flagged.length === 0 ? (
          <p className="rounded-3xl bg-emerald-50 p-4 text-lg font-bold">의심되는 값이 없어요 ✅</p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl border-2 border-slate-200 bg-white">
            {flagged.map((f, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-3 p-3 text-lg">
                <button className="font-extrabold text-sky-700 underline" onClick={() => setPick(f.studentId)}>
                  {numberOf.get(f.studentId) ?? "?"}번
                </button>
                <span className="font-bold">{f.city}</span>
                <span className="text-slate-700">{f.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="학생별 보기" className="space-y-2">
        <h2 className="text-2xl font-extrabold">학생별 입력 보기</h2>
        <label className="flex items-center gap-2 text-lg font-bold">
          학생
          <select value={pick} onChange={(e) => setPick(e.target.value)} className="min-h-12 rounded-xl border-2 border-slate-300 bg-white px-3 text-lg font-bold">
            <option value="">번호를 골라요</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.number}번 ({countOf(s.id)}개)</option>
            ))}
          </select>
        </label>
        {chosen && (
          chosenRows.length === 0 ? (
            <p className="text-lg text-slate-500">{chosen.number}번은 아직 입력한 데이터가 없어요.</p>
          ) : (
            <div className="overflow-x-auto rounded-3xl border-2 border-slate-200 bg-white">
              <table className="w-full text-left text-lg">
                <thead className="bg-slate-50 text-base text-slate-600">
                  <tr><th className="p-3">#</th><th className="p-3">국가</th><th className="p-3">도시</th><th className="p-3">기온(℃)</th><th className="p-3">강수량(mm)</th></tr>
                </thead>
                <tbody>
                  {chosenRows.map((r) => {
                    const bad = flagKeys.has(`${r.studentId}-${r.sortOrder}`);
                    return (
                      <tr key={r.sortOrder} className={`border-t border-slate-100 ${bad ? "bg-amber-50" : ""}`}>
                        <td className="p-3">{r.sortOrder + 1}</td>
                        <td className="p-3">{r.country}</td>
                        <td className="p-3 font-bold">{r.city}{bad && " ⚠"}</td>
                        <td className="p-3">{r.temp.toFixed(1)}</td>
                        <td className="p-3">{r.rain.toLocaleString("ko-KR")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </section>
    </main>
  );
}
