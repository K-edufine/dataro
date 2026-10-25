"use client";

import { won } from "@/lib/format";
import { clampConsume } from "@/lib/choices";

/** 용돈을 소비/저축으로 나누는 선택기. 동전 누르기, 슬라이더, −/+ 버튼 모두 된다. */
export function AmountPicker({
  total, step, value, onChange, reference,
}: {
  total: number;
  step: number;
  /** 소비 금액 */
  value: number;
  onChange: (consume: number) => void;
  /** 이전 선택(1차)을 점선 표시로 알려 준다 */
  reference?: { label: string; consume: number };
}) {
  const coins = Math.round(total / step);
  const filled = Math.round(value / step);
  const set = (v: number) => onChange(clampConsume(v, total, step));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-amber-100 p-4 text-center">
          <p className="text-xl font-extrabold">🛍️ 쓰기 (소비)</p>
          <p className="text-4xl font-extrabold" aria-live="polite">{won(value)}</p>
        </div>
        <div className="rounded-3xl bg-sky-100 p-4 text-center">
          <p className="text-xl font-extrabold">🐷 모으기 (저축)</p>
          <p className="text-4xl font-extrabold" aria-live="polite">{won(total - value)}</p>
        </div>
      </div>

      {/* 동전: 눌러서 나누는 곳을 정한다 */}
      <div className="grid grid-cols-10 gap-1.5 sm:gap-2" role="group" aria-label="동전을 눌러 소비와 저축을 나눠요">
        {Array.from({ length: coins }, (_, i) => {
          const consume = i < filled;
          return (
            <button
              key={i}
              onClick={() => set((i + 1) * step)}
              aria-label={`소비 ${won((i + 1) * step)}으로 정하기`}
              className={`grid aspect-square min-h-11 place-items-center rounded-full border-4 text-sm font-extrabold transition active:scale-90 ${
                consume ? "border-amber-500 bg-amber-300" : "border-sky-500 bg-sky-200"
              }`}
            >
              {consume ? "쓰" : "모"}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => set(value - step)}
          disabled={value <= 0}
          aria-label={`소비 ${won(step)} 줄이기`}
          className="grid min-h-14 min-w-14 place-items-center rounded-2xl border-2 border-slate-300 bg-white text-3xl font-extrabold transition active:scale-90 disabled:opacity-40"
        >
          −
        </button>
        <input
          type="range" min={0} max={total} step={step} value={value}
          onChange={(e) => set(Number(e.target.value))}
          aria-label="소비 금액"
          className="h-10 flex-1 accent-amber-500"
        />
        <button
          onClick={() => set(value + step)}
          disabled={value >= total}
          aria-label={`소비 ${won(step)} 늘리기`}
          className="grid min-h-14 min-w-14 place-items-center rounded-2xl border-2 border-slate-300 bg-white text-3xl font-extrabold transition active:scale-90 disabled:opacity-40"
        >
          +
        </button>
      </div>

      {reference && (
        <p className="rounded-2xl bg-slate-50 p-3 text-lg font-bold text-slate-700">
          {reference.label}: 소비 {won(reference.consume)} · 저축 {won(total - reference.consume)}
        </p>
      )}
    </div>
  );
}
