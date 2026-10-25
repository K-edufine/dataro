"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { getSupabase, errorCode, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  CLASS_NUMBERS, DEFAULT_STUDENT_COUNT, GRADES, GRADE_BAND_LABEL, SCHOOLS, classLabel, presetFor,
} from "@/lib/schools";
import type { ClassRow } from "@/lib/supabase/types";
import { teacherSignOut, useTeacherGuard } from "@/lib/teacher";

const CREATE_ERRORS: Record<string, string> = {
  class_exists: "이미 같은 학급이 만들어져 있어요. 아래 목록에서 찾아보세요.",
  invalid_input: "입력한 값을 다시 확인해 주세요.",
};

export default function TeacherHome() {
  const router = useRouter();
  const { ready, email } = useTeacherGuard();
  const [classes, setClasses] = useState<ClassRow[] | null>(null);
  const [school, setSchool] = useState(SCHOOLS[0].name);
  const [grade, setGrade] = useState(3);
  const [classNo, setClassNo] = useState(1);
  const [count, setCount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // 학생 수를 직접 고치기 전까지는 미리 등록된 인원을 보여 준다
  const preset = presetFor(school, grade, classNo);
  const shownCount = count !== "" ? count : String(preset?.students ?? DEFAULT_STUDENT_COUNT);
  const countNum = Number(shownCount);
  const countOk = Number.isInteger(countNum) && countNum >= 1 && countNum <= 60;

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    Promise.resolve(
      getSupabase("teacher").from("classes").select("*").order("created_at", { ascending: false }),
    ).then(({ data }) => alive && setClasses((data as ClassRow[]) ?? []));
    return () => {
      alive = false;
    };
  }, [ready]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!countOk) return;
    setBusy(true);
    setError("");
    const { data, error: err } = await getSupabase("teacher").rpc("create_class", {
      p_school: school, p_grade: grade, p_class_no: classNo, p_student_count: countNum,
    });
    setBusy(false);
    if (err) return setError(CREATE_ERRORS[errorCode(err)] ?? "학급을 만들지 못했어요. 잠시 뒤에 다시 해 주세요.");
    router.push(`/teacher/classes/${(data as ClassRow).id}`);
  }

  async function logout() {
    await teacherSignOut();
    router.replace("/teacher/login");
  }

  if (!isSupabaseConfigured) {
    return <main className="p-6 text-lg font-bold text-rose-700">Supabase 설정이 아직 없어요. docs/supabase-setup.md 를 확인해 주세요.</main>;
  }
  if (!ready) return <main className="p-6 text-xl">불러오는 중…</main>;

  const select = "min-h-14 w-full rounded-xl border-2 border-slate-300 bg-white px-3 text-lg font-bold focus:border-sky-600 focus:outline-none";

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">내 학급</h1>
          <p className="text-base text-slate-600">{email}</p>
        </div>
        <Button variant="ghost" onClick={logout}>로그아웃</Button>
      </header>

      <form onSubmit={create} className="mb-6 space-y-3 rounded-3xl bg-sky-50 p-4">
        <h2 className="text-xl font-extrabold">새 학급 열기</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block text-base font-bold">학교
            <select className={select} value={school} onChange={(e) => { setSchool(e.target.value); setCount(""); }}>
              {SCHOOLS.map((s) => <option key={s.name}>{s.name}</option>)}
            </select>
          </label>
          <label className="block text-base font-bold">학년
            <select className={select} value={grade} onChange={(e) => { setGrade(Number(e.target.value)); setCount(""); }}>
              {GRADES.map((g) => <option key={g} value={g}>{g}학년</option>)}
            </select>
          </label>
          <label className="block text-base font-bold">반
            <select className={select} value={classNo} onChange={(e) => { setClassNo(Number(e.target.value)); setCount(""); }}>
              {CLASS_NUMBERS.map((n) => <option key={n} value={n}>{n}반</option>)}
            </select>
          </label>
          <label className="block text-base font-bold">학생 수
            <input
              className={select} type="number" inputMode="numeric" min={1} max={60}
              value={shownCount} onChange={(e) => setCount(e.target.value)}
            />
          </label>
        </div>
        <p className="text-base text-slate-600">
          {GRADE_BAND_LABEL[grade <= 4 ? "low" : "high"]} 학급으로 열려요.
          {preset ? ` 미리 등록된 인원(${preset.students}명)을 넣었어요.` : " 이 학급은 미리 등록된 인원이 없어요. 직접 입력해 주세요."}
        </p>
        {error && <p className="font-bold text-rose-600" role="alert">{error}</p>}
        <Button type="submit" disabled={busy || !countOk}>{`${school} ${grade}학년 ${classNo}반 열기`}</Button>
      </form>

      {classes === null ? (
        <p className="text-xl">불러오는 중…</p>
      ) : classes.length === 0 ? (
        <p className="text-xl text-slate-600">아직 열린 학급이 없어요. 위에서 열어 보세요.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {classes.map((c) => (
            <li key={c.id}>
              <Link href={`/teacher/classes/${c.id}`} className="flex min-h-24 items-center justify-between gap-3 rounded-3xl border-2 border-slate-200 bg-white p-4 shadow-sm transition active:scale-[0.98]">
                <span className="text-xl font-extrabold">{classLabel(c)}</span>
                <span className="rounded-xl bg-amber-100 px-3 py-1 text-base font-extrabold">{GRADE_BAND_LABEL[c.grade_band]} · {c.student_count}명</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
