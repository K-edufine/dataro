"use client";

import { useMemo, useState } from "react";
import { BackLink } from "@/components/ui/BackLink";
import {
  ScatterChart, niceTicks, type ChartPoint, type ChartRegion,
} from "@/components/chart/ScatterChart";
import { KLineChart } from "@/components/chart/KLineChart";
import { CLUSTER_SHAPE_ICONS, clusterColor, defaultClusterName } from "@/components/chart/cluster-style";
import { SnackDataTable } from "./SnackDataTable";
import { SnackDetailCard } from "./SnackDetailCard";
import { preferenceText, scaleText, won } from "@/lib/format";
import { WIDE_RADIUS_LIMIT, evaluateK, summarize, toScale, type Issue, type KEvaluation, type Point } from "@/lib/kmeans";
import type { GradeBand } from "@/lib/schools";
import type { Snack } from "@/types/snack";

const K_OPTIONS = [2, 3, 4, 5];
const DEFAULT_K = 3;
const SEED = 1; // 같은 K는 언제나 같은 결과

const ISSUE_TEXT: Record<Issue, string> = {
  wide: "⚠ 넓은 그룹이 있어요",
  single: "⚠ 혼자인 그룹이 많아요",
};
const ISSUE_SHORT: Record<Issue, string> = { wide: "⚠ 넓어요", single: "⚠ 잘게 나눴어요" };

function priceStep(max: number) {
  if (max <= 3000) return 500;
  if (max <= 6000) return 1000;
  return Math.ceil(max / 5 / 500) * 500;
}

function verdict(ev: KEvaluation, short = false): string {
  if (ev.issues.length === 0) return short ? "✅ 알맞아요" : "✅ 알맞아 보여요";
  return ev.issues.map((i) => (short ? ISSUE_SHORT[i] : ISSUE_TEXT[i])).join(" · ");
}

