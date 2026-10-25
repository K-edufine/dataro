"use client";

import { KLineChart } from "@/components/chart/KLineChart";
import { Button } from "@/components/ui/Button";
import { scaleText } from "@/lib/format";
import { computerJudgment, toScale, type Judgment, type KEvaluation } from "@/lib/kmeans";
import { JUDGMENT_ICON, JUDGMENT_LABEL } from "@/lib/k-trials";
import type { GradeBand } from "@/lib/schools";

export interface SummaryRow {
  k: number;
  ev: KEvaluation;
  judgment: Judgment;
}

/** 모든 K를 해 본 뒤 내 판단과 컴퓨터 판정을 한눈에 비교한다 */
export function KSummary({
  rows, gradeBand, onRedo,
}: { rows: SummaryRow[]; gradeBand: GradeBand; onRedo: (k: number) => void }) {
  const same = rows.filter((r) => r.judgment === computerJudgment(r.ev)).length;
  const goods = rows.filter((r) => r.judgment === "good").map((r) => r.k);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-amber-50 p-4 text-xl font-bold leading-relaxed">
        모두 해 봤어요! 🎉
        <div className="mt-1 text-lg font-normal text-slate-700">
          내 판단과 컴퓨터의 판정이 같은 K는 {rows.length}개 중 <b>{same}개</b>예요.
          {goods.length > 0
            ? ` 내가 ‘알맞아요’라고 고른 K는 ${goods.map((k) => `K=${k}`).join(", ")}예요.`
            : " ‘알맞아요’로 고른 K는 아직 없어요."}
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border-2 border-slate-200 bg-white p-3">
        <h2 className="mb-2 text-xl font-extrabold">K를 비교해 봐요</h2>
        <table className="w-full text-left text-lg">
          <thead>
            <tr className="border-b-2 border-slate-200 text-base text-slate-600">
              <th className="py-2 pr-2">K</th>
              <th className="whitespace-nowrap py-2 pr-2">내 판단</th>
              <th className="whitespace-nowrap py-2 pr-2">컴퓨터</th>
              <th className="whitespace-nowrap py-2 pr-2">평균 거리</th>
              <th className="whitespace-nowrap py-2 pr-2">가장 넓은 그룹</th>
              <th className="py-2"><span className="sr-only">다시 해 보기</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const comp = computerJudgment(r.ev);
              return (
                <tr key={r.k} className="border-b border-slate-100">
                  <td className="py-2 pr-2 font-extrabold">K={r.k}</td>
                  <td className="whitespace-nowrap py-2 pr-2 font-bold">{JUDGMENT_ICON[r.judgment]} {JUDGMENT_LABEL[r.judgment]}</td>
                  <td className="whitespace-nowrap py-2 pr-2 font-bold">
                    {JUDGMENT_ICON[comp]} {JUDGMENT_LABEL[comp]} {comp === r.judgment ? "👍" : ""}
                  </td>
                  <td className="whitespace-nowrap py-2 pr-2 font-bold">{scaleText(toScale(r.ev.meanDistance))}</td>
                  <td className="whitespace-nowrap py-2 pr-2 font-bold">{scaleText(toScale(r.ev.maxRadius))}</td>
                  <td className="py-2"><Button variant="ghost" className="min-h-12 px-3 text-base" onClick={() => onRedo(r.k)}>다시</Button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {gradeBand === "high" && (
        <div className="max-w-xl space-y-2">
          <h2 className="text-xl font-extrabold">K를 늘리면 평균 거리가 어떻게 달라질까?</h2>
          <KLineChart
            items={rows.map((r) => ({ k: r.k, value: toScale(r.ev.meanDistance) }))}
            selectedK={-1}
            onSelect={() => {}}
          />
          <p className="text-base text-slate-600">K를 늘릴수록 평균 거리는 줄어요. 줄어드는 폭이 작아지는 곳을 찾아봐요.</p>
        </div>
      )}
    </div>
  );
}
