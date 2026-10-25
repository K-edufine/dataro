"use client";

import { useId, useMemo, useState } from "react";
import {
  clusterColor,
  shapePath,
  starPath,
} from "./cluster-style";

export interface ChartPoint {
  id: string;
  /** 툴팁에 보일 이름 (간식 이름, 익명 코드 등) */
  label: string;
  x: number;
  y: number;
  /** 소속 그룹 번호. 아직 배정 전이면 -1 */
  cluster: number;
}

/** 그룹의 넓이를 보여 주는 점선 타원. x, y 는 중심, rx, ry 는 반지름 (모두 원래 단위) */
export interface ChartRegion {
  cluster: number;
  x: number;
  y: number;
  rx: number;
  ry: number;
  /** 너무 넓은 그룹이면 굵게 표시 */
  wide?: boolean;
}

interface Props {
  points: ChartPoint[];
  regions?: ChartRegion[];
  /** 원래 단위의 중심점 */
  centroids?: readonly (readonly [number, number])[];
  xDomain: [number, number];
  yDomain: [number, number];
  xTicks: number[];
  yTicks: number[];
  xLabel: string;
  yLabel: string;
  formatX?: (v: number) => string;
  formatY?: (v: number) => string;
  /** 점을 눌렀을 때: 겹쳐 있는 점들의 id 목록 */
  onSelect?: (ids: string[]) => void;
  selectedIds?: string[];
  /** 내 점처럼 강조할 점 */
  highlightId?: string;
}

const W = 800;
const H = 520;
const M = { l: 84, r: 48, t: 28, b: 76 };
const MERGE_DIST = 18; // 이 거리 안의 점은 "겹쳐 있다"고 본다
const MAX_TIP_NAMES = 4;

