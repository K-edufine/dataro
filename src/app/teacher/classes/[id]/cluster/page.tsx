"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClassClusterView } from "@/components/cluster/ClassClusterView";
import { Button } from "@/components/ui/Button";
import { computeClassClusters, type ClassClusterResult, type ScoreRow } from "@/lib/class-cluster";
import { confirmClusters, fetchClassScores, fetchConfirmed, setGroupTypes, type ConfirmedState } from "@/lib/class-db";
import type { ClusterType } from "@/lib/cluster-types";
import { makeDemoRows } from "@/lib/demo-class";
import { classLabel } from "@/lib/schools";
import { AXIS_MID } from "@/lib/survey";
import { getSupabase } from "@/lib/supabase/client";
import type { ClassRow } from "@/lib/supabase/types";
import { useTeacherGuard } from "@/lib/teacher";

const POLL_MS = 10_000;

/** 7차시: 학급 응답으로 K=2·3·4 군집을 미리 보고, 이 결과로 확정한다. (전자칠판용) */
export default function TeacherClusterPage() {
  const { id } = useParams<{ id: string }>();
  const { ready } = useTeacherGuard();
  const [cls, setCls] = useState<ClassRow | null>(null);
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [confirmed, setConfirmed] = useState<ConfirmedState | null>(null);
  const [demo, setDemo] = useState(false);
  const [viewChoice, setViewChoice] = useState<"preview" | "confirmed" | null>(null);
  const [overrides, setOverrides] = useState<Record<string, ClusterType>>({});
  const [mainK, setMainK] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, scores, conf] = await Promise.all([
        getSupabase("teacher").from("classes").select("*").eq("id", id).maybeSingle(),
        fetchClassScores("teacher", id),
        fetchConfirmed("teacher", id),
      ]);
      if (!c.data) return setMissing(true);
      setCls(c.data as ClassRow);
      setRows(scores);
      setConfirmed(conf);
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

  const demoRows = useMemo(() => makeDemoRows(25), []);
  const used = demo ? demoRows : rows;
  const computed = useMemo(() => computeClassClusters(used, AXIS_MID), [used]);

  const hasConfirmed = !demo && !!confirmed && confirmed.results.length > 0;
  const view = demo ? "preview" : viewChoice ?? (hasConfirmed ? "confirmed" : "preview");
  const showConfirmed = view === "confirmed" && hasConfirmed;

  // 미리보기 결과에 교사가 고친 유형을 덮어쓴다
  const preview: ClassClusterResult[] = computed.map((r) => ({
    ...r,
    types: r.types.map((t, g) => overrides[`${r.k}-${g}`] ?? t),
  }));
  const shown = showConfirmed ? confirmed!.results : preview;

  const ks = preview.map((r) => r.k);
  const chosenMainK = mainK !== null && ks.includes(mainK) ? mainK : ks.includes(confirmed?.mainK ?? 4) ? (confirmed?.mainK ?? 4) : ks[ks.length - 1];
  const newSince = hasConfirmed ? Math.max(0, rows.length - Math.max(...confirmed!.results.map((r) => r.studentCount))) : 0;

  async function confirm() {
    if (demo || computed.length === 0 || chosenMainK === undefined) return;
    if (hasConfirmed) {
      const ok = window.confirm("이미 확정한 결과가 있어요. 다시 확정하면 학생들이 붙인 그룹 이름이 지워져요. 계속할까요?");
      if (!ok) return;
    }
    setBusy(true);
    setMessage("");
    try {
      await confirmClusters(id, preview, chosenMainK);
      setOverrides({});
      setViewChoice("confirmed");
      await load();
      setMessage("확정했어요! 이제 학생들이 이 결과를 볼 수 있어요.");
    } catch {
      setMessage("확정하지 못했어요. 잠시 뒤에 다시 해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function changeType(k: number, group: number, type: ClusterType) {
    if (!showConfirmed) {
      setOverrides({ ...overrides, [`${k}-${group}`]: type });
      return;
    }
    const cur = confirmed!.results.find((r) => r.k === k);
    if (!cur) return;
    const types = cur.types.map((t, g) => (g === group ? type : t));
    try {
      await setGroupTypes(id, k, types);
      setConfirmed({ ...confirmed!, results: confirmed!.results.map((r) => (r.k === k ? { ...r, types } : r)) });
    } catch {
      setMessage("유형을 바꾸지 못했어요. 다시 해 주세요.");
    }
  }

  if (missing) {
    return <main className="p-6 text-xl">학급을 찾을 수 없어요. <Link href="/teacher" className="font-bold text-sky-700 underline">내 학급으로</Link></main>;
  }
  if (!ready || !cls) return <main className="p-6 text-xl">불러오는 중…</main>;

  return (
    <main className="mx-auto max-w-[1500px] p-4 sm:p-6">
      <Link href={`/teacher/classes/${id}`} className="text-base font-bold text-sky-700 underline">← {classLabel(cls)}</Link>
      <header className="mb-4 mt-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">7차시 학급 군집화</h1>
          <p className="text-lg text-slate-600">
            설문 응답 <b>{rows.length}</b>/{cls.student_count}명
            {hasConfirmed && confirmed!.confirmedAt && <> · 확정 {new Date(confirmed!.confirmedAt).toLocaleString("ko-KR")}</>}
          </p>
        </div>
        <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border-2 border-slate-300 bg-white px-4 text-base font-bold">
          <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} className="size-5" />
          연습용 가상 학생 25명으로 보기 (저장 안 됨)
        </label>
      </header>

      {demo && (
        <p className="mb-4 rounded-3xl bg-sky-50 p-4 text-lg font-bold">
          지금은 가상 학생 25명의 연습 화면이에요. 실제 학급에는 아무것도 저장되지 않아요.
        </p>
      )}
      {newSince > 0 && (
        <p className="mb-4 rounded-3xl bg-amber-50 p-4 text-lg font-bold">
          결과를 확정한 뒤에 설문한 학생이 {newSince}명 늘었어요. 미리보기로 바꿔서 다시 확정할 수 있어요.
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-3xl bg-slate-50 p-3">
        {!demo && hasConfirmed && (
          <div className="flex gap-2" role="group" aria-label="보기 선택">
            <Button variant={showConfirmed ? "primary" : "ghost"} className="min-h-12" onClick={() => setViewChoice("confirmed")}>확정된 결과</Button>
            <Button variant={!showConfirmed ? "primary" : "ghost"} className="min-h-12" onClick={() => setViewChoice("preview")}>지금 응답으로 미리보기</Button>
          </div>
        )}
        {!showConfirmed && (
          <>
            <label className="flex items-center gap-2 text-base font-bold">
              8~10차시에서 쓸 K
              <select
                value={chosenMainK ?? ""}
                onChange={(e) => setMainK(Number(e.target.value))}
                className="min-h-12 rounded-xl border-2 border-slate-300 bg-white px-2 text-lg font-bold"
              >
                {ks.map((k) => <option key={k} value={k}>K={k}</option>)}
              </select>
            </label>
            <Button disabled={busy || demo || computed.length === 0} onClick={confirm}>
              {busy ? "확정하는 중…" : hasConfirmed ? "이 결과로 다시 확정하기" : "이 결과로 확정하기"}
            </Button>
          </>
        )}
        {showConfirmed && <p className="text-base font-bold">8~10차시에서 쓰는 K: K={confirmed!.mainK}</p>}
        {message && <p className="text-base font-bold text-sky-800" role="status">{message}</p>}
      </div>

      {computed.length === 0 && !showConfirmed ? (
        <p className="rounded-3xl bg-amber-50 p-6 text-xl font-bold">
          설문 응답이 2명 이상 있어야 군집을 만들 수 있어요. 지금은 {used.length}명이에요.
        </p>
      ) : (
        <ClassClusterView
          // 보기나 결과가 바뀌면 화면 상태(K, 선택)를 새로 시작한다
          key={`${demo}-${showConfirmed}-${shown.map((r) => r.studentCount).join(",")}`}
          rows={used}
          results={shown}
          initialK={showConfirmed ? confirmed!.mainK : chosenMainK}
          onTypeChange={changeType}
        />
      )}
      <p className="mt-6 text-base text-slate-600">
        유형은 소비·저축 점수의 중심이 척도의 가운데({AXIS_MID}점)보다 높은지로 자동 정해요. 학급 사정에 맞지 않으면 직접 고칠 수 있어요.
      </p>
    </main>
  );
}
