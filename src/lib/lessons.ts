export interface Lesson {
  n: number;
  title: string;
  mode: "snack" | "tendency";
  /** 아직 만들지 않은 차시는 null */
  href: string | null;
}

export const LESSONS: Lesson[] = [
  { n: 3, title: "K-평균 원리 체험", mode: "snack", href: "/snack/common" },
  { n: 4, title: "간식 선호도 입력하기", mode: "snack", href: "/snack/input" },
  { n: 5, title: "내 간식 군집 분석", mode: "snack", href: "/snack/mine" },
  { n: 6, title: "소비·저축 성향 설문", mode: "tendency", href: "/tendency/survey" },
  { n: 7, title: "학급 성향 군집화", mode: "tendency", href: null },
  { n: 8, title: "추천 정보와 선택", mode: "tendency", href: null },
  { n: 9, title: "확증편향 성찰", mode: "tendency", href: null },
  { n: 10, title: "합리적 소비 기준", mode: "tendency", href: null },
];

export const ALL_LESSON_NUMBERS = LESSONS.map((l) => l.n);
