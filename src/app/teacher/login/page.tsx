"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export default function TeacherLogin() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const auth = getSupabase("teacher").auth;
    if (mode === "login") {
      const { error } = await auth.signInWithPassword({ email, password });
      if (error) setMessage("이메일이나 비밀번호가 맞지 않아요.");
      else router.push("/teacher");
    } else {
      const { data, error } = await auth.signUp({ email, password });
      if (error) setMessage(error.message);
      else if (data.session) router.push("/teacher");
      else setMessage("가입 확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요.");
    }
    setBusy(false);
  }

  const field = "min-h-14 w-full rounded-xl border-2 border-slate-300 px-4 text-lg focus:border-sky-600 focus:outline-none";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 p-6">
      <Link href="/" className="text-base font-bold text-sky-700 underline">← 학생 화면으로</Link>
      <h1 className="text-3xl font-extrabold">선생님 {mode === "login" ? "로그인" : "가입"}</h1>
      {!isSupabaseConfigured ? (
        <p className="rounded-2xl bg-rose-50 p-4 font-bold text-rose-700">Supabase 설정이 아직 없어요. docs/supabase-setup.md 를 확인해 주세요.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <input className={field} type="email" required placeholder="이메일" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={field} type="password" required minLength={6} placeholder="비밀번호 (6자 이상)" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
          {message && <p className="font-bold text-rose-600" role="alert">{message}</p>}
          <Button type="submit" disabled={busy} className="w-full">{mode === "login" ? "로그인" : "가입하기"}</Button>
          <button type="button" className="w-full text-base font-bold text-slate-600 underline" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>
            {mode === "login" ? "처음이에요 (가입하기)" : "이미 계정이 있어요 (로그인)"}
          </button>
        </form>
      )}
    </main>
  );
}
