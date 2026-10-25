"use client";

import { useEffect, useState } from "react";
import { fetchConfirmed, fetchMyLabels, type ConfirmedState } from "@/lib/class-db";
import { findMyCluster, type MyCluster } from "@/lib/my-cluster";
import type { StudentSession } from "@/lib/student-session";

export interface MyClusterData {
  /** 확정된 결과가 있는지 */
  confirmed: ConfirmedState;
  mine: MyCluster | null;
  /** 같은 결과의 다른 그룹 번호들 */
  others: { group: number; type: MyCluster["type"]; name: string }[];
}

/** 교사가 확정한 결과에서 내 그룹과 다른 그룹을 찾는다. 실패하면 null, 불러오는 중이면 undefined */
export function useMyClusterData(session: StudentSession): MyClusterData | null | undefined {
  const [state, setState] = useState<{ id: string; data: MyClusterData | null } | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetchConfirmed("student", session.classId),
      fetchMyLabels(session).catch(() => ({}) as Record<number, string[]>),
    ])
      .then(([confirmed, labels]) => {
        if (!alive) return;
        const mine = findMyCluster(confirmed, session.anonCode, labels);
        const res = confirmed.results.find((r) => r.k === confirmed.mainK) ?? confirmed.results[confirmed.results.length - 1];
        const others = res
          ? res.types
              .map((type, group) => ({ group, type, name: labels[res.k]?.[group]?.trim() || `${group + 1}번 그룹` }))
              .filter((o) => o.group !== mine?.group)
          : [];
        setState({ id: session.studentId, data: { confirmed, mine, others } });
      })
      .catch(() => alive && setState({ id: session.studentId, data: null }));
    return () => {
      alive = false;
    };
  }, [session]);

  return state?.id === session.studentId ? state.data : undefined;
}
