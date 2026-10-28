import type { GradeBand } from "@/lib/schools";

export interface Lesson {
  n: number;
  title: string;
  mode: "snack" | "tendency" | "climate" | "traffic";
  /** 아직 만들지 않은 차시는 null */
  href: string | null;
}

/** 저학년(3~4학년): 3~10차시 */
export const LOW_LESSONS: Lesson[] = [
  { n: 3, title: "K-평균 원리 체험", mode: "snack", href: "/snack/common" },
  { n: 4, title: "간식 선호도 입력하기", mode: "snack", href: "/snack/input" },
  { n: 5, title: "내 간식 군집 분석", mode: "snack", href: "/snack/mine" },
  { n: 6, title: "소비·저축 성향 설문", mode: "tendency", href: "/tendency/survey" },
  { n: 7, title: "학급 성향 군집화", mode: "tendency", href: "/tendency/cluster" },
  { n: 8, title: "추천 정보와 선택", mode: "tendency", href: "/tendency/choice" },
  { n: 9, title: "확증편향 성찰", mode: "tendency", href: "/tendency/reflect" },
  { n: 10, title: "합리적 소비 기준", mode: "tendency", href: null },
];

/** 고학년(5~6학년): 4·5·6차시만 쓴다 */
export const HIGH_LESSONS: Lesson[] = [
  { n: 4, title: "국가별 기후 데이터 입력하기", mode: "climate", href: "/climate/input" },
  { n: 5, title: "기후 군집 분석", mode: "climate", href: "/climate/analysis" },
  { n: 6, title: "알맞은 K 찾기 (실루엣 계수)", mode: "traffic", href: "/traffic/analysis" },
];

/** 학급의 학년군에 맞는 차시 목록 */
export function lessonsFor(band: GradeBand): Lesson[] {
  return band === "high" ? HIGH_LESSONS : LOW_LESSONS;
}

export const MODE_LABEL: Record<Lesson["mode"], string> = {
  snack: "간식 모드",
  tendency: "성향 모드",
  climate: "기후 모드",
  traffic: "교통 모드",
};
