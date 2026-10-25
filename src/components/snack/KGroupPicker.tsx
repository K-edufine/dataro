"use client";

import { clusterColor, clusterIcon, defaultClusterName } from "@/components/chart/cluster-style";
import { Button } from "@/components/ui/Button";
import type { DatasetSpec, Item } from "@/lib/dataset";
import { eulReul, iGa } from "@/lib/korean";

/** 그룹을 고르고, 목록에서도 눌러서 묶을 수 있는 패널 (그래프에서 끌어도 된다). 간식·도시 공용 */
export function KGroupPicker({
  k, items, spec, groups, activeGroup, onActive, onTap, onClear, onDone,
}: {
  k: number;
  items: Item[];
  spec: DatasetSpec;
  groups: number[];
  activeGroup: number;
  onActive: (g: number) => void;
  onTap: (itemId: string) => void;
  onClear: () => void;
  onDone: () => void;
}) {
  const unassigned = groups.filter((g) => g < 0).length;
  const empties = Array.from({ length: k }, (_, c) => c).filter((c) => !groups.includes(c));
  const ready = unassigned === 0 && empties.length === 0;

  let hint = "";
  if (unassigned > 0) hint = `아직 안 묶은 ${spec.itemNoun} ${unassigned}개가 있어요.`;
  else if (empties.length > 0) hint = `${empties.map((c) => defaultClusterName(c)).join(", ")}에 ${iGa(spec.itemNoun)} 하나도 없어요.`;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-amber-50 p-4 text-xl font-bold leading-relaxed" aria-live="polite">
        {eulReul(spec.itemNoun)} <span className="text-sky-700">{k}개 그룹</span>으로 묶어 보세요.
        <div className="mt-1 text-lg font-normal text-slate-700">
          ① 그룹을 고르고 ② 그래프에서 끌어서 네모를 그리거나 {eulReul(spec.itemNoun)} 톡 눌러요. 같은 {eulReul(spec.itemNoun)} 한 번 더 누르면 풀려요.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="묶을 그룹 고르기">
        {Array.from({ length: k }, (_, c) => (
          <button
            key={c}
            role="radio"
            aria-checked={activeGroup === c}
            onClick={() => onActive(c)}
            className={`flex min-h-16 items-center justify-center gap-2 rounded-2xl border-4 px-2 text-lg font-extrabold transition active:scale-95 ${
              activeGroup === c ? "bg-white shadow-md" : "border-transparent bg-slate-100"
            }`}
            style={activeGroup === c ? { borderColor: clusterColor(c) } : undefined}
          >
            <span className="text-3xl" style={{ color: clusterColor(c) }} aria-hidden>{clusterIcon(c)}</span>
            {defaultClusterName(c)}
            <span className="text-base font-bold text-slate-600">({groups.filter((g) => g === c).length})</span>
          </button>
        ))}
      </div>

      <ul className={`grid grid-cols-2 gap-2 ${items.length > 12 ? "max-h-[26rem] overflow-y-auto pr-1" : ""}`}>
        {items.map((s, i) => {
          const g = groups[i];
          return (
            <li key={s.id}>
              <button
                onClick={() => onTap(s.id)}
                className="flex min-h-14 w-full items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-3 text-left transition active:scale-95"
                aria-label={`${s.name}, ${g >= 0 ? defaultClusterName(g) : "아직 안 묶음"}`}
              >
                <span className="text-2xl" style={{ color: g >= 0 ? clusterColor(g) : "#9ca3af" }} aria-hidden>
                  {g >= 0 ? clusterIcon(g) : "○"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-extrabold">{s.name}</span>
                  <span className="block truncate text-sm text-slate-600">{spec.formatX(s.x)} · {spec.formatY(s.y)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="text-lg font-bold">
        {items.length - unassigned} / {items.length}개를 묶었어요
        {hint && <span className="ml-2 text-rose-600">{hint}</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={onClear}>모두 풀기</Button>
        <Button className="min-w-48 flex-1" disabled={!ready} onClick={onDone}>
          {ready ? "다 묶었어요 ▶" : "모두 묶어야 해요"}
        </Button>
      </div>
    </div>
  );
}
