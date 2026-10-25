"use client";

import { useEffect, useMemo, useState } from "react";
import { BackLink } from "@/components/ui/BackLink";
import { Button } from "@/components/ui/Button";
import { ScatterChart, type ChartPoint, type ChartRegion } from "@/components/chart/ScatterChart";
import { ItemDataTable } from "./ItemDataTable";
import { ItemDetailCard } from "./ItemDetailCard";
import { KGroupPicker } from "./KGroupPicker";
import { KGroupTable } from "./KGroupTable";
import { KJudgePanel } from "./KJudgePanel";
import { KSummary } from "./KSummary";
import { defaultClusterName } from "@/components/chart/cluster-style";
import type { DatasetSpec, Item } from "@/lib/dataset";
import { JUDGMENT_LABEL, saveKTrial, type SavedTrial, type TrialMode } from "@/lib/k-trials";
import {
  WIDE_RADIUS_LIMIT, evaluate, init, initFromGroups, runBest, runToEnd, step,
  type Judgment, type KMeansState, type Phase, type Point,
} from "@/lib/kmeans";
import type { StudentSession } from "@/lib/student-session";

const SEED = 1;
const STEP_MS = 1400; // 자동 진행 속도

type Stage = "pick" | "group" | "auto" | "animate" | "judge" | "summary";

/** all: 모든 K를 직접 묶는다(저학년) / first: 처음 고른 K 하나만 직접 묶고 나머지는 컴퓨터가 자동으로 묶는다(고학년) */
export type ManualPolicy = "all" | "first";

interface Trial {
  /** 학생이 묶은 그룹 (점 순서대로, 아직 안 묶었으면 -1) */
  groups: number[];
  /** 컴퓨터가 다듬는 중이거나 끝난 상태 */
  run: KMeansState | null;
  judgment: Judgment | null;
}

const MANUAL_GUIDE: Record<Phase, string> = {
  ready: "",
  grouped: "내가 묶은 그룹이에요. 컴퓨터가 각 그룹의 한가운데(중간점)를 찾아요.",
  centroids: "별(★)이 내 그룹의 한가운데예요. 이제 각 점을 가장 가까운 별의 그룹으로 보내요.",
  assigned: "가까운 별을 따라 그룹이 다시 정해졌어요. 이제 별을 그룹의 한가운데로 옮겨요.",
  moved: "별이 옮겨 갔어요. 가까운 별이 바뀐 점이 있는지 다시 확인해요.",
  converged: "더 이상 바뀌지 않아요! 컴퓨터가 다듬기를 마쳤어요 🎉",
};

const AUTO_GUIDE: Record<Phase, string> = {
  ready: "컴퓨터가 데이터 속에서 시작할 점 몇 개를 골라요.",
  grouped: "",
  centroids: "별(★)이 시작 중심이에요. 이제 각 점을 가장 가까운 별의 그룹으로 보내요.",
  assigned: "가까운 별을 따라 그룹이 정해졌어요. 이제 별을 그룹의 한가운데로 옮겨요.",
  moved: "별이 옮겨 갔어요. 가까운 별이 바뀐 점이 있는지 다시 확인해요.",
  converged: "더 이상 바뀌지 않아요! 컴퓨터가 다 묶었어요 🎉",
};

const blank = (n: number) => Array.from({ length: n }, () => -1);

function modeOf(policy: ManualPolicy, manualK: number | null, k: number): TrialMode {
  return policy === "all" || k === manualK ? "manual" : "auto";
}

/** 저장해 둔 판단이 있으면 다시 계산해 결과를 되살린다. (직접 묶은 것은 묶은 그룹에서, 자동은 같은 방법으로) */
function restore(points: Point[], saved: SavedTrial[], ks: number[]): Record<number, Trial> {
  const out: Record<number, Trial> = {};
  for (const t of saved) {
    if (!ks.includes(t.k) || t.initial.length !== points.length) continue;
    try {
      const run = t.mode === "auto" ? runBest(points, t.k) : runToEnd(initFromGroups(points, t.initial, { seed: SEED }));
      out[t.k] = { groups: t.mode === "auto" ? [...run.assignments] : t.initial, run, judgment: t.judgment };
    } catch {
      /* 데이터가 바뀌어 맞지 않으면 무시하고 새로 시작 */
    }
  }
  return out;
}

