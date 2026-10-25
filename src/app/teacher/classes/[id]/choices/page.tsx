"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChoiceShiftChart, ChoiceShiftLegend } from "@/components/chart/ChoiceShiftChart";
import { fetchClassChoices } from "@/lib/choice-db";
import { fetchConfirmed, type ConfirmedState } from "@/lib/class-db";
import { CLUSTER_TYPE_LABEL } from "@/lib/cluster-types";
import { KIND_LABEL, TOTAL, TYPE_DIRECTION, kindOf, summarizeShifts, type ShiftRow } from "@/lib/choices";
import { won } from "@/lib/format";
import { classLabel } from "@/lib/schools";
import { getSupabase } from "@/lib/supabase/client";
import type { ClassRow, StudentRow } from "@/lib/supabase/types";
import { useTeacherGuard } from "@/lib/teacher";

const POLL_MS = 10_000;

type Data = Awaited<ReturnType<typeof fetchClassChoices>>;

/** 8·9차시: 1차 → 2차 선택 변화와 학생들의 성찰을 한눈에 보는 교사 화면 (전자칠판용) */
export default function TeacherChoicesPage() {
  const { id } = useParams<{ id: string }>();
  const { ready } = useTeacherGuard();
  const [cls, setCls] = useState<ClassRow | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [data, setData] = useState<Data>({ choices: [], reflections: [] });
  const [confirmed, setConfirmed] = useState<ConfirmedState | null>(null);
  const [missing, setMissing] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const db = getSupabase("teacher");
      const [c, s, d, conf] = await Promise.all([
        db.from("classes").select("*").eq("id", id).maybeSingle(),
        db.from("students").select("*").eq("class_id", id).order("number"),
        fetchClassChoices("teacher", id),
        fetchConfirmed("teacher", id),
      ]);
      if (!c.data) return setMissing(true);
      setCls(c.data as ClassRow);
      setStudents((s.data as StudentRow[]) ?? []);
      setData(d);
      setConfirmed(conf);
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

  // 학생마다 선택·성찰·내 그룹(대표 K 기준)을 묶는다
  const result = confirmed?.results.find((r) => r.k === confirmed.mainK) ?? confirmed?.results[confirmed.results.length - 1];
  const people = useMemo(
    () =>
      students.map((s) => {
        const c1 = data.choices.find((c) => c.studentId === s.id && c.round === 1);
        const c2 = data.choices.find((c) => c.studentId === s.id && c.round === 2);
        const refl = data.reflections.find((r) => r.studentId === s.id);
        const group = result?.assignments[s.anon_code];
        return { s, c1, c2, refl, group, type: group !== undefined ? result!.types[group] : null };
      }),
    [students, data, result],
  );

  const shiftRows: ShiftRow[] = people
    .filter((p) => p.c1 && p.c2)
    .map((p) => ({ code: p.s.anon_code, type: p.type, first: p.c1!.consume, second: p.c2!.consume }));
  const summary = summarizeShifts(shiftRows);
  const directional = summary.toward + summary.against;

  if (missing) return <main className="p-6 text-xl">학급을 찾을 수 없어요. <Link href="/teacher" className="font-bold text-sky-700 underline">내 학급으로</Link></main>;
  if (!ready || !cls) return <main className="p-6 text-xl">불러오는 중…</main>;

  return (
    <main className="mx-auto max-w-[1200px] space-y-6 p-4 sm:p-6">
      <div>
        <Link href={`/teacher/classes/${id}`} className="text-base font-bold text-sky-700 underline">← {classLabel(cls)}</Link>
        <h1 className="mt-1 text-3xl font-extrabold">8·9차시 선택 변화와 성찰</h1>
        <p className="text-lg text-slate-600">
          1·2차 선택을 마친 학생 <b>{shiftRows.length}</b>/{cls.student_count}명 · 성찰을 쓴 학생 <b>{data.reflections.length}</b>명
        </p>
        {message && <p className="font-bold text-rose-600" role="alert">{message}</p>}
      </div>

      {!result && (
        <p className="rounded-3xl bg-amber-50 p-4 text-lg font-bold">
          아직 7차시 군집 결과를 확정하지 않아서 학생들의 그룹을 알 수 없어요. 선택 변화는 아래에 보이지만 &lsquo;정보 쪽으로&rsquo; 판정은 되지 않아요.
        </p>
      )}

      <section className="space-y-3" aria-label="요약">
        <h2 className="text-2xl font-extrabold">우리 반 요약</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-3xl bg-slate-100 p-4"><p className="font-bold">선택을 바꾼 학생</p><p className="text-4xl font-extrabold">{summary.moved}<span className="text-xl">/{summary.students}명</span></p></div>
          <div className="rounded-3xl bg-orange-100 p-4"><p className="font-bold">정보 쪽으로 바꿈</p><p className="text-4xl font-extrabold">{summary.toward}<span className="text-xl">/{directional}명</span></p><p className="text-sm text-slate-600">방향이 있는 그룹 기준</p></div>
          <div className="rounded-3xl bg-sky-100 p-4"><p className="font-bold">반대쪽으로 바꿈</p><p className="text-4xl font-extrabold">{summary.against}<span className="text-xl">/{directional}명</span></p></div>
          <div className="rounded-3xl bg-pink-100 p-4"><p className="font-bold">방향 없는 그룹</p><p className="text-4xl font-extrabold">{summary.both}<span className="text-xl">명 움직임</span></p></div>
        </div>
        <p className="text-lg font-bold">
          평균 소비 금액: 1차 {won(summary.avgFirst)} → 2차 {won(summary.avgSecond)}
          {summary.noGroup > 0 && <span className="ml-2 font-normal text-slate-600">(그룹이 없는 학생 {summary.noGroup}명 포함)</span>}
        </p>
        <p className="text-base text-slate-600">
          정보가 알려 준 방향은 그룹 유형으로 정해요: {Object.entries(TYPE_DIRECTION).map(([t, d]) => `${CLUSTER_TYPE_LABEL[t as keyof typeof CLUSTER_TYPE_LABEL]} → ${d === "consume" ? "소비" : d === "save" ? "저축" : "두 가지"}`).join(" · ")}.
          바꾸려면 <code>src/data/scenarios.json</code> 의 <code>typeDirections</code> 를 고치면 돼요.
        </p>
      </section>

      <section className="space-y-3" aria-label="선택 변화 그림">
        <h2 className="text-2xl font-extrabold">1차 → 2차 선택 변화</h2>
        {shiftRows.length === 0 ? (
          <p className="text-lg text-slate-500">아직 1·2차 선택을 모두 마친 학생이 없어요.</p>
        ) : (
          <>
            <ChoiceShiftChart rows={shiftRows} total={TOTAL} />
            <ChoiceShiftLegend />
          </>
        )}
      </section>

      <section aria-label="번호 명단">
        <h2 className="mb-2 text-2xl font-extrabold">번호별 선택과 성찰</h2>
        <div className="overflow-x-auto rounded-3xl border-2 border-slate-200 bg-white">
          <table className="w-full text-left text-lg">
            <thead className="bg-slate-50 text-base text-slate-600">
              <tr>
                <th className="p-3">번호</th>
                <th className="p-3">그룹 유형</th>
                <th className="whitespace-nowrap p-3">1차 소비</th>
                <th className="whitespace-nowrap p-3">2차 소비</th>
                <th className="p-3">판정</th>
                <th className="whitespace-nowrap p-3">동의 ★</th>
                <th className="p-3">쓴 내용</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => {
                const kind = p.c1 && p.c2 ? kindOf({ code: p.s.anon_code, type: p.type, first: p.c1.consume, second: p.c2.consume }) : null;
                const hasText = p.c1?.reason || p.c2?.reason || p.refl;
                return (
                  <tr key={p.s.id} className="border-t border-slate-100 align-top">
                    <td className="whitespace-nowrap p-3 font-extrabold">{p.s.number}번 <span className="text-sm font-normal text-slate-500">({p.s.anon_code})</span></td>
                    <td className="whitespace-nowrap p-3">{p.type ? CLUSTER_TYPE_LABEL[p.type] : "-"}</td>
                    <td className="whitespace-nowrap p-3">{p.c1 ? won(p.c1.consume) : "-"}</td>
                    <td className="whitespace-nowrap p-3">{p.c2 ? won(p.c2.consume) : "-"}</td>
                    <td className="whitespace-nowrap p-3">{kind ? KIND_LABEL[kind] : "-"}</td>
                    <td className="whitespace-nowrap p-3">{p.refl ? "★".repeat(p.refl.agree) : "-"}</td>
                    <td className="p-3 text-base">
                      {hasText ? (
                        <details>
                          <summary className="cursor-pointer font-bold text-sky-700">펼치기</summary>
                          <ul className="mt-1 space-y-1">
                            {p.c1?.reason && <li><b>1차 이유:</b> {p.c1.reason}</li>}
                            {p.c2?.reason && <li><b>2차 이유:</b> {p.c2.reason}</li>}
                            {p.refl?.reason && <li><b>동의한 이유:</b> {p.refl.reason}</li>}
                            {p.refl?.unknownMe && <li><b>컴퓨터가 모르는 나:</b> {p.refl.unknownMe}</li>}
                            {p.refl?.criticalNote && <li><b>한쪽 이야기만 한 부분:</b> {p.refl.criticalNote}</li>}
                          </ul>
                        </details>
                      ) : "-"}
                    </td>
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
