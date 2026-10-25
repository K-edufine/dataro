/** 군집마다 색 + 모양을 함께 써서 색만으로 구분하지 않게 한다. (Okabe-Ito 색약 친화 팔레트) */
export const CLUSTER_COLORS = ["#0072B2", "#E69F00", "#009E73", "#CC79A7", "#D55E00", "#56B4E9"];
export const UNASSIGNED_COLOR = "#9ca3af";

export const CLUSTER_SHAPE_NAMES = ["동그라미", "네모", "세모", "마름모", "오각형", "육각형"];
export const CLUSTER_SHAPE_ICONS = ["●", "■", "▲", "◆", "⬟", "⬢"];

/** 그룹을 구분하는 색+모양의 개수 (K 는 최대 6) */
export const CLUSTER_STYLE_COUNT = CLUSTER_SHAPE_ICONS.length;

export function clusterIcon(cluster: number): string {
  return CLUSTER_SHAPE_ICONS[((cluster % CLUSTER_STYLE_COUNT) + CLUSTER_STYLE_COUNT) % CLUSTER_STYLE_COUNT];
}

export function clusterColor(cluster: number): string {
  return cluster < 0 ? UNASSIGNED_COLOR : CLUSTER_COLORS[cluster % CLUSTER_COLORS.length];
}

export function defaultClusterName(cluster: number): string {
  return `${cluster + 1}번 그룹`;
}

/** 중심이 (0,0)인 도형의 SVG path. r은 대략적인 반지름 */
export function shapePath(cluster: number, r: number): string {
  const shape = cluster < 0 ? 0 : cluster % CLUSTER_STYLE_COUNT;
  switch (shape) {
    case 0:
      return `M ${-r} 0 a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
    case 1: {
      const s = r * 0.9;
      return `M ${-s} ${-s} H ${s} V ${s} H ${-s} Z`;
    }
    case 2:
      return `M 0 ${-r * 1.15} L ${r * 1.1} ${r * 0.85} L ${-r * 1.1} ${r * 0.85} Z`;
    case 3:
      return `M 0 ${-r * 1.25} L ${r * 1.25} 0 L 0 ${r * 1.25} L ${-r * 1.25} 0 Z`;
    case 4: {
      const pts = Array.from({ length: 5 }, (_, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        return `${(r * 1.15 * Math.cos(a)).toFixed(2)} ${(r * 1.15 * Math.sin(a)).toFixed(2)}`;
      });
      return `M ${pts.join(" L ")} Z`;
    }
    default: {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (i * 2 * Math.PI) / 6;
        return `${(r * 1.2 * Math.cos(a)).toFixed(2)} ${(r * 1.2 * Math.sin(a)).toFixed(2)}`;
      });
      return `M ${pts.join(" L ")} Z`;
    }
  }
}

/** 별 모양 (중심점 표시용) */
export function starPath(r: number): string {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    return `${(rad * Math.cos(a)).toFixed(2)} ${(rad * Math.sin(a)).toFixed(2)}`;
  });
  return `M ${pts.join(" L ")} Z`;
}
