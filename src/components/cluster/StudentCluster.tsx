"use client";

import { useEffect, useState } from "react";
import { BackLink } from "@/components/ui/BackLink";
import { LinkButton } from "@/components/ui/Button";
import { LessonGate } from "@/components/student/LessonGate";
import { ClassClusterView } from "./ClassClusterView";
import { fetchClassScores, fetchConfirmed, fetchMyLabels, saveMyLabels, type ConfirmedState } from "@/lib/class-db";
import type { ScoreRow } from "@/lib/class-cluster";
import type { StudentSession } from "@/lib/student-session";

/** 7차시: 학급 친구들의 점수와 선생님이 확정한 군집 결과를 보고, 그룹에 이름을 붙인다. */
export function StudentCluster() {
  return <LessonGate lessons={[7]}>{(session) => <Loader session={session} />}</LessonGate>;
}

interface Data {
  rows: ScoreRow[];
  confirmed: ConfirmedState;
  labels: Record<number, string[]>;
}

function Loader({ session }: { session: StudentSession }) {
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetchClassScores("student", session.classId),
      fetchConfirmed("student", session.classId),
      fetchMyLabels(session).catch(() => ({}) as Record<number, string[]>),
    ])
      .then(([rows, confirmed, labels]) => alive && setData({ rows, confirmed, labels }))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [session]);

  if (failed) return <Message>데이터를 불러오지 못했어요. 잠시 뒤에 다시 해 봐요.</Message>;
  if (!data) return <Message>불러오는 중…</Message>;

  if (data.confirmed.results.length === 0) {
    return (
      <Message>
        <div className="text-6xl" aria-hidden>⏳</div>
        <p>선생님이 아직 결과를 정하지 않았어요.</p>
        <p className="text-xl font-normal text-slate-600">친구들이 모두 설문을 마치면 선생님이 정해 줘요. 조금만 기다려요.</p>
        <LinkButton href="/student" variant="ghost">차시 선택으로</LinkButton>
      </Message>
    );
  }

  const answered = data.rows.some((r) => r.anon_code === session.anonCode);

  return (
    <main className="mx-auto max-w-[1500px] p-4 sm:p-6">
      <header className="mb-4">
        <BackLink />
        <h1 className="text-3xl font-extrabold">우리 반 소비·저축 지도 ({session.anonCode})</h1>
      </header>
      {!answered && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-3xl bg-amber-50 p-4 text-xl font-bold">
          아직 6차시 설문을 하지 않아서 내 점이 보이지 않아요.
          <LinkButton href="/tendency/survey" variant="secondary">설문하러 가기</LinkButton>
        </div>
      )}
      <ClassClusterView
        rows={data.rows}
        results={data.confirmed.results}
        myCode={answered ? session.anonCode : undefined}
        initialNames={data.labels}
        initialK={data.confirmed.mainK}
        onSaveNames={(k, names) => saveMyLabels(session, k, names)}
      />
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
