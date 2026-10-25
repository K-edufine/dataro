"use client";

import { useEffect, useRef, useState } from "react";
import { BackLink } from "@/components/ui/BackLink";
import { Button, LinkButton } from "@/components/ui/Button";
import { LessonGate } from "@/components/student/LessonGate";
import {
  CLIMATE_COUNT, MIN_FOR_ANALYSIS, emptyRows, isComplete, rowProblems, rowWarnings, toPayload,
  type ClimateInputRow,
} from "@/lib/climate";
import { loadMyClimate, saveMyClimate } from "@/lib/climate-db";
import type { StudentSession } from "@/lib/student-session";

const draftKey = (studentId: string) => `dataro.climateDraft.${studentId}`;

function readDraft(studentId: string): ClimateInputRow[] | null {
  try {
    const raw = localStorage.getItem(draftKey(studentId));
    const d = raw ? JSON.parse(raw) : null;
    return Array.isArray(d) && d.length === CLIMATE_COUNT ? (d as ClimateInputRow[]) : null;
  } catch {
    return null;
  }
}

/** 고학년 4차시: 미리 채워진 25개 도시의 연평균 기온·연강수량을 입력한다. */
export function ClimateInputForm() {
  return <LessonGate lessons={[4]}>{(session) => <Loader session={session} />}</LessonGate>;
}

function Loader({ session }: { session: StudentSession }) {
  const [initial, setInitial] = useState<ClimateInputRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    loadMyClimate(session)
      .catch(() => [])
      .then((saved) => {
        if (!alive) return;
        // 저장한 값 위에, 아직 저장하지 않은 임시 입력(이 기기)이 있으면 그것을 쓴다
        const rows = emptyRows().map((preset, i) => {
          const s = saved[i];
          return s ? { country: s.country, city: s.city, temp: String(s.temp), rain: String(s.rain) } : preset;
        });
        setInitial(readDraft(session.studentId) ?? rows);
      });
    return () => {
      alive = false;
    };
  }, [session]);

  if (session.gradeBand !== "high") {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-6 text-center text-2xl font-bold">
        <p>이 화면은 고학년(5~6학년)용이에요.</p>
        <LinkButton href="/student">차시 선택으로</LinkButton>
      </main>
    );
  }
  if (!initial) return <main className="p-6 text-xl">불러오는 중…</main>;
  return <Form session={session} initial={initial} />;
}

const FIELDS = ["country", "city", "temp", "rain"] as const;
type Field = (typeof FIELDS)[number];

