import { getSupabase } from "@/lib/supabase/client";
import type { StudentSession } from "@/lib/student-session";
import type { Snack } from "@/types/snack";

export async function loadMySnacks(session: StudentSession): Promise<Snack[]> {
  const { data, error } = await getSupabase("student")
    .from("snack_data").select("id, name, price, taste, sort_order")
    .eq("student_id", session.studentId).order("sort_order");
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, name: r.name, price: r.price, taste: Number(r.taste) }));
}

export async function saveMySnacks(session: StudentSession, snacks: Snack[]): Promise<void> {
  const { error } = await getSupabase("student").rpc("save_my_snacks", {
    p_class_id: session.classId,
    p_snacks: snacks.map((s) => ({ name: s.name, price: s.price, taste: s.taste })),
  });
  if (error) throw error;
}
