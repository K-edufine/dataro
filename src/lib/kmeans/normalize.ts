import type { Bounds, Point } from "./types";

export function computeBounds(points: readonly Point[]): Bounds {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function scale(v: number, min: number, max: number): number {
  return max === min ? 0 : (v - min) / (max - min);
}

function unscale(v: number, min: number, max: number): number {
  return max === min ? min : min + v * (max - min);
}

/** 원래 값 → 0~1. 모든 값이 같은 축은 0으로 둔다. */
export function normalizeValue(x: number, y: number, b: Bounds): [number, number] {
  return [scale(x, b.minX, b.maxX), scale(y, b.minY, b.maxY)];
}

/** 0~1 → 원래 값. 화면에 보여 줄 때 쓴다. */
export function denormalizeValue(nx: number, ny: number, b: Bounds): [number, number] {
  return [unscale(nx, b.minX, b.maxX), unscale(ny, b.minY, b.maxY)];
}