function bootstrap(points: Point[], saved: SavedTrial[], ks: number[], policy: ManualPolicy) {
  const trials = restore(points, saved, ks);
  const manualK = policy === "first" ? (saved.find((t) => t.mode === "manual" && trials[t.k])?.k ?? null) : null;
  const order = policy === "all" || manualK === null ? ks : [manualK, ...ks.filter((x) => x !== manualK)];
  const allDone = (policy === "all" || manualK !== null) && order.every((k) => trials[k]?.judgment);
  const first = order.findIndex((k) => !trials[k]?.judgment);
  const kIdx = allDone ? order.length - 1 : Math.max(0, first);
  const stage: Stage = policy === "first" && manualK === null
    ? "pick"
    : allDone
      ? "summary"
      : modeOf(policy, manualK, order[kIdx]) === "manual" ? "group" : "auto";
  return { trials, manualK, kIdx, stage };
}

/**
 * 5차시: K를 바꿔 가며 묶어 보고(직접 또는 컴퓨터가 자동으로), 컴퓨터가 다듬는 과정을 본 뒤 판단한다.
 * 저학년은 간식 10개를 K=2~5 모두 직접 묶고, 고학년은 도시 25개를 K=2~6 중 하나만 직접 묶고 나머지는 자동으로 묶는다.
 */
