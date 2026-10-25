import { preferenceText, won } from "@/lib/format";
import { niceTicks } from "@/lib/ticks";

/** 군집 분석 화면(5차시)이 다루는 점 하나: 저학년은 간식, 고학년은 도시 */
export interface Item {
  id: string;
  name: string;
  /** 이름 옆에 덧붙일 설명 (도시의 국가 등) */
  sub?: string;
  x: number;
  y: number;
}

/** 데이터 종류마다 다른 이름·단위·축 설정 */
export interface DatasetSpec {
  /** "간식", "도시" */
  itemNoun: string;
  xName: string;
  yName: string;
  xLabel: string;
  yLabel: string;
  formatX: (v: number) => string;
  formatY: (v: number) => string;
  formatTickX: (v: number) => string;
  xDomain: [number, number];
  yDomain: [number, number];
  xTicks: number[];
  yTicks: number[];
  /** 툴팁·점 설명에 쓰는 한 줄 */
  describe: (item: Item) => string;
  /** 이름표를 처음부터 보여 줄 만큼 점이 적은가 */
  labelsByDefault: boolean;
}

/** 저학년: 가격(원) × 선호도(점) */
export function snackSpec(items: readonly Item[]): DatasetSpec {
  const maxPrice = Math.max(...items.map((i) => i.x));
  const xMax = Math.max(1000, Math.ceil((maxPrice * 1.1) / 500) * 500);
  const step = xMax <= 3000 ? 500 : xMax <= 6000 ? 1000 : Math.ceil(xMax / 5 / 500) * 500;
  return {
    itemNoun: "간식",
    xName: "가격",
    yName: "선호도",
    xLabel: "가격(원)",
    yLabel: "선호도(점)",
    formatX: won,
    formatY: preferenceText,
    formatTickX: (v) => v.toLocaleString("ko-KR"),
    xDomain: [0, xMax],
    yDomain: [0.5, 5.5],
    xTicks: niceTicks(0, xMax, step),
    yTicks: [1, 2, 3, 4, 5],
    describe: (i) => `${i.name} (${won(i.x)}, ${preferenceText(i.y)})`,
    labelsByDefault: true,
  };
}

/** 고학년: 연평균 기온(℃) × 연강수량(mm) */
export function climateSpec(items: readonly Item[]): DatasetSpec {
  const temps = items.map((i) => i.x);
  const lo = Math.floor((Math.min(...temps) - 2) / 5) * 5;
  const hi = Math.max(lo + 10, Math.ceil((Math.max(...temps) + 2) / 5) * 5);
  const tStep = hi - lo > 40 ? 10 : 5;
  const maxRain = Math.max(...items.map((i) => i.y));
  const yMax = Math.max(1000, Math.ceil((maxRain * 1.1) / 500) * 500);
  const rStep = yMax <= 2000 ? 500 : yMax <= 5000 ? 1000 : 2000;
  const fx = (v: number) => `${v.toFixed(1)}℃`;
  const fy = (v: number) => `${Math.round(v).toLocaleString("ko-KR")}mm`;
  return {
    itemNoun: "도시",
    xName: "기온",
    yName: "강수량",
    xLabel: "연평균 기온(℃)",
    yLabel: "연강수량(mm)",
    formatX: fx,
    formatY: fy,
    formatTickX: (v) => String(v),
    xDomain: [lo, hi],
    yDomain: [0, yMax],
    xTicks: niceTicks(lo, hi, tStep),
    yTicks: niceTicks(0, yMax, rStep),
    describe: (i) => `${i.name}${i.sub ? ` (${i.sub})` : ""} · ${fx(i.x)} · ${fy(i.y)}`,
    labelsByDefault: items.length <= 15,
  };
}
