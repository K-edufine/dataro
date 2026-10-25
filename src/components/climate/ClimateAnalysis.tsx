"use client";

import { useEffect, useMemo, useState } from "react";
import { KLab } from "@/components/snack/KLab";
import { LinkButton } from "@/components/ui/Button";
import { LessonGate } from "@/components/student/LessonGate";
import { CLIMATE_COUNT, MIN_FOR_ANALYSIS, type ClimateRow } from "@/lib/climate";
import { loadMyClimate } from "@/lib/climate-db";
import { climateSpec, type Item } from "@/lib/dataset";
import { K_ORDER_HIGH, loadKTrials, type SavedTrial } from "@/lib/k-trials";
import type { StudentSession } from "@/lib/student-session";

/** 고학년 5차시: 내가 입력한 기후 데이터로 K=2~6 군집 분석 (처음 고른 K 하나만 직접 묶고, 나머지는 컴퓨터가 자동으로) */
export function ClimateAnalysis() {
  return <LessonGate lessons={[5]}>{(session) => <Loader session={session} />}</LessonGate>;
}

function Loader({ session }: { session: StudentSession }) {
  const [data, setData] = useState<{ rows: ClimateRow[]; trials: SavedTrial[] } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([loadMyClimate(session), loadKTrials(session).catch(() => [] as SavedTrial[])])
      .then(([rows, trials]) => alive && setData({ rows, trials }))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [session]);

  if (session.gradeBand !== "high") {
    return <Message><p>이 화면은 고학년(5~6학년)용이에요.</p><LinkButton href="/student">차시 선택으로</LinkButton></Message>;
  }
  if (failed) return <Message>데이터를 불러오지 못했어요. 잠시 뒤에 다시 해 봐요.</Message>;
  if (!data) return <Message>불러오는 중…</Message>;
  if (data.rows.length < MIN_FOR_ANALYSIS) {
    return (
      <Message>
        <p>{data.rows.length === 0 ? "아직 기후 데이터를 입력하지 않았어요." : `지금은 ${data.rows.length}개만 입력했어요.`}</p>
        <p className="text-xl font-normal text-slate-600">분석하려면 {MIN_FOR_ANALYSIS}개 이상 필요해요. ({CLIMATE_COUNT}개를 모두 쓰면 가장 좋아요)</p>
        <LinkButton href="/climate/input">4차시에서 데이터 입력하기</LinkButton>
        <LinkButton href="/student" variant="ghost">차시 선택으로</LinkButton>
      </Message>
    );
  }
  return <Ready session={session} rows={data.rows} trials={data.trials} />;
}

function Ready({ session, rows, trials }: { session: StudentSession; rows: ClimateRow[]; trials: SavedTrial[] }) {
  const items = useMemo<Item[]>(
    () => rows.map((r, i) => ({ id: `c${i}`, name: r.city, sub: r.country, x: r.temp, y: r.rain })),
    [rows],
  );
  const spec = useMemo(() => climateSpec(items), [items]);
  const ks = useMemo(() => K_ORDER_HIGH.filter((k) => k <= items.length), [items.length]);
  const short = rows.length < CLIMATE_COUNT;

  return (
    <>
      {short && (
        <div className="mx-auto mt-4 flex max-w-[1500px] flex-wrap items-center gap-3 rounded-3xl bg-amber-50 p-4 text-lg font-bold sm:mx-6">
          {CLIMATE_COUNT}개 중 {rows.length}개만 입력해서 이 데이터로 분석해요.
          <LinkButton href="/climate/input" variant="ghost" className="min-h-12">나머지 입력하러 가기</LinkButton>
        </div>
      )}
      <KLab
        key={items.length}
        session={session}
        items={items}
        spec={spec}
        saved={trials}
        title={`기후 군집 분석 (${session.anonCode})`}
        ks={ks}
        policy="first"
      />
    </>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-6 text-center text-2xl font-bold">
      {children}
    </main>
  );
}
