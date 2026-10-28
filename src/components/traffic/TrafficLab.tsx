"use client";

import { useMemo, useState } from "react";
import { BackLink } from "@/components/ui/BackLink";
import { Button, LinkButton } from "@/components/ui/Button";
import { LessonGate } from "@/components/student/LessonGate";
import { ScatterChart, niceTicks, type ChartPoint } from "@/components/chart/ScatterChart";
import { clusterColor, clusterIcon } from "@/components/chart/cluster-style";
import { runBest, silhouette, type Point } from "@/lib/kmeans";
import data from "@/data/gyeonggi-traffic.json";

// TODO: 연구회 표준 표로 확정되면 src/data/gyeonggi-traffic.json 만 고친다.
const KS = [2, 3, 4];
const CITIES = data.cities;
const POINTS: Point[] = CITIES.map((c, i) => ({ id: `t${i}`, x: c.transit, y: c.seoul }));

interface Result {
  k: number;
  assignments: readonly number[];
  perPoint: number[];
  mean: number;
}

function compute(): Result[] {
  return KS.map((k) => {
    const end = runBest(POINTS, k);
    const s = silhouette(POINTS, end.assignments);
    return { k, assignments: end.assignments, perPoint: s.perPoint, mean: s.mean };
  });
}

/** 고학년 6차시: 경기도 12개 도시를 K=2·3·4로 묶고 실루엣 계수를 비교한다. */
export function TrafficLab() {
  return <LessonGate lessons={[6]}>{(session) => (session.gradeBand === "high" ? <Lab code={session.anonCode} /> : <NotHigh />)}</LessonGate>;
}

function NotHigh() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-6 text-center text-2xl font-bold">
      <p>이 화면은 고학년(5~6학년)용이에요.</p>
      <LinkButton href="/student">차시 선택으로</LinkButton>
    </main>
  );
}

const f2 = (v: number) => v.toFixed(2);

