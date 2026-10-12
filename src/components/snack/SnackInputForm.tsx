"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BackLink } from "@/components/ui/BackLink";
import { Button } from "@/components/ui/Button";
import { LessonGate } from "@/components/student/LessonGate";
import { DEFAULT_SNACK_COUNT, MAX_SNACKS, MIN_SNACKS } from "@/lib/snack-data";
import { loadMySnacks, saveMySnacks } from "@/lib/snack-db";
import type { StudentSession } from "@/lib/student-session";
import type { Snack } from "@/types/snack";

interface Row { name: string; price: string; taste: number }

const emptyRow = (): Row => ({ name: "", price: "", taste: 0 });

function rowError(r: Row): string | null {
  const blank = !r.name.trim() && !r.price && r.taste === 0;
  if (blank) return null;
  if (!r.name.trim()) return "간식 이름을 써 주세요";
  const p = Number(r.price);
  if (!Number.isInteger(p) || p <= 0) return "가격을 숫자로 써 주세요";
  if (r.taste < 1) return "맛 점수를 골라 주세요";
  return null;
}

/** 4차시가 열린 학급의 학생만 입력할 수 있다. 이미 저장한 데이터가 있으면 이어서 고친다. */
export function SnackInputForm() {
  return <LessonGate lessons={[4]}>{(session) => <Loader session={session} />}</LessonGate>;
}

function Loader({ session }: { session: StudentSession }) {
  const [initial, setInitial] = useState<Snack[] | null>(null);

  useEffect(() => {
    let alive = true;
    loadMySnacks(session)
      .then((s) => alive && setInitial(s))
      .catch(() => alive && setInitial([])); // 못 불러오면 빈 입력칸으로 시작
    return () => {
      alive = false;
    };
  }, [session]);

  if (!initial) return <main className="p-6 text-xl">불러오는 중…</main>;
  return <Form session={session} initial={initial} />;
}

function toRows(initial: Snack[]): Row[] {
  const filled: Row[] = initial.map((s) => ({ name: s.name, price: String(s.price), taste: Math.round(s.taste) }));
  const count = Math.max(DEFAULT_SNACK_COUNT, filled.length);
  return [...filled, ...Array.from({ length: count - filled.length }, emptyRow)];
}

function Form({ session, initial }: { session: StudentSession; initial: Snack[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => toRows(initial));
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const update = (i: number, patch: Partial<Row>) =>
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const errors = rows.map(rowError);
  const valid = rows.filter((r, i) => r.name.trim() && !errors[i]);
  const canSave = errors.every((e) => !e) && valid.length >= MIN_SNACKS;

  async function save() {
    setTried(true);
    setSaveError("");
    if (!canSave) return;
    const snacks: Snack[] = valid.map((r, i) => ({
      id: `m${i + 1}`, name: r.name.trim(), price: Number(r.price), taste: r.taste,
    }));
    setSaving(true);
    try {
      await saveMySnacks(session, snacks);
      router.push("/snack/mine");
    } catch {
      setSaveError("저장하지 못했어요. 선생님이 4차시를 열었는지 확인하고 다시 해 봐요.");
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <BackLink />
      <h1 className="mb-1 text-3xl font-extrabold">내 간식 데이터 만들기</h1>
      <p className="mb-4 text-lg text-slate-700">
        내가 좋아하는 간식을 써 보세요. 가격과 맛 점수(1~5점)도 정해요. 최소 {MIN_SNACKS}개가 필요해요.
      </p>

      <ol className="space-y-3">
        {rows.map((r, i) => (
          <li key={i} className="rounded-3xl border-2 border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-8 text-xl font-extrabold">{i + 1}</span>
              <input
                value={r.name}
                maxLength={12}
                placeholder="간식 이름"
                aria-label={`${i + 1}번 간식 이름`}
                onChange={(e) => update(i, { name: e.target.value })}
                className="min-h-14 min-w-0 flex-1 rounded-xl border-2 border-slate-300 px-3 text-lg font-bold focus:border-sky-600 focus:outline-none"
              />
              <label className="flex items-center gap-1">
                <input
                  value={r.price}
                  inputMode="numeric"
                  placeholder="가격"
                  aria-label={`${i + 1}번 간식 가격`}
                  onChange={(e) => update(i, { price: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                  className="min-h-14 w-28 rounded-xl border-2 border-slate-300 px-3 text-lg font-bold focus:border-sky-600 focus:outline-none"
                />
                <span className="text-lg font-bold">원</span>
              </label>
            </div>
            <div className="mt-2 flex items-center gap-1 pl-10" role="group" aria-label={`${i + 1}번 간식 맛 점수`}>
              <span className="mr-2 text-base text-slate-600">맛 점수</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => update(i, { taste: n })}
                  aria-label={`${n}점`}
                  aria-pressed={r.taste === n}
                  className={`min-h-12 min-w-12 rounded-xl text-3xl transition active:scale-90 ${
                    n <= r.taste ? "text-amber-500" : "text-slate-300"
                  }`}
                >
                  ★
                </button>
              ))}
              <span className="ml-2 text-lg font-bold">{r.taste > 0 ? `${r.taste}점` : ""}</span>
            </div>
            {tried && errors[i] && <p className="mt-1 pl-10 text-base font-bold text-rose-600">{errors[i]}</p>}
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="ghost" disabled={rows.length <= MIN_SNACKS} onClick={() => setRows(rows.slice(0, -1))}>
          − 하나 줄이기
        </Button>
        <span className="text-xl font-extrabold">{rows.length}개</span>
        <Button variant="ghost" disabled={rows.length >= MAX_SNACKS} onClick={() => setRows([...rows, emptyRow()])}>
          + 하나 늘리기
        </Button>
      </div>

      {tried && !canSave && errors.every((e) => !e) && (
        <p className="mt-3 text-lg font-bold text-rose-600">간식을 {MIN_SNACKS}개 이상 채워 주세요. (지금 {valid.length}개)</p>
      )}
      {saveError && <p className="mt-3 text-lg font-bold text-rose-600" role="alert">{saveError}</p>}
      <Button className="mt-6 w-full text-xl" disabled={saving} onClick={save}>
        {saving ? "저장하는 중…" : "저장하고 군집 체험하러 가기"}
      </Button>
    </main>
  );
}
