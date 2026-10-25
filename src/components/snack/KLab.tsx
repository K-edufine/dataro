"use client";

import { useEffect, useMemo, useState } from "react";
import { BackLink } from "@/components/ui/BackLink";
import { Button } from "@/components/ui/Button";
import { ScatterChart, niceTicks, type ChartPoint, type ChartRegion } from "@/components/chart/ScatterChart";
import { SnackDataTable } from "./SnackDataTable";
import { SnackDetailCard } from "./SnackDetailCard";
import { KGroupPicker } from "./KGroupPicker";
import { KGroupTable } from "./KGroupTable";
import { KJudgePanel } from "./KJudgePanel";
import { KSummary } from "./KSummary";
import { defaultClusterName } from "@/components/chart/cluster-style";
import { preferenceText, won } from "@/lib/format";
import { K_ORDER, JUDGMENT_LABEL, saveKTrial, type SavedTrial } from "@/lib/k-trials";
import {
  WIDE_RADIUS_LIMIT, evaluate, initFromGroups, runToEnd, step,
  type Judgment, type KMeansState, type Phase, type Point,
} from "@/lib/kmeans";
import type { GradeBand } from "@/lib/schools";
import type { StudentSession } from "@/lib/student-session";
import type { Snack } from "@/types/snack";

const SEED = 1;
const STEP_MS = 1400; // 자동 진행 속도

type Stage = "group" | "animate" | "judge" | "summary";

interface Trial {
  /** 학생이 묶은 그룹 (간식 순서대로, 아직 안 묶었으면 -1) */
  groups: number[];
  /** 컴퓨터가 다듬는 중이거나 끝난 상태 */
  run: KMeansState | null;
  judgment: Judgment | null;
}

const ANIMATE_GUIDE: Record<Phase, string> = {
  ready: "",
  grouped: "내가 묶은 그룹이에요. 컴퓨터가 각 그룹의 한가운데(중간점)를 찾아요.",
  centroids: "별(★)이 내 그룹의 한가운데예요. 이제 각 간식을 가장 가까운 별의 그룹으로 보내요.",
  assigned: "가까운 별을 따라 그룹이 다시 정해졌어요. 이제 별을 그룹의 한가운데로 옮겨요.",
  moved: "별이 옮겨 갔어요. 가까운 별이 바뀐 간식이 있는지 다시 확인해요.",
  converged: "더 이상 바뀌지 않아요! 컴퓨터가 다듬기를 마쳤어요 🎉",
};

function priceStep(max: number) {
  if (max <= 3000) return 500;
  if (max <= 6000) return 1000;
  return Math.ceil(max / 5 / 500) * 500;
}

/** 저장해 둔 판단이 있으면 묶은 그룹에서 다시 계산해 결과를 되살린다. */
function restore(points: Point[], saved: SavedTrial[]): Record<number, Trial> {
  const out: Record<number, Trial> = {};
  for (const t of saved) {
    try {
      if (t.initial.length !== points.length) continue;
      out[t.k] = { groups: t.initial, run: runToEnd(initFromGroups(points, t.initial, { seed: SEED })), judgment: t.judgment };
    } catch {
      /* 데이터가 바뀌어 맞지 않으면 무시하고 새로 시작 */
    }
  }
  return out;
}

