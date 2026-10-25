"use client";

import { CLUSTER_SHAPE_ICONS, clusterColor, defaultClusterName } from "@/components/chart/cluster-style";
import { preferenceText, scaleText, won } from "@/lib/format";
import { WIDE_RADIUS_LIMIT, summarize, toScale, type KEvaluation } from "@/lib/kmeans";

/** 그룹마다 이름 붙이기 + 개수·평균·퍼진 정도·넓이. reveal 이 false 면 "넓어요/좋아요" 같은 판정 말은 숨긴다. */
export function KGroupTable({
  ev, names, onName, reveal,
}: {
  ev: KEvaluation;
  names: Record<number, string>;
  onName: (cluster: number, value: string) => void;
  reveal: boolean;
}) {
  const summaries = summarize(ev.state);
  return (
    <div className="overflow-x-auto rounded-3xl border-2 border-slate-200 bg-white p-3">
      <h2 className="mb-2 text-xl font-extrabold">K={ev.state.k}로 묶은 그룹</h2>
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
            const g = ev.groups[s.index];
            const wide = g.radius > WIDE_RADIUS_LIMIT;
            return (
              <tr key={s.index} className="border-b border-slate-100">
                <td className="py-2 pr-2">
                  <label className="flex items-center gap-2">
                    <span className="text-2xl" style={{ color: clusterColor(s.index) }} aria-hidden>{CLUSTER_SHAPE_ICONS[s.index % 5]}</span>
                    <input
                      value={names[s.index] ?? ""}
                      placeholder={defaultClusterName(s.index)}
                      maxLength={12}
                      onChange={(e) => onName(s.index, e.target.value)}
                      aria-label={`${s.index + 1}번 그룹 이름 붙이기`}
                      className="min-h-12 w-full min-w-28 rounded-xl border-2 border-slate-300 px-3 text-lg font-bold focus:border-sky-600 focus:outline-none"
                    />
                  </label>
                </td>
                <td className="whitespace-nowrap py-2 pr-2 font-bold">{s.count}개</td>
                <td className="whitespace-nowrap py-2 pr-2 font-bold">{won(s.meanX)}</td>
                <td className="whitespace-nowrap py-2 pr-2 font-bold">{preferenceText(s.meanY)}</td>
                <td className="py-2 pr-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-16 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full bg-sky-600" style={{ width: `${Math.min(100, toScale(g.meanDistance) * 10)}%` }} />
                    </div>
                    <span className="font-bold">{scaleText(toScale(g.meanDistance))}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap py-2 font-bold">
                  {scaleText(toScale(g.radius))}
                  {reveal && (g.count === 1 ? " · 혼자예요" : wide ? " · ⚠ 넓어요" : " · 좋아요")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-base text-slate-600">
        거리는 가격과 선호도를 똑같은 0~10 눈금으로 바꿔서 쟀어요. <b>퍼진 정도</b>는 점들이 그룹 중심에서 떨어진 평균 거리이고,
        <b> 넓이</b>는 중심에서 가장 먼 점까지의 거리예요.
      </p>
    </div>
  );
}
