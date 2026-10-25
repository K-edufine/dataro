"use client";

import { useState } from "react";
import { ScatterChart, niceTicks, type ChartPoint } from "@/components/chart/ScatterChart";
import { CLUSTER_SHAPE_ICONS, clusterColor, defaultClusterName } from "@/components/chart/cluster-style";
import { Button } from "@/components/ui/Button";
import { groupMeans, membersOf, type ClassClusterResult, type ScoreRow } from "@/lib/class-cluster";
import {
  CLUSTER_TYPE_HELP, CLUSTER_TYPE_IDS, CLUSTER_TYPE_LABEL, type ClusterType,
} from "@/lib/cluster-types";
import { AXIS_MAX, AXIS_MIN } from "@/lib/survey";

type SaveState = "idle" | "saving" | "saved" | "error";

interface Props {
  rows: ScoreRow[];
  results: ClassClusterResult[];
  /** 내 번호표 (있으면 내 점을 빨간 테두리로 강조) */
  myCode?: string;
  /** 학생: 이미 저장해 둔 그룹 이름 (K → 그룹 번호 순서) */
  initialNames?: Record<number, string[]>;
  /** 학생: 그룹 이름 저장. 넘겨 주면 이름 입력칸과 저장 버튼이 보인다 */
  onSaveNames?: (k: number, names: string[]) => Promise<void>;
  /** 교사: 4유형 수정. 넘겨 주면 유형을 고르는 칸이 보인다 */
  onTypeChange?: (k: number, group: number, type: ClusterType) => void;
  initialK?: number;
}

