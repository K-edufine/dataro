import { won } from "@/lib/format";

/** 선택 하나를 소비(노랑)/저축(파랑) 막대로 보여 준다 */
export function ChoiceBar({ label, total, consume }: { label: string; total: number; consume: number }) {
  const pct = (consume / total) * 100;
  return (
    <div className="space-y-1">
      <p className="text-lg font-extrabold">{label}</p>
      <div className="flex h-12 overflow-hidden rounded-2xl border-2 border-slate-300 text-lg font-extrabold" role="img" aria-label={`${label}: 소비 ${won(consume)}, 저축 ${won(total - consume)}`}>
        {consume > 0 && <div className="grid place-items-center bg-amber-300 px-1" style={{ width: `${pct}%` }}>{won(consume)}</div>}
        {total - consume > 0 && <div className="grid flex-1 place-items-center bg-sky-200 px-1">{won(total - consume)}</div>}
      </div>
    </div>
  );
}

export function ChoiceLegend() {
  return (
    <p className="flex flex-wrap gap-4 text-base font-bold text-slate-600">
      <span><span className="mr-1 inline-block size-4 rounded bg-amber-300 align-middle" aria-hidden />쓰기(소비)</span>
      <span><span className="mr-1 inline-block size-4 rounded bg-sky-200 align-middle" aria-hidden />모으기(저축)</span>
    </p>
  );
}
