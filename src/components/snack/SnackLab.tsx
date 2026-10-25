"use client";

import { useMemo, useState } from "react";
import { BackLink } from "@/components/ui/BackLink";
import { ScatterChart, niceTicks, type ChartPoint } from "@/components/chart/ScatterChart";
import {
  CLUSTER_SHAPE_ICONS,
  clusterColor,
  defaultClusterName,
} from "@/components/chart/cluster-style";
import { Button } from "@/components/ui/Button";
import {
  init, nextAction, runToEnd, step, summarize,
  type KMeansState, type Phase, type Point,
} from "@/lib/kmeans";
import { SnackDataTable } from "./SnackDataTable";
import { SnackDetailCard } from "./SnackDetailCard";
import { preferenceText, won } from "@/lib/format";
import type { Snack } from "@/types/snack";

const K_OPTIONS = [2, 3, 4, 5];
const DEFAULT_K = 3;
const DEFAULT_SEED = 1; // 같은 시드 = 항상 같은 시작 중심점

const GUIDE: Record<Phase, string> = {
  grouped: "",
  ready: "먼저 [중심점 생성]을 눌러 보세요. 별(★) 모양 중심점이 생겨요.",
  centroids: "별(★)이 그룹의 중심이에요. [가까운 그룹 배정]을 눌러 간식을 가장 가까운 별의 그룹으로 보내요.",
  assigned: "간식들이 가장 가까운 별의 색과 모양이 되었어요. [중심점 이동]을 눌러 별을 그룹의 한가운데로 옮겨요.",
  moved: "별이 그룹의 한가운데(평균)로 움직였어요. 가까운 별이 바뀐 간식이 있을 수 있어요. 다시 [가까운 그룹 배정]을 눌러요.",
  converged: "더 이상 바뀌지 않아요. 군집이 완성되었어요! 🎉",
};

const TABLE_TITLE: Record<Phase, string> = {
  grouped: "",
  ready: "",
  centroids: "별(중심점)의 위치",
  assigned: "그룹별 평균 (별은 아직 안 옮겼어요)",
  moved: "별이 옮겨 간 곳 = 그룹 평균",
  converged: "최종 결과",
};

function priceStep(max: number) {
  if (max <= 3000) return 500;
  if (max <= 6000) return 1000;
  return Math.ceil(max / 5 / 500) * 500;
}

function toPoints(snacks: Snack[]): Point[] {
  return snacks.map((s) => ({ id: s.id, x: s.price, y: s.taste }));
}