function Lab({ code }: { code: string }) {
  const results = useMemo(() => compute(), []);
  const [guess, setGuess] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [showTable, setShowTable] = useState(false);

  const best = results.reduce((a, b) => (b.mean > a.mean ? b : a));
  const selectedIdx = selected.map((id) => Number(id.slice(1)));

  return (
    <main className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6">
      <header>
        <BackLink />
        <h1 className="text-3xl font-extrabold">경기도 12개 도시, 몇 개로 묶는 게 좋을까? ({code})</h1>
      </header>

      <section className="rounded-3xl bg-amber-50 p-4 text-xl leading-relaxed" aria-label="실루엣 계수 설명">
        <p className="font-extrabold">실루엣 계수란?</p>
        <ul className="mt-1 list-disc space-y-1 pl-6">
          <li>같은 그룹 친구와 <b>가까울수록</b>, 다른 그룹과는 <b>멀수록</b> 좋은 그룹이에요.</li>
          <li>그 정도를 −1부터 1 사이 숫자 하나로 나타낸 것이 실루엣 계수예요.</li>
          <li><b>1에 가까울수록</b> 잘 묶인 거예요.</li>
        </ul>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" className="min-h-12" onClick={() => setShowTable(!showTable)} aria-expanded={showTable}>
          {showTable ? "데이터 표 닫기" : "데이터 표 보기"}
        </Button>
        <p className="text-lg text-slate-600">점을 누르면 그 도시의 실루엣 값을 볼 수 있어요.</p>
      </div>

      {showTable && (
        <div className="overflow-x-auto rounded-3xl border-2 border-slate-200 bg-white">
          <table className="w-full text-left text-lg">
            <thead className="bg-slate-50 text-base text-slate-600">
              <tr><th className="p-3">도시</th><th className="p-3">대중교통사용비율(%)</th><th className="p-3">서울통행비율(%)</th></tr>
            </thead>
            <tbody>
              {CITIES.map((c) => (
                <tr key={c.name} className="border-t border-slate-100">
                  <td className="p-3 font-bold">{c.name}</td><td className="p-3">{c.transit}</td><td className="p-3">{c.seoul}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="grid gap-5 lg:grid-cols-3" aria-label="K별 군집 결과">
        {results.map((r) => {
          const pts: ChartPoint[] = CITIES.map((c, i) => ({
            id: `t${i}`,
            label: `${c.name} (대중교통 ${c.transit}%, 서울 ${c.seoul}%)`,
            x: c.transit,
            y: c.seoul,
            cluster: r.assignments[i],
            shortLabel: c.name,
          }));
          return (
            <div key={r.k} className="rounded-3xl border-2 border-slate-200 bg-white p-3">
              <h2 className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-2xl font-extrabold">
                <span>K = {r.k}</span>
                {revealed && (
                  <span className={r.k === best.k ? "text-emerald-700" : ""}>
                    실루엣 계수 {f2(r.mean)}{r.k === best.k ? " ⭐ 가장 높아요" : ""}
                  </span>
                )}
              </h2>
              <ScatterChart
                points={pts}
                xDomain={[0, 60]}
                yDomain={[0, 40]}
                xTicks={niceTicks(0, 60, 10)}
                yTicks={niceTicks(0, 40, 10)}
                xLabel="대중교통사용비율(%)"
                yLabel="서울통행비율(%)"
                onSelect={setSelected}
                selectedIds={selected}
                showLabels
              />
              {revealed && selectedIdx.length > 0 && (
                <ul className="mt-2 space-y-1 text-lg">
                  {selectedIdx.map((i) => (
                    <li key={i} className="rounded-xl bg-slate-50 px-3 py-2">
                      <span style={{ color: clusterColor(r.assignments[i]) }} aria-hidden>{clusterIcon(r.assignments[i])}</span>{" "}
                      <b>{CITIES[i].name}</b>의 실루엣 값 <b>{f2(r.perPoint[i])}</b>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>

      <section className="space-y-4 rounded-3xl border-2 border-slate-200 bg-white p-4" aria-label="가장 알맞은 K 고르기">
        <h2 className="text-2xl font-extrabold">① 어떤 K가 가장 잘 묶였다고 생각해요?</h2>
        <div className="flex flex-wrap gap-3" role="group" aria-label="K 고르기">
          {KS.map((k) => (
            <button
              key={k}
              onClick={() => setGuess(k)}
              disabled={revealed}
              aria-pressed={guess === k}
              className={`min-h-14 min-w-24 rounded-2xl border-2 text-xl font-extrabold transition active:scale-95 disabled:opacity-60 ${
                guess === k ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white hover:bg-slate-100"
              }`}
            >
              K = {k}
            </button>
          ))}
        </div>
        {!revealed ? (
          <Button disabled={guess === null} onClick={() => setRevealed(true)}>실루엣 계수 확인하기</Button>
        ) : (
          <div className="space-y-4" aria-live="polite">
            <h2 className="text-2xl font-extrabold">② 실루엣 계수를 비교해 봐요</h2>
            <ul className="space-y-2">
              {results.map((r) => (
                <li key={r.k} className="flex items-center gap-3 text-lg font-bold">
                  <span className="w-16 shrink-0">K = {r.k}</span>
                  <div className="h-8 flex-1 rounded-full bg-slate-100">
                    <div
                      className={`h-8 rounded-full ${r.k === best.k ? "bg-emerald-600" : "bg-slate-400"}`}
                      style={{ width: `${Math.max(0, r.mean) * 100}%` }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right">{f2(r.mean)}</span>
                </li>
              ))}
            </ul>
            <p className="rounded-2xl bg-emerald-50 p-4 text-xl font-bold leading-relaxed">
              {guess === best.k ? "내 생각과 같아요! " : `내 생각은 K = ${guess}였어요. `}
              실루엣 계수가 가장 높은 것은 <b>K = {best.k}</b>({f2(best.mean)})이에요. 그래서 경기도 12개 도시는 {best.k}개 그룹으로 묶는 것이 가장 알맞아요.
            </p>
            <Button variant="ghost" onClick={() => { setRevealed(false); setGuess(null); }}>다시 골라 보기</Button>
          </div>
        )}
      </section>
    </main>
  );
}