/** 5차시: K=2→3→4→5 순서로 직접 묶어 보고, 컴퓨터가 다듬는 과정을 본 뒤 판단한다. */
export function KLab({
  session, snacks, saved, title,
}: { session: StudentSession; snacks: Snack[]; saved: SavedTrial[]; title: string }) {
  const gradeBand: GradeBand = session.gradeBand;
  const points = useMemo<Point[]>(() => snacks.map((s) => ({ id: s.id, x: s.price, y: s.taste })), [snacks]);
  const ks = useMemo(() => K_ORDER.filter((k) => k <= snacks.length), [snacks.length]);

  const [trials, setTrials] = useState<Record<number, Trial>>(() => restore(points, saved));
  const [kIdx, setKIdx] = useState(() => {
    const done = restore(points, saved);
    const first = ks.findIndex((k) => !done[k]?.judgment);
    return first < 0 ? ks.length - 1 : first;
  });
  const [stage, setStage] = useState<Stage>(() => {
    const done = restore(points, saved);
    return ks.every((k) => done[k]?.judgment) ? "summary" : "group";
  });
  const [activeGroup, setActiveGroup] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [names, setNames] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const k = ks[kIdx];
  const trial: Trial = trials[k] ?? { groups: snacks.map(() => -1), run: null, judgment: null };
  const run = trial.run;

  function patchTrial(patch: Partial<Trial>, forK = k) {
    setTrials((prev) => ({
      ...prev,
      [forK]: { ...(prev[forK] ?? { groups: snacks.map(() => -1), run: null, judgment: null }), ...patch },
    }));
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
      const i = snacks.findIndex((s) => s.id === id);
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

  async function judge(j: Judgment) {
    if (!run || !ev) return;
    setSaving(true);
    setError("");
    try {
      await saveKTrial(session, {
        k, judgment: j, initial: trial.groups, final: [...run.assignments],
        meanDistance: ev.meanDistance, maxRadius: ev.maxRadius,
      });
      patchTrial({ judgment: j });
    } catch {
      setError("저장하지 못했어요. 선생님이 5차시를 열었는지 확인하고 다시 눌러 봐요.");
    } finally {
      setSaving(false);
    }
  }

  function goK(nextIdx: number, nextStage: Stage) {
    setKIdx(nextIdx);
    setStage(nextStage);
    setActiveGroup(0);
    setSelectedIds([]);
    setError("");
  }

  function next() {
    if (kIdx >= ks.length - 1) setStage("summary");
    else goK(kIdx + 1, "group");
  }

  function redo(forK: number) {
    const idx = ks.indexOf(forK);
    if (idx < 0) return;
    patchTrial({ run: null, judgment: null }, forK);
    goK(idx, "group");
  }

  // ---- 그래프에 보여 줄 것 ----
  const shown: KMeansState | null = stage === "group" ? null : run;
  const maxPrice = Math.max(...snacks.map((s) => s.price));
  const xMax = Math.max(1000, Math.ceil((maxPrice * 1.1) / 500) * 500);

  const chartPoints: ChartPoint[] = snacks.map((s, i) => ({
    id: s.id,
    label: `${s.name} (${won(s.price)}, ${preferenceText(s.taste)})`,
    shortLabel: s.name,
    x: s.price,
    y: s.taste,
    cluster: shown ? shown.assignments[i] : trial.groups[i],
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

  const groupOf = (id: string) => (ev ? ev.state.assignments[snacks.findIndex((s) => s.id === id)] : -1);
  const selectedSnacks = selectedIds.map((id) => snacks.find((s) => s.id === id)).filter((s): s is Snack => !!s);

  const summaryRows = ks
    .map((kk) => {
      const t = trials[kk];
      return t?.run && t.judgment ? { k: kk, ev: evaluate(t.run), judgment: t.judgment } : null;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const changed =
    run && run.phase === "converged"
      ? snacks.filter((_, i) => run.assignments[i] !== trial.groups[i]).map((s) => s.name)
      : [];

  return (
    <main className="mx-auto max-w-[1500px] p-4 sm:p-6">
      <header className="mb-4 space-y-3">
        <div>
          <BackLink />
          <h1 className="text-3xl font-extrabold">{title}</h1>
        </div>
        {/* K 진행 표시: 2 → 3 → 4 → 5 */}
        <ol className="flex flex-wrap items-center gap-2" aria-label="K 진행 순서">
          {ks.map((kk, idx) => {
            const t = trials[kk];
            const done = !!t?.judgment;
            const current = stage !== "summary" && idx === kIdx;
            const reachable = done || idx === kIdx || (idx > 0 && !!trials[ks[idx - 1]]?.judgment);
            return (
              <li key={kk} className="flex items-center gap-2">
                <button
                  disabled={!reachable}
                  aria-current={current}
                  onClick={() => (done ? goK(idx, "judge") : goK(idx, "group"))}
                  className={`min-h-14 min-w-24 rounded-2xl border-4 px-3 text-xl font-extrabold transition active:scale-95 disabled:opacity-40 ${
                    current ? "border-sky-600 bg-sky-600 text-white" : done ? "border-emerald-600 bg-emerald-50" : "border-slate-200 bg-white"
                  }`}
                >
                  K={kk} {done ? "✅" : ""}
                </button>
                {idx < ks.length - 1 && <span className="text-2xl text-slate-400" aria-hidden>→</span>}
              </li>
            );
          })}
          {summaryRows.length === ks.length && (
            <li>
              <Button variant={stage === "summary" ? "primary" : "ghost"} className="min-h-14" onClick={() => setStage("summary")}>
                모아 보기
              </Button>
            </li>
          )}
        </ol>
      </header>

      {stage === "summary" ? (
        <KSummary rows={summaryRows} gradeBand={gradeBand} onRedo={redo} />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          {/* 왼쪽: 그래프 */}
          <section aria-label="내 간식 그래프" className="space-y-3">
            <ScatterChart
              points={chartPoints}
              regions={regions}
              centroids={shown?.centroids ?? []}
              xDomain={[0, xMax]}
              yDomain={[0.5, 5.5]}
              xTicks={niceTicks(0, xMax, priceStep(xMax))}
              yTicks={[1, 2, 3, 4, 5]}
              xLabel="가격(원)"
              yLabel="선호도(점)"
              formatX={(v) => v.toLocaleString("ko-KR")}
              showLabels
              paint={stage === "group" ? { activeGroup, onTap: (id) => assign([id], true), onBox: (ids) => assign(ids, false) } : undefined}
              onSelect={stage === "judge" ? setSelectedIds : undefined}
              selectedIds={selectedIds}
            />
            {stage === "judge" && (
              <>
                <SnackDetailCard snacks={selectedSnacks} groupOf={groupOf} nameOf={nameOf} onClose={() => setSelectedIds([])} />
                {ev && (
                  <KGroupTable
                    ev={ev}
                    names={Object.fromEntries(Array.from({ length: ev.state.k }, (_, c) => [c, names[`${k}-${c}`] ?? ""]))}
                    onName={(c, v) => setNames({ ...names, [`${k}-${c}`]: v })}
                    reveal={revealed}
                  />
                )}
                <SnackDataTable snacks={snacks} assignments={ev?.state.assignments ?? []} nameOf={nameOf} />
              </>
            )}
          </section>

          {/* 오른쪽: 단계별 안내와 조작 */}
          <section aria-label="단계별 진행" className="space-y-4">
            {stage === "group" && (
              <KGroupPicker
                k={k}
                snacks={snacks}
                groups={trial.groups}
                activeGroup={activeGroup}
                onActive={setActiveGroup}
                onTap={(id) => assign([id], true)}
                onClear={() => patchTrial({ groups: snacks.map(() => -1) })}
                onDone={startAnimation}
              />
            )}

            {stage === "animate" && run && (
              <div className="space-y-4">
                <div className="rounded-3xl bg-amber-50 p-4 text-xl font-bold leading-relaxed" aria-live="polite">
                  {ANIMATE_GUIDE[run.phase]}
                  {run.phase === "converged" && (
                    <div className="mt-1 text-lg font-normal text-slate-700">
                      별을 {run.iteration}번 옮겼어요.{" "}
                      {changed.length === 0
                        ? "내가 묶은 그대로예요. 정말 잘 묶었어요!"
                        : `내가 묶은 것에서 ${changed.length}개가 바뀌었어요: ${changed.join(", ")}`}
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
                    <Button variant="ghost" onClick={() => redo(k)}>다시 묶어 보기</Button>
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
                isLast={kIdx >= ks.length - 1}
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
