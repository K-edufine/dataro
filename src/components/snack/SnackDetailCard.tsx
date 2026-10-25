"use client";

import { CLUSTER_SHAPE_ICONS, clusterColor } from "@/components/chart/cluster-style";
import { Button } from "@/components/ui/Button";
import { preferenceText, won } from "@/lib/format";
import type { Snack } from "@/types/snack";

/** 점을 눌렀을 때 보이는 상세 카드. 겹쳐 있는 점은 한꺼번에 보여 준다. */
export function SnackDetailCard({
  snacks, groupOf, nameOf, onClose,
}: {
  snacks: Snack[];
  groupOf: (id: string) => number;
  nameOf: (cluster: number) => string;
  onClose: () => void;
}) {
  if (snacks.length === 0) return null;
  return (
    <div className="rounded-3xl border-2 border-slate-800 bg-white p-4 shadow-md" role="region" aria-label="간식 자세히 보기">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xl font-extrabold">
          {snacks.length > 1 ? `겹쳐 있는 간식 ${snacks.length}개` : "간식 자세히 보기"}
        </h2>
        <Button variant="ghost" className="min-h-12 px-4" onClick={onClose}>닫기</Button>
      </div>
      <ul className="space-y-2">
        {snacks.map((s) => {
          const g = groupOf(s.id);
          return (
            <li key={s.id} className="rounded-2xl bg-slate-50 p-3 text-lg">
              <span className="font-extrabold">{s.name}</span>
              {" · "}가격 {won(s.price)}{" · "}선호도 {preferenceText(s.taste)}
              {g >= 0 && (
                <span className="ml-2 font-bold" style={{ color: clusterColor(g) }}>
                  {CLUSTER_SHAPE_ICONS[g % 5]} {nameOf(g)}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
