"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  DEFAULT_SNACK_COUNT, MAX_SNACKS, MIN_SNACKS, saveMySnacks,
} from "@/lib/snack-data";
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

export function SnackInputForm() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: DEFAULT_SNACK_COUNT }, emptyRow));
  const [tried, setTried] = useState(false);

  const update = (i: number, patch: Partial<Row>) =>
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const errors = rows.map(rowError);
  const valid = rows.filter((r, i) => r.name.trim() && !errors[i]);
  const canSave = errors.every((e) => !e) && valid.length >= MIN_SNACKS;

  function save() {
    setTried(true);
    if (!canSave) return;
    const snacks: Snack[] = valid.map((r, i) => ({
      id: `m${i + 1}`, name: r.name.trim(), price: Number(r.price), taste: r.taste,
    }));
    saveMySnacks(snacks);
    router.push("/snack/mine");
  }

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <Link href="/snack" className="text-base font-bold text-sky-700 underline">← 처음으로</Link>
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
      <Button className="mt-6 w-full text-xl" onClick={save}>저장하고 군집 체험하러 가기</Button>
    </main>
  );
}
