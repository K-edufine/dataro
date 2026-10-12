"use client";

import { useSyncExternalStore } from "react";
import { useMemo } from "react";
import { SnackLab } from "./SnackLab";
import { LinkButton } from "@/components/ui/Button";
import { getMySnacksRaw, parseMySnacks, subscribeMySnacks } from "@/lib/snack-data";

export function MySnackLab() {
  const raw = useSyncExternalStore(subscribeMySnacks, getMySnacksRaw, () => null);
  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);
  const snacks = useMemo(() => parseMySnacks(raw), [raw]);

  if (!hydrated) return <main className="p-6 text-xl">불러오는 중…</main>;
  if (!snacks) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-6 text-center">
        <p className="text-2xl font-bold">아직 만든 간식 데이터가 없어요.</p>
        <LinkButton href="/snack/input">내 데이터 입력하기</LinkButton>
      </main>
    );
  }
  return <SnackLab snacks={snacks} title="내 간식 데이터" />;
}