function Form({ session, initial }: { session: StudentSession; initial: ClimateInputRow[] }) {
  const [rows, setRows] = useState<ClimateInputRow[]>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const complete = rows.filter(isComplete).length;

  function update(i: number, field: Field, value: string) {
    const next = rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r));
    setRows(next);
    setMessage("");
    try {
      localStorage.setItem(draftKey(session.studentId), JSON.stringify(next)); // 이 기기에 자동 임시 저장
    } catch {
      /* 저장할 수 없는 환경은 무시 */
    }
  }

  const toggleSign = (i: number) => {
    const t = rows[i].temp.trim();
    update(i, "temp", t.startsWith("-") || t.startsWith("−") ? t.slice(1) : `-${t}`);
  };

  /** 엔터: 기온 → 같은 줄 강수량 → 다음 줄 기온 (도시는 미리 채워져 있으니 건너뛴다) */
  function onEnter(i: number, field: Field) {
    const target =
      field === "temp" ? `${i}-rain` : field === "rain" ? `${Math.min(i + 1, rows.length - 1)}-temp` : `${i}-${FIELDS[FIELDS.indexOf(field) + 1]}`;
    inputs.current[target]?.focus();
  }

  async function save() {
    const payload = toPayload(rows);
    if (payload.length === 0) return setError("완성한 줄이 하나도 없어요. 기온과 강수량을 써 주세요.");
    setSaving(true);
    setError("");
    try {
      await saveMyClimate(session, payload);
      try {
        localStorage.removeItem(draftKey(session.studentId));
      } catch {
        /* 무시 */
      }
      setMessage(`${payload.length}개를 저장했어요 ✅`);
    } catch {
      setError("저장하지 못했어요. 선생님이 4차시를 열었는지 확인하고 다시 눌러 봐요.");
    } finally {
      setSaving(false);
    }
  }

  const box = "min-h-12 w-full rounded-xl border-2 border-slate-300 bg-white px-3 text-lg focus:border-sky-600 focus:outline-none";

  return (
    <main className="mx-auto max-w-5xl p-4 pb-36 sm:p-6 sm:pb-36">
      <BackLink />
      <h1 className="mb-1 text-3xl font-extrabold">국가별 기후 데이터 입력하기 ({session.anonCode})</h1>
      <p className="mb-4 text-lg text-slate-700">
        도시마다 <b>연평균 기온(℃)</b>과 <b>연강수량(mm)</b>을 써 주세요. 영하는 앞에 <b>−</b> 버튼을 눌러요. 쓰는 대로 이 기기에 저절로 임시 저장돼요.
      </p>

      <div className="hidden grid-cols-[2.5rem_1fr_1fr_11rem_9rem_2rem] gap-2 px-2 pb-1 text-base font-bold text-slate-600 sm:grid">
        <span>번호</span><span>국가명</span><span>도시명</span><span>연평균 기온(℃)</span><span>연강수량(mm)</span><span />
      </div>
      <ol className="space-y-2">
        {rows.map((r, i) => {
          const done = isComplete(r);
          const started = r.temp.trim() !== "" || r.rain.trim() !== "";
          const problems = started ? rowProblems(r) : [];
          const warnings = done ? rowWarnings(r, rows) : [];
          return (
            <li
              key={i}
              className={`rounded-2xl border-2 p-2 ${done ? "border-emerald-300 bg-emerald-50/40" : "border-slate-200 bg-white"}`}
            >
              <div className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[2.5rem_1fr_1fr_11rem_9rem_2rem]">
                <span className="text-lg font-extrabold sm:text-center">{i + 1}</span>
                <input
                  ref={(el) => { inputs.current[`${i}-country`] = el; }}
                  className={box} value={r.country} maxLength={20} placeholder="국가명" aria-label={`${i + 1}번 국가명`}
                  onChange={(e) => update(i, "country", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onEnter(i, "country")}
                />
                <input
                  ref={(el) => { inputs.current[`${i}-city`] = el; }}
                  className={box} value={r.city} maxLength={20} placeholder="도시명" aria-label={`${i + 1}번 도시명`}
                  onChange={(e) => update(i, "city", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onEnter(i, "city")}
                />
                <div className="flex gap-1">
                  <button
                    type="button" onClick={() => toggleSign(i)}
                    aria-label={`${i + 1}번 기온 영하로 바꾸기`}
                    className="min-h-12 min-w-12 rounded-xl border-2 border-slate-300 bg-white text-2xl font-extrabold transition active:scale-90"
                  >
                    −
                  </button>
                  <input
                    ref={(el) => { inputs.current[`${i}-temp`] = el; }}
                    className={box} value={r.temp} inputMode="decimal" placeholder="예: 12.5" aria-label={`${i + 1}번 연평균 기온`}
                    onChange={(e) => update(i, "temp", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && onEnter(i, "temp")}
                  />
                </div>
                <input
                  ref={(el) => { inputs.current[`${i}-rain`] = el; }}
                  className={box} value={r.rain} inputMode="numeric" placeholder="예: 1450" aria-label={`${i + 1}번 연강수량`}
                  onChange={(e) => update(i, "rain", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onEnter(i, "rain")}
                />
                <span className="text-2xl" aria-label={done ? "다 썼어요" : "아직 안 썼어요"}>{done ? "✅" : ""}</span>
              </div>
              {problems.length > 0 && <p className="mt-1 pl-2 text-base font-bold text-rose-600">{problems.join(" · ")}</p>}
              {warnings.length > 0 && <p className="mt-1 pl-2 text-base font-bold text-amber-700">⚠ {warnings.join(" · ")}</p>}
            </li>
          );
        })}
      </ol>

      <div className="fixed inset-x-0 bottom-0 border-t-2 border-slate-200 bg-white/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
          <p className="text-xl font-extrabold">{complete} / {CLIMATE_COUNT}개</p>
          <div className="h-3 w-32 overflow-hidden rounded-full bg-slate-200 sm:w-48" role="progressbar" aria-valuemin={0} aria-valuemax={CLIMATE_COUNT} aria-valuenow={complete}>
            <div className="h-full bg-sky-600 transition-all" style={{ width: `${(complete / CLIMATE_COUNT) * 100}%` }} />
          </div>
          <p className="min-w-0 flex-1 text-base font-bold">
            {error ? <span className="text-rose-600" role="alert">{error}</span>
              : message ? <span className="text-emerald-700">{message}</span>
              : complete < MIN_FOR_ANALYSIS ? <span className="text-slate-600">{MIN_FOR_ANALYSIS}개 이상 써야 5차시 분석을 할 수 있어요</span>
              : complete < CLIMATE_COUNT ? <span className="text-slate-600">다 쓰지 않아도 저장할 수 있어요. 나중에 이어서 써요</span>
              : <span className="text-emerald-700">모두 썼어요! 저장해 주세요</span>}
          </p>
          <Button className="min-w-40" disabled={saving || complete === 0} onClick={save}>
            {saving ? "저장하는 중…" : `저장하기 (${complete}개)`}
          </Button>
        </div>
      </div>
    </main>
  );
}