export function SnackLab({ snacks, title }: { snacks: Snack[]; title: string }) {
  const points = useMemo(() => toPoints(snacks), [snacks]);
  const [k, setK] = useState(DEFAULT_K);
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [km, setKm] = useState<KMeansState>(() => init(points, DEFAULT_K, { seed: DEFAULT_SEED }));
  const [names, setNames] = useState<Record<number, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const effectiveK = km.k; // 간식이 k개보다 적으면 줄어든다
  const action = nextAction(km);
  const summaries = useMemo(() => summarize(km), [km]);
  const nameOf = (c: number) => (names[c]?.trim() ? names[c] : defaultClusterName(c));

  const maxPrice = Math.max(...snacks.map((s) => s.price));
  const xMax = Math.max(1000, Math.ceil((maxPrice * 1.1) / 500) * 500);
  const xTicks = niceTicks(0, xMax, priceStep(xMax));

  const chartPoints: ChartPoint[] = snacks.map((s, i) => ({
    id: s.id,
    label: `${s.name} (${won(s.price)}, ${preferenceText(s.taste)})`,
    x: s.price,
    y: s.taste,
    cluster: km.assignments[i],
  }));

  function reset(nextK: number, nextSeed: number) {
    setKm(init(points, nextK, { seed: nextSeed }));
    setSelectedIds([]);
  }

  function changeK(nextK: number) {
    setK(nextK);
    setNames({});
    reset(nextK, seed);
  }

  function changeSeed() {
    const nextSeed = seed + 1;
    setSeed(nextSeed);
    reset(k, nextSeed);
  }

  const groupOf = (id: string) => km.assignments[snacks.findIndex((s) => s.id === id)];
  const selectedSnacks = selectedIds
    .map((id) => snacks.find((s) => s.id === id))
    .filter((s): s is Snack => !!s);

  return (
    <main className="mx-auto max-w-[1500px] p-4 sm:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <BackLink />
          <h1 className="text-3xl font-extrabold">{title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="그룹 개수 고르기">
          <span className="text-lg font-bold">그룹 개수(K)</span>
          {K_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => changeK(n)}
              aria-pressed={n === k}
              className={`min-h-14 min-w-14 rounded-2xl border-2 text-xl font-extrabold transition active:scale-95 ${
                n === k ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white hover:bg-slate-100"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* 왼쪽: 그래프 */}
        <section aria-label="간식 그래프" className="space-y-3">
          <ScatterChart
            points={chartPoints}
            centroids={km.centroids}
            xDomain={[0, xMax]}
            yDomain={[0.5, 5.5]}
            xTicks={xTicks}
            yTicks={[1, 2, 3, 4, 5]}
            xLabel="가격(원)"
            yLabel="선호도(점)"
            formatX={(v) => v.toLocaleString("ko-KR")}
            onSelect={(ids) => setSelectedIds(ids)}
            selectedIds={selectedIds}
          />
          <p className="text-base text-slate-600">
            점에 마우스를 올리거나 톡 눌러 보세요. 별(★)은 그룹의 중심점이에요.
          </p>

          <SnackDetailCard
            snacks={selectedSnacks}
            groupOf={groupOf}
            nameOf={nameOf}
            onClose={() => setSelectedIds([])}
          />
        </section>

        {/* 오른쪽: 단계 버튼, 안내, 표 */}
        <section aria-label="단계별 체험" className="space-y-4">
          <div className="rounded-3xl bg-amber-50 p-4 text-xl font-bold leading-relaxed" aria-live="polite">
            {GUIDE[km.phase]}
            {km.phase === "converged" && (
              <div className="mt-1 text-lg font-normal text-slate-700">
                별을 {km.iteration}번 옮기고 나서 멈췄어요.
              </div>
            )}
          </div>

          <div className="grid gap-3">
            <Button
              variant={action === "centroids" ? "secondary" : "ghost"}
              disabled={action !== "centroids"}
              onClick={() => setKm(step(km))}
            >
              1 중심점 생성
            </Button>
            <Button
              variant={action === "assign" ? "secondary" : "ghost"}
              disabled={action !== "assign"}
              onClick={() => setKm(step(km))}
            >
              2 가까운 그룹 배정
            </Button>
            <Button
              variant={action === "move" ? "secondary" : "ghost"}
              disabled={action !== "move"}
              onClick={() => setKm(step(km))}
            >
              3 중심점 이동
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" className="min-h-12" onClick={() => reset(k, seed)}>처음부터</Button>
            <Button variant="ghost" className="min-h-12" onClick={changeSeed}>다른 시작점으로</Button>
            <Button variant="ghost" className="min-h-12" disabled={km.phase === "converged"} onClick={() => setKm(runToEnd(km))}>
              끝까지 한 번에
            </Button>
          </div>

          {effectiveK < k && (
            <p className="rounded-2xl bg-rose-50 p-3 text-base font-bold text-rose-700">
              간식이 {snacks.length}개라서 그룹을 {effectiveK}개로 줄였어요.
            </p>
          )}

          {km.phase !== "ready" && (
            <div className="overflow-x-auto rounded-3xl border-2 border-slate-200 bg-white p-3">
              <h2 className="mb-2 text-xl font-extrabold">{TABLE_TITLE[km.phase]}</h2>
              <table className="w-full text-left text-lg">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-base text-slate-600">
                    <th className="py-2 pr-2">그룹 이름</th>
                    <th className="whitespace-nowrap py-2 pr-2">개수</th>
                    <th className="whitespace-nowrap py-2 pr-2">평균 가격</th>
                    <th className="whitespace-nowrap py-2">평균 선호도</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.map((s) => (
                    <tr key={s.index} className="border-b border-slate-100">
                      <td className="py-2 pr-2">
                        <label className="flex items-center gap-2">
                          <span className="text-2xl" style={{ color: clusterColor(s.index) }} aria-hidden>
                            {CLUSTER_SHAPE_ICONS[s.index % 5]}
                          </span>
                          <input
                            value={names[s.index] ?? ""}
                            placeholder={defaultClusterName(s.index)}
                            maxLength={12}
                            onChange={(e) => setNames({ ...names, [s.index]: e.target.value })}
                            aria-label={`${s.index + 1}번 그룹 이름 붙이기`}
                            className="min-h-12 w-full min-w-24 rounded-xl border-2 border-slate-300 px-3 text-lg font-bold focus:border-sky-600 focus:outline-none"
                          />
                        </label>
                      </td>
                      <td className="whitespace-nowrap py-2 pr-2 font-bold">{km.phase === "centroids" ? "-" : `${s.count}개`}</td>
                      <td className="whitespace-nowrap py-2 pr-2 font-bold">{won(s.meanX)}</td>
                      <td className="whitespace-nowrap py-2 font-bold">{preferenceText(s.meanY)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-base text-slate-600">그룹 이름 칸에 우리가 생각한 이름을 써 보세요.</p>
            </div>
          )}

          <SnackDataTable snacks={snacks} assignments={km.assignments} nameOf={nameOf} />
        </section>
      </div>
    </main>
  );
}