export function ScatterChart({
  points, regions = [], centroids = [], xDomain, yDomain, xTicks, yTicks, xLabel, yLabel,
  formatX = String, formatY = String, onSelect, selectedIds = [], highlightId,
}: Props) {
  const clipId = useId();
  const [hoverGroup, setHoverGroup] = useState<{ ids: string[]; px: number; py: number } | null>(null);

  const sx = (v: number) => M.l + ((v - xDomain[0]) / (xDomain[1] - xDomain[0])) * (W - M.l - M.r);
  const xScale = (W - M.l - M.r) / (xDomain[1] - xDomain[0]);
  const yScale = (H - M.t - M.b) / (yDomain[1] - yDomain[0]);
  const sy = (v: number) => H - M.b - ((v - yDomain[0]) / (yDomain[1] - yDomain[0])) * (H - M.t - M.b);

  const placed = useMemo(
    () => points.map((p) => ({ ...p, px: sx(p.x), py: sy(p.y) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [points, xDomain[0], xDomain[1], yDomain[0], yDomain[1]],
  );

  function groupAt(id: string) {
    const me = placed.find((p) => p.id === id)!;
    const ids = placed
      .filter((p) => Math.hypot(p.px - me.px, p.py - me.py) <= MERGE_DIST)
      .sort((a, b) => Math.hypot(a.px - me.px, a.py - me.py) - Math.hypot(b.px - me.px, b.py - me.py))
      .map((p) => p.id);
    return { ids, px: me.px, py: me.py };
  }

  const labelOf = (id: string) => placed.find((p) => p.id === id)?.label ?? "";

  return (
    <div className="relative w-full select-none">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full rounded-3xl border-2 border-slate-200 bg-white"
        role="img"
        aria-label={`${xLabel}와 ${yLabel}로 그린 점 그래프`}
      >
        {/* 격자와 눈금 */}
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={M.l} x2={W - M.r} y1={sy(t)} y2={sy(t)} stroke="#e5e7eb" strokeWidth={1.5} />
            <text x={M.l - 12} y={sy(t) + 7} textAnchor="end" fontSize={20} fill="#475569">{formatY(t)}</text>
          </g>
        ))}
        {xTicks.map((t) => (
          <g key={`x${t}`}>
            <line x1={sx(t)} x2={sx(t)} y1={M.t} y2={H - M.b} stroke="#e5e7eb" strokeWidth={1.5} />
            <text x={sx(t)} y={H - M.b + 28} textAnchor="middle" fontSize={20} fill="#475569">{formatX(t)}</text>
          </g>
        ))}
        <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} stroke="#334155" strokeWidth={3} />
        <line x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} stroke="#334155" strokeWidth={3} />
        <text x={(M.l + W - M.r) / 2} y={H - 14} textAnchor="middle" fontSize={24} fontWeight={700} fill="#1f2937">{xLabel}</text>
        <text
          x={22} y={(M.t + H - M.b) / 2} textAnchor="middle" fontSize={24} fontWeight={700} fill="#1f2937"
          transform={`rotate(-90 22 ${(M.t + H - M.b) / 2})`}
        >{yLabel}</text>

        {/* 그룹 넓이 (그래프 안쪽으로만 보이게 자른다) */}
        <clipPath id={clipId}>
          <rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} />
        </clipPath>
        <g clipPath={`url(#${clipId})`} pointerEvents="none">
          {regions.map((r) => (
            <ellipse
              key={`region${r.cluster}`}
              cx={sx(r.x)}
              cy={sy(r.y)}
              rx={r.rx * xScale}
              ry={r.ry * yScale}
              fill={clusterColor(r.cluster)}
              fillOpacity={0.1}
              stroke={r.wide ? "#b91c1c" : clusterColor(r.cluster)}
              strokeWidth={r.wide ? 5 : 3}
              strokeDasharray={r.wide ? "4 5" : "10 7"}
            />
          ))}
        </g>

        {/* 점 */}
        {placed.map((p) => {
          const selected = selectedIds.includes(p.id);
          const highlighted = p.id === highlightId;
          return (
            <g
              key={p.id}
              transform={`translate(${p.px} ${p.py})`}
              className="cursor-pointer outline-none"
              role="button"
              tabIndex={0}
              aria-label={`${p.label}: ${formatX(p.x)}, ${formatY(p.y)}`}
              onPointerEnter={(e) => e.pointerType === "mouse" && setHoverGroup(groupAt(p.id))}
              onPointerLeave={() => setHoverGroup(null)}
              onFocus={() => setHoverGroup(groupAt(p.id))}
              onBlur={() => setHoverGroup(null)}
              onClick={() => onSelect?.(groupAt(p.id).ids)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect?.(groupAt(p.id).ids);
                }
              }}
            >
              {/* 터치하기 쉽게 보이지 않는 큰 영역 */}
              <circle r={22} fill="transparent" />
              {(selected || highlighted) && (
                <circle r={selected ? 20 : 19} fill="none" stroke={highlighted ? "#dc2626" : "#111827"} strokeWidth={4} strokeDasharray={highlighted ? "0" : "6 4"} />
              )}
              <path
                d={shapePath(p.cluster, 11)}
                fill={clusterColor(p.cluster)}
                fillOpacity={0.85}
                stroke="#ffffff"
                strokeWidth={2.5}
                style={{ transition: "fill 0.6s ease" }}
              />
            </g>
          );
        })}

        {/* 중심점: 이동할 때 부드럽게 움직인다 */}
        {centroids.map((c, i) => (
          <g
            key={`centroid${i}`}
            style={{
              transform: `translate(${sx(c[0])}px, ${sy(c[1])}px)`,
              transition: "transform 0.9s ease-in-out",
            }}
            pointerEvents="none"
            aria-hidden
          >
            <path d={starPath(24)} fill={clusterColor(i)} stroke="#111827" strokeWidth={3.5} strokeLinejoin="round" />
          </g>
        ))}
      </svg>

      {/* 툴팁 (한 번에 하나만. 겹친 점은 이름을 함께 보여 줌) */}
      {hoverGroup && (
        <div
          className="pointer-events-none absolute z-10 max-w-[70%] rounded-xl bg-slate-900 px-4 py-2 text-base font-bold text-white shadow-lg"
          style={{
            left: `${Math.min(88, Math.max(12, (hoverGroup.px / W) * 100))}%`,
            top: `${(hoverGroup.py / H) * 100}%`,
            transform: hoverGroup.py < H * 0.3 ? "translate(-50%, 28px)" : "translate(-50%, calc(-100% - 22px))",
          }}
        >
          {hoverGroup.ids.slice(0, MAX_TIP_NAMES).map((id) => (
            <div key={id}>{labelOf(id)}</div>
          ))}
          {hoverGroup.ids.length > MAX_TIP_NAMES && (
            <div className="text-sm font-normal">…외 {hoverGroup.ids.length - MAX_TIP_NAMES}개</div>
          )}
        </div>
      )}
    </div>
  );
}

/** 눈금을 보기 좋은 간격으로 만든다 */
export function niceTicks(min: number, max: number, step: number): number[] {
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}
