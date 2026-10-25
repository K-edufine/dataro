import { scaleText } from "@/lib/format";

interface Item {
  k: number;
  /** 0~10 눈금으로 환산한 평균 거리 */
  value: number;
}

const W = 420;
const H = 260;
const M = { l: 56, r: 24, t: 24, b: 56 };

/** K를 늘렸을 때 평균 거리가 어떻게 줄어드는지 보여 주는 꺾은선 (고학년용) */
export function KLineChart({ items, selectedK, onSelect }: { items: Item[]; selectedK: number; onSelect: (k: number) => void }) {
  if (items.length === 0) return null;
  const maxV = Math.max(1, Math.ceil(Math.max(...items.map((i) => i.value))));
  const ks = items.map((i) => i.k);
  const sx = (k: number) => M.l + ((k - ks[0]) / Math.max(1, ks[ks.length - 1] - ks[0])) * (W - M.l - M.r);
  const sy = (v: number) => H - M.b - (v / maxV) * (H - M.t - M.b);
  const yTicks = Array.from({ length: maxV + 1 }, (_, i) => i).filter((v) => maxV <= 6 || v % 2 === 0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full rounded-3xl border-2 border-slate-200 bg-white" role="img" aria-label="K에 따른 평균 거리 꺾은선 그래프">
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={M.l} x2={W - M.r} y1={sy(t)} y2={sy(t)} stroke="#e5e7eb" strokeWidth={1.5} />
          <text x={M.l - 8} y={sy(t) + 6} textAnchor="end" fontSize={16} fill="#475569">{t}</text>
        </g>
      ))}
      <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} stroke="#334155" strokeWidth={3} />
      <line x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} stroke="#334155" strokeWidth={3} />
      <polyline
        points={items.map((i) => `${sx(i.k)},${sy(i.value)}`).join(" ")}
        fill="none" stroke="#0072B2" strokeWidth={4} strokeLinejoin="round"
      />
      {items.map((i) => {
        const on = i.k === selectedK;
        return (
          <g key={i.k} className="cursor-pointer" onClick={() => onSelect(i.k)} role="button" aria-label={`K=${i.k}, 평균 거리 ${scaleText(i.value)}`}>
            <circle cx={sx(i.k)} cy={sy(i.value)} r={20} fill="transparent" />
            <circle cx={sx(i.k)} cy={sy(i.value)} r={on ? 10 : 7} fill={on ? "#E69F00" : "#0072B2"} stroke="#fff" strokeWidth={3} />
            <text x={sx(i.k)} y={sy(i.value) - 16} textAnchor="middle" fontSize={17} fontWeight={700} fill="#1f2937">{scaleText(i.value)}</text>
            <text x={sx(i.k)} y={H - M.b + 28} textAnchor="middle" fontSize={19} fontWeight={on ? 800 : 500} fill="#1f2937">K={i.k}</text>
          </g>
        );
      })}
      <text x={(M.l + W - M.r) / 2} y={H - 8} textAnchor="middle" fontSize={17} fontWeight={700} fill="#1f2937">그룹 개수(K)</text>
      <text x={16} y={(M.t + H - M.b) / 2} textAnchor="middle" fontSize={17} fontWeight={700} fill="#1f2937" transform={`rotate(-90 16 ${(M.t + H - M.b) / 2})`}>평균 거리</text>
    </svg>
  );
}