export function KLab({
  session, items, spec, saved, title, ks, policy,
}: {
  session: StudentSession;
  items: Item[];
  spec: DatasetSpec;
  saved: SavedTrial[];
  title: string;
  /** 해 볼 K 목록 */
  ks: number[];
  policy: ManualPolicy;
}) {
  const points = useMemo<Point[]>(() => items.map((s) => ({ id: s.id, x: s.x, y: s.y })), [items]);
  const [boot] = useState(() => bootstrap(points, saved, ks, policy));

  const [trials, setTrials] = useState<Record<number, Trial>>(boot.trials);
  const [manualK, setManualK] = useState<number | null>(boot.manualK);
  const [kIdx, setKIdx] = useState(boot.kIdx);
  const [stage, setStage] = useState<Stage>(boot.stage);
  const [activeGroup, setActiveGroup] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [names, setNames] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [labels, setLabels] = useState(spec.labelsByDefault);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const order = useMemo(
    () => (policy === "all" || manualK === null ? ks : [manualK, ...ks.filter((x) => x !== manualK)]),
    [policy, manualK, ks],
  );
  const k = order[kIdx];
  const mode = modeOf(policy, manualK, k);
  const empty: Trial = { groups: blank(items.length), run: null, judgment: null };
  const trial: Trial = trials[k] ?? empty;
  const run = trial.run;

  function patchTrial(patch: Partial<Trial>, forK = k) {
    setTrials((prev) => ({ ...prev, [forK]: { ...(prev[forK] ?? empty), ...patch } }));
  }

  // 자동 진행: 단계마다 잠깐 쉬면서 컴퓨터가 다듬는 과정을 보여 준다
  useEffect(() => {
    if (stage !== "animate" || !playing || !run || run.phase === "converged") return;
    const t = setTimeout(() => {
      setTrials((prev) => {
        const cur = prev[k];
        return cur?.run ? { ...prev, [k]: { ...cur, run: step(cur.run) } } : prev;
      });
    }, STEP_MS);
    return () => clearTimeout(t);
  }, [stage, playing, run, k]);

  const ev = useMemo(() => (run && run.phase === "converged" ? evaluate(run) : null), [run]);
  const nameOf = (c: number) => (names[`${k}-${c}`]?.trim() ? names[`${k}-${c}`] : defaultClusterName(c));
  const revealed = trial.judgment !== null;

  // ---- 묶기 ----
  function assign(ids: string[], toggle: boolean) {
    const next = [...trial.groups];
    for (const id of ids) {
      const i = items.findIndex((s) => s.id === id);
      if (i < 0) continue;
      next[i] = toggle && next[i] === activeGroup ? -1 : activeGroup;
    }
    patchTrial({ groups: next });
  }

  function startAnimation() {
    patchTrial({ run: initFromGroups(points, trial.groups, { seed: SEED }), judgment: null });
    setPlaying(true);
    setStage("animate");
  }

  /** 컴퓨터가 자동으로 묶는다: 가장 좋은 결과가 나오는 시작점으로 처음부터 단계를 보여 준다 */
  function startAuto() {
    const seed = runBest(points, k).seed;
    patchTrial({ groups: blank(items.length), run: init(points, k, { seed }), judgment: null });
    setPlaying(true);
    setStage("animate");
  }

  async function judge(j: Judgment) {
    if (!run || !ev) return;
    setSaving(true);
    setError("");
    try {
      await saveKTrial(session, {
        k, judgment: j, mode,
        initial: mode === "manual" ? trial.groups : [...run.assignments],
        final: [...run.assignments],
        meanDistance: ev.meanDistance, maxRadius: ev.maxRadius,
      });
      patchTrial({ judgment: j });
    } catch {
      setError("저장하지 못했어요. 선생님이 5차시를 열었는지 확인하고 다시 눌러 봐요.");
    } finally {
      setSaving(false);
    }
  }

  function goK(nextOrder: number[], idx: number, forceStage?: Stage) {
    const nextK = nextOrder[idx];
    setKIdx(idx);
    setStage(forceStage ?? (modeOf(policy, manualK, nextK) === "manual" ? "group" : "auto"));
    setActiveGroup(0);
    setSelectedIds([]);
    setError("");
  }

  function pickManual(kk: number) {
    setManualK(kk);
    setKIdx(0);
    setStage("group");
    setActiveGroup(0);
  }

  function next() {
    if (kIdx >= order.length - 1) setStage("summary");
    else goK(order, kIdx + 1);
  }

  function redo(forK: number) {
    const idx = order.indexOf(forK);
    if (idx < 0) return;
    patchTrial({ run: null, judgment: null }, forK);
    goK(order, idx);
  }

  // ---- 그래프에 보여 줄 것 ----
  const shown: KMeansState | null = stage === "group" || stage === "pick" || stage === "auto" ? null : run;
  const chartPoints: ChartPoint[] = items.map((s, i) => ({
    id: s.id,
    label: spec.describe(s),
    shortLabel: s.name,
    x: s.x,
    y: s.y,
    cluster: shown ? shown.assignments[i] : stage === "group" ? trial.groups[i] : -1,
  }));

  const regions: ChartRegion[] =
    stage === "judge" && ev
      ? ev.groups
          .filter((g) => g.count > 1)
          .map((g) => ({
            cluster: g.index,
            x: ev.state.centroids[g.index][0],
            y: ev.state.centroids[g.index][1],
            rx: g.radius * (ev.state.bounds.maxX - ev.state.bounds.minX),
            ry: g.radius * (ev.state.bounds.maxY - ev.state.bounds.minY),
            wide: revealed && g.radius > WIDE_RADIUS_LIMIT, // 판단하기 전에는 빨간색으로 알려 주지 않는다
          }))
      : [];

  const groupOf = (id: string) => (ev ? ev.state.assignments[items.findIndex((s) => s.id === id)] : -1);
  const selectedItems = selectedIds.map((id) => items.find((s) => s.id === id)).filter((s): s is Item => !!s);

  const summaryRows = order
    .map((kk) => {
      const t = trials[kk];
      return t?.run && t.judgment ? { k: kk, ev: evaluate(t.run), judgment: t.judgment, mode: modeOf(policy, manualK, kk) } : null;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => a.k - b.k);

  const changed =
    run && run.phase === "converged" && mode === "manual"
      ? items.filter((_, i) => run.assignments[i] !== trial.groups[i]).map((s) => s.name)
      : [];
  const guide = mode === "manual" ? MANUAL_GUIDE : AUTO_GUIDE;

  return (
    <main className="mx-auto max-w-[1500px] p-4 sm:p-6">
      <header className="mb-4 space-y-3">
        <div>
          <BackLink />
          <h1 className="text-3xl font-extrabold">{title}</h1>
        </div>
        {/* K 진행 표시 */}
        <ol className="flex flex-wrap items-center gap-2" aria-label="K 진행 순서">
          {order.map((kk, idx) => {
            const t = trials[kk];
            const done = !!t?.judgment;
            const current = stage !== "summary" && stage !== "pick" && idx === kIdx;
            const reachable = stage !== "pick" && (done || idx === kIdx || (idx > 0 && !!trials[order[idx - 1]]?.judgment));
            const icon = policy === "first" && manualK !== null ? (kk === manualK ? "✋" : "🤖") : "";
            return (
              <li key={kk} className="flex items-center gap-2">
                <button
                  disabled={!reachable}
                  aria-current={current}
                  onClick={() => (done ? goK(order, idx, "judge") : goK(order, idx))}
                  className={`min-h-14 min-w-24 rounded-2xl border-4 px-3 text-xl font-extrabold transition active:scale-95 disabled:opacity-40 ${
                    current ? "border-sky-600 bg-sky-600 text-white" : done ? "border-emerald-600 bg-emerald-50" : "border-slate-200 bg-white"
                  }`}
                >
                  {icon} K={kk} {done ? "✅" : ""}
                </button>
                {idx < order.length - 1 && <span className="text-2xl text-slate-400" aria-hidden>→</span>}
              </li>
            );
          })}
          {summaryRows.length === order.length && (
            <li>
              <Button variant={stage === "summary" ? "primary" : "ghost"} className="min-h-14" onClick={() => setStage("summary")}>
                모아 보기
              </Button>
            </li>
          )}
        </ol>
      </header>

      {stage === "summary" ? (
        <KSummary rows={summaryRows} gradeBand={session.gradeBand} onRedo={redo} />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          {/* 왼쪽: 그래프 */}
          <section aria-label="그래프" className="space-y-3">
            <div className="flex justify-end">
              <Button variant="ghost" className="min-h-12 px-4 text-base" aria-pressed={labels} onClick={() => setLabels(!labels)}>
                {labels ? `${spec.itemNoun} 이름 숨기기` : `${spec.itemNoun} 이름 보이기`}
              </Button>
            </div>
            <ScatterChart
              points={chartPoints}
              regions={regions}
              centroids={shown?.centroids ?? []}
              xDomain={spec.xDomain}
              yDomain={spec.yDomain}
              xTicks={spec.xTicks}
              yTicks={spec.yTicks}
              xLabel={spec.xLabel}
              yLabel={spec.yLabel}
              formatX={spec.formatTickX}
              showLabels={labels}
              paint={stage === "group" ? { activeGroup, onTap: (id) => assign([id], true), onBox: (ids) => assign(ids, false) } : undefined}
              onSelect={stage === "judge" || stage === "animate" ? setSelectedIds : undefined}
              selectedIds={selectedIds}
            />
            {stage === "judge" && (
              <>
                <ItemDetailCard items={selectedItems} spec={spec} groupOf={groupOf} nameOf={nameOf} onClose={() => setSelectedIds([])} />
                {ev && (
                  <KGroupTable
                    ev={ev}
                    items={items}
                    spec={spec}
                    names={Object.fromEntries(Array.from({ length: ev.state.k }, (_, c) => [c, names[`${k}-${c}`] ?? ""]))}
                    onName={(c, v) => setNames({ ...names, [`${k}-${c}`]: v })}
                    reveal={revealed}
                  />
                )}
                <ItemDataTable items={items} spec={spec} assignments={ev?.state.assignments ?? []} nameOf={nameOf} />
              </>
            )}
          </section>

          {/* 오른쪽: 단계별 안내와 조작 */}
          <section aria-label="단계별 진행" className="space-y-4">
            {stage === "pick" && (
              <div className="space-y-4">
                <div className="rounded-3xl bg-amber-50 p-4 text-xl font-bold leading-relaxed">
                  먼저 <span className="text-sky-700">그룹 개수(K)를 하나 골라서</span> 내가 직접 묶어 봐요.
                  <div className="mt-1 text-lg font-normal text-slate-700">
                    나머지 K는 컴퓨터가 자동으로 묶어 줘요. K가 작으면 큼직하게, 크면 잘게 나뉘어요.
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5" role="group" aria-label="직접 묶을 K 고르기">
                  {ks.map((kk) => (
                    <button
                      key={kk}
                      onClick={() => pickManual(kk)}
                      className="min-h-20 rounded-3xl border-4 border-slate-200 bg-white text-3xl font-extrabold transition active:scale-95 hover:bg-sky-50"
                    >
                      K={kk}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {stage === "group" && (
              <KGroupPicker
                k={k}
                items={items}
                spec={spec}
                groups={trial.groups}
                activeGroup={activeGroup}
                onActive={setActiveGroup}
                onTap={(id) => assign([id], true)}
                onClear={() => patchTrial({ groups: blank(items.length) })}
                onDone={startAnimation}
              />
            )}

            {stage === "auto" && (
              <div className="space-y-4">
                <div className="rounded-3xl bg-amber-50 p-4 text-xl font-bold leading-relaxed">
                  이번에는 컴퓨터가 <span className="text-sky-700">K={k}로 자동으로</span> 묶어 줘요. 🤖
                  <div className="mt-1 text-lg font-normal text-slate-700">
                    컴퓨터가 어떻게 묶는지 단계마다 지켜보고, 끝나면 내가 판단해 봐요.
                  </div>
                </div>
                <Button className="w-full text-xl" onClick={startAuto}>자동으로 묶기 ▶</Button>
              </div>
            )}

            {stage === "animate" && run && (
              <div className="space-y-4">
                <div className="rounded-3xl bg-amber-50 p-4 text-xl font-bold leading-relaxed" aria-live="polite">
                  {guide[run.phase]}
                  {run.phase === "converged" && (
                    <div className="mt-1 text-lg font-normal text-slate-700">
                      별을 {run.iteration}번 옮겼어요.{" "}
                      {mode === "manual" &&
                        (changed.length === 0
                          ? `내가 묶은 그대로예요. 정말 잘 묶었어요!`
                          : `내가 묶은 것에서 ${changed.length}개가 바뀌었어요: ${changed.join(", ")}`)}
                    </div>
                  )}
                </div>
                {run.phase !== "converged" ? (
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Button variant={playing ? "ghost" : "secondary"} onClick={() => setPlaying(!playing)}>
                      {playing ? "⏸ 멈추기" : "▶ 자동으로"}
                    </Button>
                    <Button variant="ghost" onClick={() => { setPlaying(false); patchTrial({ run: step(run) }); }}>다음 단계 ▶</Button>
                    <Button variant="ghost" onClick={() => patchTrial({ run: runToEnd(run) })}>끝까지 ⏭</Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {mode === "manual" && <Button variant="ghost" onClick={() => redo(k)}>다시 묶어 보기</Button>}
                    <Button className="min-w-48 flex-1" onClick={() => setStage("judge")}>판단하러 가기 ▶</Button>
                  </div>
                )}
              </div>
            )}

            {stage === "judge" && ev && (
              <KJudgePanel
                ev={ev}
                judgment={trial.judgment}
                saving={saving}
                error={error}
                isLast={kIdx >= order.length - 1}
                noun={spec.itemNoun}
                redoLabel={mode === "manual" ? "다시 묶어 보기" : "자동 묶기 다시 보기"}
                onJudge={judge}
                onNext={next}
                onRedo={() => redo(k)}
              />
            )}
            {stage === "judge" && trial.judgment && (
              <p className="text-base text-slate-600">내 판단: {JUDGMENT_LABEL[trial.judgment]}</p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
