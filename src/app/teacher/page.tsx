"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { ClassRow } from "@/lib/supabase/types";
import { teacherSignOut, useTeacherGuard } from "@/lib/teacher";

export default function TeacherHome() {
  const router = useRouter();
  const { ready, email } = useTeacherGuard();
  const [classes, setClasses] = useState<ClassRow[] | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    Promise.resolve(getSupabase("teacher").from("classes").select("*").order("created_at", { ascending: false }))
      .then(({ data }) => alive && setClasses((data as ClassRow[]) ?? []));
    return () => {
      alive = false;
    };
  }, [ready]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    const { data, error: err } = await getSupabase("teacher").rpc("create_class", { p_name: name });
    setBusy(false);
    if (err) return setError("학급을 만들지 못했어요. 잠시 뒤에 다시 해 주세요.");
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

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">내 학급</h1>
          <p className="text-base text-slate-600">{email}</p>
        </div>
        <Button variant="ghost" onClick={logout}>로그아웃</Button>
      </header>

      <form onSubmit={create} className="mb-6 flex flex-wrap gap-3 rounded-3xl bg-sky-50 p-4">
        <input
          value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="새 학급 이름 (예: 3학년 2반)"
          aria-label="새 학급 이름"
          className="min-h-14 min-w-0 flex-1 rounded-xl border-2 border-slate-300 px-4 text-lg focus:border-sky-600 focus:outline-none"
        />
        <Button type="submit" disabled={busy || !name.trim()}>학급 만들기</Button>
        {error && <p className="w-full font-bold text-rose-600" role="alert">{error}</p>}
      </form>

      {classes === null ? (
        <p className="text-xl">불러오는 중…</p>
      ) : classes.length === 0 ? (
        <p className="text-xl text-slate-600">아직 학급이 없어요. 위에서 만들어 보세요.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {classes.map((c) => (
            <li key={c.id}>
              <Link href={`/teacher/classes/${c.id}`} className="flex min-h-24 items-center justify-between gap-3 rounded-3xl border-2 border-slate-200 bg-white p-4 shadow-sm transition active:scale-[0.98]">
                <span className="text-xl font-extrabold">{c.name}</span>
                <span className="rounded-xl bg-amber-100 px-3 py-1 font-mono text-2xl font-extrabold tracking-widest">{c.code}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
