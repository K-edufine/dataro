"use client";

import { CLUSTER_SHAPE_ICONS, clusterColor, defaultClusterName } from "@/components/chart/cluster-style";
import { Button } from "@/components/ui/Button";
import { preferenceText, won } from "@/lib/format";
import type { Snack } from "@/types/snack";

/** 그룹을 고르고, 간식 목록에서도 눌러서 묶을 수 있는 패널 (그래프에서 끌어도 된다) */
export function KGroupPicker({
  k, snacks, groups, activeGroup, onActive, onTap, onClear, onDone,
}: {
  k: number;
  snacks: Snack[];
  groups: number[];
  activeGroup: number;
  onActive: (g: number) => void;
  onTap: (snackId: string) => void;
  onClear: () => void;
  onDone: () => void;
}) {
  const unassigned = groups.filter((g) => g < 0).length;
  const empties = Array.from({ length: k }, (_, c) => c).filter((c) => !groups.includes(c));
  const ready = unassigned === 0 && empties.length === 0;

  let hint = "";
  if (unassigned > 0) hint = `아직 안 묶은 간식이 ${unassigned}개 있어요.`;
  else if (empties.length > 0) hint = `${empties.map((c) => defaultClusterName(c)).join(", ")}에 간식이 하나도 없어요.`;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-amber-50 p-4 text-xl font-bold leading-relaxed" aria-live="polite">
        간식을 <span className="text-sky-700">{k}개 그룹</span>으로 묶어 보세요.
        <div className="mt-1 text-lg font-normal text-slate-700">
          ① 그룹을 고르고 ② 그래프에서 끌어서 네모를 그리거나 간식을 톡 눌러요. 같은 간식을 한 번 더 누르면 풀려요.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="묶을 그룹 고르기">
        {Array.from({ length: k }, (_, c) => (
          <button
            key={c}
            role="radio"
            aria-checked={activeGroup === c}
            onClick={() => onActive(c)}
            className={`flex min-h-16 items-center justify-center gap-2 rounded-2xl border-4 px-3 text-xl font-extrabold transition active:scale-95 ${
              activeGroup === c ? "bg-white shadow-md" : "border-transparent bg-slate-100"
            }`}
            style={activeGroup === c ? { borderColor: clusterColor(c) } : undefined}
          >
            <span className="text-3xl" style={{ color: clusterColor(c) }} aria-hidden>{CLUSTER_SHAPE_ICONS[c % 5]}</span>
            {defaultClusterName(c)}
            <span className="text-base font-bold text-slate-600">({groups.filter((g) => g === c).length}개)</span>
          </button>
        ))}
      </div>

      <ul className="grid grid-cols-2 gap-2">
        {snacks.map((s, i) => {
          const g = groups[i];
          return (
            <li key={s.id}>
              <button
                onClick={() => onTap(s.id)}
                className="flex min-h-14 w-full items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-3 text-left transition active:scale-95"
                aria-label={`${s.name}, ${g >= 0 ? defaultClusterName(g) : "아직 안 묶음"}`}
              >
                <span className="text-2xl" style={{ color: g >= 0 ? clusterColor(g) : "#9ca3af" }} aria-hidden>
                  {g >= 0 ? CLUSTER_SHAPE_ICONS[g % 5] : "○"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-extrabold">{s.name}</span>
                  <span className="block text-sm text-slate-600">{won(s.price)} · {preferenceText(s.taste)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="text-lg font-bold">
        {snacks.length - unassigned} / {snacks.length}개를 묶었어요
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
