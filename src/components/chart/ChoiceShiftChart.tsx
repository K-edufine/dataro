import { CLUSTER_TYPE_LABEL } from "@/lib/cluster-types";
import { kindOf, type MovementKind, type ShiftRow } from "@/lib/choices";

const W = 760;
const ROW = 32;
const M = { l: 170, r: 30, t: 36, b: 34 };

const COLOR: Record<MovementKind | "none", string> = {
  toward: "#D55E00",   // 정보 쪽: 주황, 실선
  against: "#0072B2",  // 반대: 파랑, 점선
  both: "#CC79A7",     // 방향 없음: 분홍
  same: "#6b7280",     // 그대로: 회색 점
  none: "#9ca3af",
};

/** 학생마다 1차 → 2차로 소비 금액이 어떻게 움직였는지 한 줄씩 화살표로 보여 준다 (번호표만 사용) */
export function ChoiceShiftChart({ rows, total }: { rows: ShiftRow[]; total: number }) {
  const H = M.t + rows.length * ROW + M.b;
  const sx = (v: number) => M.l + (v / total) * (W - M.l - M.r);
  const ticks = Array.from({ length: 6 }, (_, i) => (total / 5) * i);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full rounded-3xl border-2 border-slate-200 bg-white" role="img" aria-label="학생별 1차에서 2차로 소비 금액이 움직인 그림">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={sx(t)} x2={sx(t)} y1={M.t - 8} y2={H - M.b + 4} stroke="#e5e7eb" strokeWidth={1.5} />
          <text x={sx(t)} y={H - M.b + 24} textAnchor="middle" fontSize={15} fill="#475569">{t.toLocaleString("ko-KR")}</text>
        </g>
      ))}
      <text x={(M.l + W - M.r) / 2} y={20} textAnchor="middle" fontSize={16} fontWeight={700} fill="#1f2937">소비 금액(원) — 동그라미: 1차, 화살표 끝: 2차</text>

      {rows.map((r, i) => {
        const y = M.t + i * ROW + ROW / 2;
        const kind = kindOf(r);
        const color = COLOR[kind ?? "none"];
        const x1 = sx(r.first);
        const x2 = sx(r.second);
        const dir = Math.sign(r.second - r.first);
        return (
          <g key={r.code}>
            <text x={M.l - 10} y={y + 5} textAnchor="end" fontSize={15} fontWeight={700} fill="#1f2937">
              {r.code}
              <tspan fontWeight={400} fill="#64748b" fontSize={12}> {r.type ? CLUSTER_TYPE_LABEL[r.type] : "그룹 없음"}</tspan>
            </text>
            {dir !== 0 && (
              <>
                <line x1={x1} x2={x2 - dir * 7} y1={y} y2={y} stroke={color} strokeWidth={4} strokeDasharray={kind === "against" ? "7 5" : undefined} />
                <path d={`M ${x2} ${y} l ${-dir * 12} -7 l 0 14 Z`} fill={color} />
              </>
            )}
            <circle cx={x1} cy={y} r={dir === 0 ? 7 : 6} fill={dir === 0 ? "#fff" : color} stroke={color} strokeWidth={3} />
          </g>
        );
      })}
    </svg>
  );
}

export function ChoiceShiftLegend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1 text-base font-bold text-slate-700">
      <li><span style={{ color: COLOR.toward }}>━▶</span> 정보가 알려 준 쪽으로</li>
      <li><span style={{ color: COLOR.against }}>╍▶</span> 반대쪽으로</li>
      <li><span style={{ color: COLOR.both }}>━▶</span> 방향 없는 그룹</li>
      <li><span style={{ color: COLOR.same }}>○</span> 그대로</li>
    </ul>
  );
}
