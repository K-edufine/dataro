"use client";

import Link from "next/link";
import { useStudentSession } from "@/lib/student-session";

/**
 * 학급에 입장한 학생은 차시 선택 화면으로, 코드 없이 체험 중인 사람은 첫 화면으로 돌아간다.
 */
export function BackLink() {
  const { session } = useStudentSession();
  return (
    <Link href={session ? "/student" : "/"} className="inline-flex min-h-12 items-center text-base font-bold text-sky-700 underline">
      {session ? "← 차시 선택" : "← 처음으로"}
    </Link>
  );
}
