"use client";

import { useState } from "react";
import { CLUSTER_SHAPE_ICONS, clusterColor } from "@/components/chart/cluster-style";
import { Button } from "@/components/ui/Button";
import { preferenceText, won } from "@/lib/format";
import type { Snack } from "@/types/snack";

/** [데이터 표 보기] 버튼과 간식 이름·가격·선호도·그룹 목록 */
export function SnackDataTable({
  snacks, assignments, nameOf,
}: {
  snacks: Snack[];
  /** 간식 순서대로의 그룹 번호 (-1 이면 아직 그룹 없음) */
  assignments: readonly number[];
  nameOf: (cluster: number) => string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" className="w-full" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? "데이터 표 닫기" : "데이터 표 보기"}
      </Button>
      {open && (
        <div className="max-h-96 overflow-auto rounded-3xl border-2 border-slate-200 bg-white p-3">
          <table className="w-full text-left text-lg">
            <thead className="sticky top-0 bg-white text-base text-slate-600">
              <tr className="border-b-2 border-slate-200">
                <th className="py-2 pr-2">간식</th>
                <th className="py-2 pr-2">가격</th>
                <th className="py-2 pr-2">선호도</th>
                <th className="py-2">그룹</th>
              </tr>
            </thead>
            <tbody>
              {snacks.map((s, i) => {
                const g = assignments[i];
                return (
                  <tr key={s.id} className="border-b border-slate-100">
                    <td className="py-2 pr-2 font-bold">{s.name}</td>
                    <td className="whitespace-nowrap py-2 pr-2">{won(s.price)}</td>
                    <td className="whitespace-nowrap py-2 pr-2">{preferenceText(s.taste)}</td>
                    <td className="py-2 font-bold" style={{ color: g >= 0 ? clusterColor(g) : undefined }}>
                      {g >= 0 ? `${CLUSTER_SHAPE_ICONS[g % 5]} ${nameOf(g)}` : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
