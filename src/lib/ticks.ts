/** 눈금을 보기 좋은 간격으로 만든다 */
export function niceTicks(min: number, max: number, step: number): number[] {
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}