/** 5차시: 내 데이터로 K를 바꿔 보며 알맞은 K 찾기 */
export function KAnalysis({ snacks, gradeBand, title }: { snacks: Snack[]; gradeBand: GradeBand; title: string }) {
  const points = useMemo<Point[]>(() => snacks.map((s) => ({ id: s.id, x: s.price, y: s.taste })), [snacks]);
  const evals = useMemo(() => K_OPTIONS.map((k) => evaluateK(points, k, { seed: SEED })), [points]);

  const [k, setK] = useState(DEFAULT_K);
  const [names, setNames] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const sel = evals.find((e) => e.state.k === k) ?? evals[0];
  const selK = sel.state.k;
  const summaries = useMemo(() => summarize(sel.state), [sel]);
  const nameOf = (c: number) => (names[`${selK}-${c}`]?.trim() ? names[`${selK}-${c}`] : defaultClusterName(c));

  const maxPrice = Math.max(...snacks.map((s) => s.price));
  const xMax = Math.max(1000, Math.ceil((maxPrice * 1.1) / 500) * 500);
  const { bounds } = sel.state;

  const chartPoints: ChartPoint[] = snacks.map((s, i) => ({
    id: s.id,
    label: `${s.name} (${won(s.price)}, ${preferenceText(s.taste)})`,
    x: s.price,
    y: s.taste,
    cluster: sel.state.assignments[i],
  }));

  // 그룹 넓이: 정규화 거리(반지름)를 가격·선호도 단위로 되돌려 타원으로 그린다
  const regions: ChartRegion[] = sel.groups
    .filter((g) => g.count > 1)
    .map((g) => ({
      cluster: g.index,
      x: sel.state.centroids[g.index][0],
      y: sel.state.centroids[g.index][1],
      rx: g.radius * (bounds.maxX - bounds.minX),
      ry: g.radius * (bounds.maxY - bounds.minY),
      wide: g.radius > WIDE_RADIUS_LIMIT,
    }));

  const groupOf = (id: string) => sel.state.assignments[snacks.findIndex((s) => s.id === id)];
  const selectedSnacks = selectedIds
    .map((id) => snacks.find((s) => s.id === id))
    .filter((s): s is Snack => !!s);

  const wideLimitScale = toScale(WIDE_RADIUS_LIMIT);

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
              onClick={() => { setK(n); setSelectedIds([]); }}
              aria-pressed={n === selK}
              className={`min-h-14 min-w-14 rounded-2xl border-2 text-xl font-extrabold transition active:scale-95 ${
                n === selK ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white hover:bg-slate-100"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </header>

      <p className="mb-4 rounded-3xl bg-amber-50 p-4 text-xl font-bold leading-relaxed">
        K를 바꿔 가며 눌러 보세요. 점선 동그라미(그룹 넓이)가 너무 크지 않고, 혼자인 그룹이 많지 않은 K가 알맞아요.
        {gradeBand === "high" && " 그리고 아래 꺾은선에서 K를 늘릴 때 평균 거리가 크게 줄다가 조금만 줄어드는 곳도 찾아봐요."}
      </p>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* 왼쪽: 그래프 */}
        <section aria-label="내 간식 그래프" className="space-y-3">
          <ScatterChart
            points={chartPoints}
            regions={regions}
            centroids={sel.state.centroids}
            xDomain={[0, xMax]}
            yDomain={[0.5, 5.5]}
            xTicks={niceTicks(0, xMax, priceStep(xMax))}
            yTicks={[1, 2, 3, 4, 5]}
            xLabel="가격(원)"
            yLabel="선호도(점)"
            formatX={(v) => v.toLocaleString("ko-KR")}
            onSelect={setSelectedIds}
            selectedIds={selectedIds}
          />
          <p className="text-base text-slate-600">
            점선 동그라미는 그룹이 얼마나 넓게 퍼졌는지 보여 줘요. 빨간 점선은 너무 넓다는 뜻이에요.
          </p>
          <div className="overflow-x-auto rounded-3xl border-2 border-slate-200 bg-white p-3">
            <h2 className="mb-1 text-xl font-extrabold">K={selK} 결과: {verdict(sel)}</h2>
            <table className="w-full text-left text-lg">
              <thead>
                <tr className="border-b-2 border-slate-200 text-base text-slate-600">
                  <th className="py-2 pr-2">그룹 이름</th>
                  <th className="whitespace-nowrap py-2 pr-2">개수</th>
                  <th className="whitespace-nowrap py-2 pr-2">평균 가격</th>
                  <th className="whitespace-nowrap py-2 pr-2">평균 선호도</th>
                  <th className="whitespace-nowrap py-2 pr-2">퍼진 정도</th>
                  <th className="whitespace-nowrap py-2">넓이</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((s) => {
                  const g = sel.groups[s.index];
                  const wide = g.radius > WIDE_RADIUS_LIMIT;
                  return (
                    <tr key={s.index} className="border-b border-slate-100">
                      <td className="py-2 pr-2">
                        <label className="flex items-center gap-2">
                          <span className="text-2xl" style={{ color: clusterColor(s.index) }} aria-hidden>{CLUSTER_SHAPE_ICONS[s.index % 5]}</span>
                          <input
                            value={names[`${selK}-${s.index}`] ?? ""}
                            placeholder={defaultClusterName(s.index)}
                            maxLength={12}
                            onChange={(e) => setNames({ ...names, [`${selK}-${s.index}`]: e.target.value })}
                            aria-label={`${s.index + 1}번 그룹 이름 붙이기`}
                            className="min-h-12 w-full min-w-24 rounded-xl border-2 border-slate-300 px-3 text-lg font-bold focus:border-sky-600 focus:outline-none"
                          />
                        </label>
                      </td>
                      <td className="whitespace-nowrap py-2 pr-2 font-bold">{s.count}개</td>
                      <td className="whitespace-nowrap py-2 pr-2 font-bold">{won(s.meanX)}</td>
                      <td className="whitespace-nowrap py-2 pr-2 font-bold">{preferenceText(s.meanY)}</td>
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-2" title={`평균 거리 ${scaleText(toScale(g.meanDistance))}`}>
                          <div className="h-3 w-16 overflow-hidden rounded-full bg-slate-200">
                            <div className="h-full bg-sky-600" style={{ width: `${Math.min(100, toScale(g.meanDistance) * 10)}%` }} />
                          </div>
                          <span className="font-bold">{scaleText(toScale(g.meanDistance))}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap py-2 font-bold">
                        {g.count === 1 ? "혼자예요" : wide ? `⚠ ${scaleText(toScale(g.radius))} 넓어요` : `${scaleText(toScale(g.radius))} 좋아요`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-base text-slate-600">
              거리는 가격과 선호도를 똑같은 0~10 눈금으로 바꿔서 쟀어요. <b>퍼진 정도</b>는 점들이 그룹 중심에서 떨어진 평균 거리이고,
              <b> 넓이</b>는 중심에서 가장 먼 점까지의 거리예요. {scaleText(wideLimitScale)}보다 크면 너무 넓다고 봐요.
            </p>
          </div>

          <SnackDetailCard snacks={selectedSnacks} groupOf={groupOf} nameOf={nameOf} onClose={() => setSelectedIds([])} />
        </section>

        {/* 오른쪽: 판단 기준 */}
        <section aria-label="K가 알맞은지 살펴보기" className="space-y-4">
          <div className="overflow-x-auto rounded-3xl border-2 border-slate-200 bg-white p-3">
            <h2 className="mb-2 text-xl font-extrabold">K를 비교해 봐요</h2>
            <table className="w-full text-left text-lg">
              <thead>
                <tr className="border-b-2 border-slate-200 text-base text-slate-600">
                  <th className="py-2 pr-2">K</th>
                  <th className="whitespace-nowrap py-2 pr-2">평균 거리</th>
                  <th className="whitespace-nowrap py-2 pr-2">가장 넓은 그룹</th>
                  <th className="py-2">판정</th>
                </tr>
              </thead>
              <tbody>
                {evals.map((e) => (
                  <tr
                    key={e.state.k}
                    onClick={() => { setK(e.state.k); setSelectedIds([]); }}
                    className={`cursor-pointer border-b border-slate-100 ${e.state.k === selK ? "bg-sky-50" : ""}`}
                  >
                    <td className="py-2 pr-2 font-extrabold">K={e.state.k}</td>
                    <td className="whitespace-nowrap py-2 pr-2 font-bold">{scaleText(toScale(e.meanDistance))}</td>
                    <td className="whitespace-nowrap py-2 pr-2 font-bold">{scaleText(toScale(e.maxRadius))}</td>
                    <td className="whitespace-nowrap py-2 font-bold">{verdict(e, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {gradeBand === "high" && (
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold">K를 늘리면 평균 거리가 어떻게 달라질까?</h2>
              <KLineChart
                items={evals.map((e) => ({ k: e.state.k, value: toScale(e.meanDistance) }))}
                selectedK={selK}
                onSelect={(n) => { setK(n); setSelectedIds([]); }}
              />
            </div>
          )}

          <SnackDataTable snacks={snacks} assignments={sel.state.assignments} nameOf={nameOf} />
        </section>
      </div>
    </main>
  );
}
