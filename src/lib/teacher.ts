"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

/** 로그인한 교사만 통과. 아니면 로그인 화면으로 보낸다. */
export function useTeacherGuard(): { ready: boolean; email: string } {
  const router = useRouter();
  const [state, setState] = useState({ ready: false, email: "" });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let alive = true;
    getSupabase("teacher").auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (!data.session) router.replace("/teacher/login");
      else setState({ ready: true, email: data.session.user.email ?? "" });
    });
    return () => {
      alive = false;
    };
  }, [router]);

  return state;
}

export async function teacherSignOut(): Promise<void> {
  await getSupabase("teacher").auth.signOut();
}