/** 학급 친구들의 소비·저축 점수와 K=2·3·4 군집 결과 (7차시 학생 화면, 교사 전자칠판 화면 공용) */
export function ClassClusterView({ rows, results, myCode, initialNames = {}, onSaveNames, onTypeChange, initialK }: Props) {
  const [k, setK] = useState(initialK ?? results[results.length - 1]?.k ?? 2);
  const [names, setNames] = useState<Record<number, string[]>>(initialNames);
  const [saveState, setSaveState] = useState<Record<number, SaveState>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const res = results.find((r) => r.k === k) ?? results[results.length - 1];
  if (!res) return null;

  const nameOf = (g: number) => names[res.k]?.[g]?.trim() || defaultClusterName(g);
  const myGroup = myCode ? res.assignments[myCode] : undefined;
  const late = rows.filter((r) => res.assignments[r.anon_code] === undefined).length;

  const points: ChartPoint[] = rows.map((r) => ({
    id: r.anon_code,
    label: `${r.anon_code} · 소비 ${r.consume} · 저축 ${r.save}`,
    x: r.consume,
    y: r.save,
    cluster: res.assignments[r.anon_code] ?? -1,
  }));

  const tickStep = AXIS_MAX - AXIS_MIN > 12 ? 4 : 2;
  const selectedRows = selectedIds.map((id) => rows.find((r) => r.anon_code === id)).filter((r): r is ScoreRow => !!r);

  function setName(g: number, value: string) {
    const cur = Array.from({ length: res.k }, (_, i) => names[res.k]?.[i] ?? "");
    cur[g] = value;
    setNames({ ...names, [res.k]: cur });
    setSaveState({ ...saveState, [res.k]: "idle" });
  }

  async function save() {
    if (!onSaveNames) return;
    const list = Array.from({ length: res.k }, (_, i) => (names[res.k]?.[i] ?? "").trim());
    setSaveState({ ...saveState, [res.k]: "saving" });
    try {
      await onSaveNames(res.k, list);
      setSaveState({ ...saveState, [res.k]: "saved" });
    } catch {
      setSaveState({ ...saveState, [res.k]: "error" });
    }
  }

  const state = saveState[res.k] ?? "idle";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="그룹 개수 고르기">
        <span className="text-lg font-bold">그룹 개수(K)</span>
        {results.map((r) => (
          <button
            key={r.k}
            onClick={() => { setK(r.k); setSelectedIds([]); }}
            aria-pressed={r.k === res.k}
            className={`min-h-14 min-w-14 rounded-2xl border-2 text-xl font-extrabold transition active:scale-95 ${
              r.k === res.k ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white hover:bg-slate-100"
            }`}
          >
            {r.k}
          </button>
        ))}
        <span className="ml-2 text-base text-slate-600">친구 {rows.length}명</span>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section aria-label="학급 친구들의 점수" className="space-y-3">
          <ScatterChart
            points={points}
            centroids={res.centroids}
            xDomain={[AXIS_MIN - 1, AXIS_MAX + 1]}
            yDomain={[AXIS_MIN - 1, AXIS_MAX + 1]}
            xTicks={niceTicks(AXIS_MIN, AXIS_MAX, tickStep)}
            yTicks={niceTicks(AXIS_MIN, AXIS_MAX, tickStep)}
            xLabel="소비 점수"
            yLabel="저축 점수"
            highlightId={myCode}
            spreadDuplicates
            onSelect={setSelectedIds}
            selectedIds={selectedIds}
          />
          <p className="text-base text-slate-600">
            점에 마우스를 올리거나 톡 눌러 보세요. 번호표와 점수가 보여요.
            {myCode && <> 빨간 테두리가 <b>내 점({myCode})</b>이에요.</>}
            {" "}별(★)은 그룹의 가운데예요. 소비 점수가 높을수록 쓰고 싶은 마음이, 저축 점수가 높을수록 모으고 싶은 마음이 커요.
          </p>
          {late > 0 && (
            <p className="rounded-2xl bg-amber-50 p-3 text-base font-bold">
              결과를 정한 뒤에 설문한 친구가 {late}명 있어요. 회색 점이에요.
            </p>
          )}
          {selectedRows.length > 0 && (
            <div className="rounded-3xl border-2 border-slate-800 bg-white p-4 shadow-md" role="region" aria-label="친구 점수 자세히 보기">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xl font-extrabold">{selectedRows.length > 1 ? `겹쳐 있는 친구 ${selectedRows.length}명` : "친구 점수"}</h2>
                <Button variant="ghost" className="min-h-12 px-4" onClick={() => setSelectedIds([])}>닫기</Button>
              </div>
              <ul className="space-y-2">
                {selectedRows.map((r) => {
                  const g = res.assignments[r.anon_code];
                  return (
                    <li key={r.anon_code} className="rounded-2xl bg-slate-50 p-3 text-lg">
                      <span className="font-extrabold">{r.anon_code}{r.anon_code === myCode && " (나)"}</span>
                      {" · "}소비 {r.consume}점{" · "}저축 {r.save}점
                      {g !== undefined && (
                        <span className="ml-2 font-bold" style={{ color: clusterColor(g) }}>
                          {CLUSTER_SHAPE_ICONS[g % 5]} {nameOf(g)}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

        <section aria-label="그룹 살펴보기" className="space-y-3">
          {onSaveNames && (
            <p className="rounded-3xl bg-amber-50 p-4 text-xl font-bold leading-relaxed">
              그룹마다 어울리는 이름을 붙여 보세요. K를 바꿔도 이름은 K마다 따로 저장돼요.
            </p>
          )}
          {Array.from({ length: res.k }, (_, g) => {
            const m = groupMeans(res, rows, g);
            const members = membersOf(res, g);
            const mine = myGroup === g;
            return (
              <div
                key={g}
                className={`space-y-2 rounded-3xl border-4 bg-white p-3 ${mine ? "border-rose-500" : "border-slate-200"}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-3xl" style={{ color: clusterColor(g) }} aria-hidden>{CLUSTER_SHAPE_ICONS[g % 5]}</span>
                  {onSaveNames ? (
                    <input
                      value={names[res.k]?.[g] ?? ""}
                      placeholder={defaultClusterName(g)}
                      maxLength={12}
                      onChange={(e) => setName(g, e.target.value)}
                      aria-label={`${g + 1}번 그룹 이름 붙이기`}
                      className="min-h-12 min-w-0 flex-1 rounded-xl border-2 border-slate-300 px-3 text-lg font-bold focus:border-sky-600 focus:outline-none"
                    />
                  ) : (
                    <span className="flex-1 text-xl font-extrabold">{defaultClusterName(g)}</span>
                  )}
                  {mine && <span className="rounded-full bg-rose-500 px-3 py-1 text-base font-extrabold text-white">내 그룹</span>}
                </div>
                <p className="text-lg font-bold">
                  {members.length}명
                  {m && <span className="ml-2 text-slate-700">평균 소비 {m.consume.toFixed(1)} · 저축 {m.save.toFixed(1)}</span>}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {onTypeChange ? (
                    <label className="flex items-center gap-2 text-base font-bold">
                      유형
                      <select
                        value={res.types[g]}
                        onChange={(e) => onTypeChange(res.k, g, e.target.value as ClusterType)}
                        className="min-h-12 rounded-xl border-2 border-slate-300 bg-white px-2 text-lg font-bold"
                      >
                        {CLUSTER_TYPE_IDS.map((t) => <option key={t} value={t}>{CLUSTER_TYPE_LABEL[t]}</option>)}
                      </select>
                    </label>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-base font-bold" title={CLUSTER_TYPE_HELP[res.types[g]]}>
                      {CLUSTER_TYPE_LABEL[res.types[g]]}
                    </span>
                  )}
                  {!onTypeChange && <span className="text-sm text-slate-600">{CLUSTER_TYPE_HELP[res.types[g]]}</span>}
                </div>
                <p className="text-base text-slate-700">
                  <span className="font-bold">친구들: </span>
                  {members.map((c) => (c === myCode ? <b key={c} className="text-rose-600">{c} </b> : `${c} `))}
                </p>
              </div>
            );
          })}
          {onSaveNames && (
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={state === "saving"} onClick={save}>{state === "saving" ? "저장하는 중…" : "이름 저장하기"}</Button>
              {state === "saved" && <span className="text-lg font-bold text-emerald-700">저장했어요 ✅</span>}
              {state === "error" && <span className="text-lg font-bold text-rose-600" role="alert">저장하지 못했어요. 다시 눌러 봐요.</span>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
