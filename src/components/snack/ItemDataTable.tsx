"use client";

import { useState } from "react";
import { clusterColor, clusterIcon } from "@/components/chart/cluster-style";
import { Button } from "@/components/ui/Button";
import type { DatasetSpec, Item } from "@/lib/dataset";

/** [데이터 표 보기] 버튼과 이름·값·그룹 목록 (간식·도시 공용) */
export function ItemDataTable({
  items, spec, assignments, nameOf,
}: {
  items: Item[];
  spec: DatasetSpec;
  /** 점 순서대로의 그룹 번호 (-1 이거나 없으면 아직 그룹 없음) */
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
                <th className="py-2 pr-2">{spec.itemNoun}</th>
                <th className="whitespace-nowrap py-2 pr-2">{spec.xName}</th>
                <th className="whitespace-nowrap py-2 pr-2">{spec.yName}</th>
                <th className="py-2">그룹</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s, i) => {
                const g = assignments[i] ?? -1;
                return (
                  <tr key={s.id} className="border-b border-slate-100">
                    <td className="py-2 pr-2 font-bold">{s.name}{s.sub && <span className="font-normal text-slate-500"> ({s.sub})</span>}</td>
                    <td className="whitespace-nowrap py-2 pr-2">{spec.formatX(s.x)}</td>
                    <td className="whitespace-nowrap py-2 pr-2">{spec.formatY(s.y)}</td>
                    <td className="whitespace-nowrap py-2 font-bold" style={{ color: g >= 0 ? clusterColor(g) : undefined }}>
                      {g >= 0 ? `${clusterIcon(g)} ${nameOf(g)}` : "-"}
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
