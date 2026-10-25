"use client";

import { clusterColor, clusterIcon } from "@/components/chart/cluster-style";
import { Button } from "@/components/ui/Button";
import type { DatasetSpec, Item } from "@/lib/dataset";

/** 점을 눌렀을 때 보이는 상세 카드 (간식·도시 공용). 겹쳐 있는 점은 한꺼번에 보여 준다. */
export function ItemDetailCard({
  items, spec, groupOf, nameOf, onClose,
}: {
  items: Item[];
  spec: DatasetSpec;
  groupOf: (id: string) => number;
  nameOf: (cluster: number) => string;
  onClose: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-3xl border-2 border-slate-800 bg-white p-4 shadow-md" role="region" aria-label={`${spec.itemNoun} 자세히 보기`}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xl font-extrabold">
          {items.length > 1 ? `겹쳐 있는 ${spec.itemNoun} ${items.length}개` : `${spec.itemNoun} 자세히 보기`}
        </h2>
        <Button variant="ghost" className="min-h-12 px-4" onClick={onClose}>닫기</Button>
      </div>
      <ul className="space-y-2">
        {items.map((s) => {
          const g = groupOf(s.id);
          return (
            <li key={s.id} className="rounded-2xl bg-slate-50 p-3 text-lg">
              <span className="font-extrabold">{s.name}</span>
              {s.sub && <span className="text-slate-600"> ({s.sub})</span>}
              {" · "}{spec.xName} {spec.formatX(s.x)}{" · "}{spec.yName} {spec.formatY(s.y)}
              {g >= 0 && (
                <span className="ml-2 font-bold" style={{ color: clusterColor(g) }}>
                  {clusterIcon(g)} {nameOf(g)}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
