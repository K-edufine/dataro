"use client";

import { Button } from "@/components/ui/Button";
import { scaleText } from "@/lib/format";
import {
  WIDE_RADIUS_LIMIT, computerJudgment, toScale, type Judgment, type KEvaluation,
} from "@/lib/kmeans";
import { JUDGMENT_HELP, JUDGMENT_ICON, JUDGMENT_LABEL } from "@/lib/k-trials";

const CHOICES: Judgment[] = ["wide", "good", "split"];

function reasonText(ev: KEvaluation): string {
  const parts: string[] = [];
  if (ev.issues.includes("wide")) {
    parts.push(`가장 넓은 그룹의 넓이가 ${scaleText(toScale(ev.maxRadius))}라서 기준(${scaleText(toScale(WIDE_RADIUS_LIMIT))})보다 커요`);
  }
  if (ev.issues.includes("single")) {
    parts.push(`점이 1개뿐인 그룹이 ${ev.groups.filter((g) => g.count === 1).length}개나 돼요`);
  }
  if (parts.length === 0) parts.push("넓은 그룹도 없고, 혼자인 그룹도 많지 않아요");
  return parts.join(", ");
}

/** 학생이 직접 판단하고, 판단한 뒤에 컴퓨터 판정과 비교해 보여 주는 패널 */
export function KJudgePanel({
  ev, judgment, saving, error, isLast, onJudge, onNext, onRedo,
}: {
  ev: KEvaluation;
  /** 학생이 이미 고른 판단. 없으면 아직 판단 전 */
  judgment: Judgment | null;
  saving: boolean;
  error: string;
  isLast: boolean;
  onJudge: (j: Judgment) => void;
  onNext: () => void;
  onRedo: () => void;
}) {
  const k = ev.state.k;
  const computer = computerJudgment(ev);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-amber-50 p-4 text-xl font-bold leading-relaxed" aria-live="polite">
        {judgment === null
          ? <>K={k}로 묶은 결과를 보고, 그룹을 나눈 것이 어떤지 <span className="text-sky-700">내 생각</span>을 골라 보세요.</>
          : "내 판단을 저장했어요. 컴퓨터의 판정과 비교해 봐요."}
        <div className="mt-1 text-lg font-normal text-slate-700">
          점선 동그라미(그룹 넓이)와 아래 표의 퍼진 정도·넓이를 참고해요.
        </div>
      </div>

      <div className="grid gap-3" role="radiogroup" aria-label="K 판단하기">
        {CHOICES.map((j) => {
          const mine = judgment === j;
          return (
            <button
              key={j}
              role="radio"
              aria-checked={mine}
              disabled={judgment !== null || saving}
              onClick={() => onJudge(j)}
              className={`flex min-h-20 items-center gap-3 rounded-3xl border-4 p-3 text-left transition active:scale-[0.98] disabled:cursor-default disabled:active:scale-100 ${
                mine ? "border-sky-600 bg-sky-50" : "border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
              }`}
            >
              <span className="text-4xl" aria-hidden>{JUDGMENT_ICON[j]}</span>
              <span>
                <span className="block text-2xl font-extrabold">{JUDGMENT_LABEL[j]}</span>
                <span className="block text-base text-slate-600">{JUDGMENT_HELP[j]}</span>
              </span>
              {mine && <span className="ml-auto rounded-full bg-sky-600 px-3 py-1 text-base font-extrabold text-white">내 판단</span>}
            </button>
          );
        })}
      </div>

      {saving && <p className="text-lg font-bold">저장하는 중…</p>}
      {error && <p className="text-lg font-bold text-rose-600" role="alert">{error}</p>}

      {judgment !== null && (
        <div className="space-y-2 rounded-3xl border-2 border-slate-800 bg-white p-4">
          <p className="text-xl font-extrabold">
            나는 <span className="text-sky-700">‘{JUDGMENT_LABEL[judgment]}’</span>, 컴퓨터는{" "}
            <span className="text-amber-600">‘{JUDGMENT_LABEL[computer]}’</span>
            {judgment === computer ? " → 같아요! 👍" : " → 달라요 🤔"}
          </p>
          <p className="text-lg text-slate-700">컴퓨터가 그렇게 본 이유: {reasonText(ev)}.</p>
          {judgment !== computer && (
            <p className="text-base text-slate-600">
              다르다고 틀린 것은 아니에요. 어떤 점이 달랐는지 친구와 이야기해 봐요.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={onRedo}>다시 묶어 보기</Button>
        {judgment !== null && (
          <Button className="min-w-48 flex-1" onClick={onNext}>
            {isLast ? "모아 보기 ▶" : `다음 K 해 보기 ▶`}
          </Button>
        )}
      </div>
    </div>
  );
}
