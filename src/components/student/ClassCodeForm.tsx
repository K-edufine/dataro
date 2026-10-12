"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { joinClass, type StudentSession } from "@/lib/student-session";

export function ClassCodeForm({ onJoined }: { onJoined?: (s: StudentSession) => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return setError("학급 코드를 써 주세요.");
    setBusy(true);
    setError("");
    try {
      const s = await joinClass(code);
      onJoined?.(s);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <p className="rounded-2xl bg-rose-50 p-4 text-lg font-bold text-rose-700">
        아직 서버 설정이 끝나지 않았어요. 선생님께 알려 주세요.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full flex-col items-center gap-4">
      <label className="w-full text-xl font-bold" htmlFor="class-code">선생님이 알려 준 학급 코드를 써요</label>
      <input
        id="class-code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
        autoComplete="off"
        autoCapitalize="characters"
        placeholder="ABC12"
        className="min-h-20 w-full max-w-sm rounded-2xl border-4 border-slate-300 bg-white px-4 text-center text-4xl font-extrabold uppercase tracking-[0.3em] focus:border-sky-600 focus:outline-none"
      />
      {error && <p className="text-lg font-bold text-rose-600" role="alert">{error}</p>}
      <Button type="submit" disabled={busy} className="min-h-16 w-full max-w-sm text-2xl">
        {busy ? "들어가는 중…" : "들어가기"}
      </Button>
    </form>
  );
}
