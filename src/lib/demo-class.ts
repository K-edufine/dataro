import { createRng } from "@/lib/kmeans";
import { AXIS_MAX, AXIS_MIN, AXIS_MID } from "@/lib/survey";
import type { ScoreRow } from "@/lib/class-cluster";

/**
 * 교사가 화면에서만 시험해 볼 수 있는 가상 학급. DB 에는 저장하지 않는다.
 * 소비·저축이 각각 높은/낮은 4가지 성향의 학생이 섞여 있다고 가정해 점수를 만든다.
 */
export function makeDemoRows(count = 25, seed = 11): ScoreRow[] {
  const r = createRng(seed);
  const span = (AXIS_MAX - AXIS_MIN) / 4;
  const lo = AXIS_MID - span;
  const hi = AXIS_MID + span;
  const types: [number, number][] = [[lo, lo], [hi, lo], [lo, hi], [hi, hi]];
  const noise = () => (r() + r() + r() - 1.5) * span * 0.9;
  const clamp = (v: number) => Math.min(AXIS_MAX, Math.max(AXIS_MIN, Math.round(v)));

  return Array.from({ length: count }, (_, i) => {
    const [cx, cy] = types[i % 4];
    return { anon_code: `s${i + 1}`, number: i + 1, consume: clamp(cx + noise()), save: clamp(cy + noise()) };
  });
}
