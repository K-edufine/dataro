import common from "@/data/common-snacks.json";
import type { Snack } from "@/types/snack";

export const commonSnacks: Snack[] = common.snacks;

export const MIN_SNACKS = 5;
export const DEFAULT_SNACK_COUNT = 10;
export const MAX_SNACKS = 30;

const KEY = "dataro.mySnacks";
const listeners = new Set<() => void>();

// TODO(2단계): Supabase snack_data 테이블 저장으로 교체
export function saveMySnacks(snacks: Snack[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(snacks));
  } catch {
    /* 저장 불가 환경은 무시 */
  }
  listeners.forEach((l) => l());
}

export function subscribeMySnacks(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** useSyncExternalStore용: 저장된 원본 문자열 */
export function getMySnacksRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function parseMySnacks(raw: string | null): Snack[] | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return null;
    const ok = data.every(
      (s) =>
        s && typeof s.id === "string" && typeof s.name === "string" &&
        typeof s.price === "number" && typeof s.taste === "number",
    );
    return ok && data.length >= 1 ? (data as Snack[]) : null;
  } catch {
    return null;
  }
}
