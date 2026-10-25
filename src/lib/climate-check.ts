import { RAIN_MAX, SOFT_RAIN, SOFT_TEMP } from "@/lib/climate";

export interface EnteredClimate {
  studentId: string;
  sortOrder: number;
  country: string;
  city: string;
  temp: number;
  rain: number;
}

export type FlagKind = "range" | "far-from-class";

export interface Flag {
  studentId: string;
  sortOrder: number;
  city: string;
  kind: FlagKind;
  /** 사람이 읽는 설명 */
  message: string;
}

const median = (v: number[]): number => {
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** 같은 도시를 3명 이상이 입력했을 때, 학급 중앙값에서 이만큼 벗어나면 의심한다 */
export const MIN_SAME_CITY = 3;
export const TEMP_GAP = 5; // ℃
export const RAIN_GAP_MIN = 300; // mm
export const RAIN_GAP_RATIO = 0.5; // 중앙값의 50%

/**
 * 교사가 입력 실수를 빨리 잡도록 의심 값을 찾는다.
 * - range: 현실적으로 보기 어려운 값 (기온 ±50℃ 밖, 강수량 10,000mm 초과)
 * - far-from-class: 같은 도시를 입력한 다른 학생들의 값(중앙값)과 크게 다름
 * 막지 않고 알려 주기만 한다. (실제로 그런 도시도 있을 수 있다)
 */
export function findFlags(rows: readonly EnteredClimate[]): Flag[] {
  const flags: Flag[] = [];
  const byCity = new Map<string, EnteredClimate[]>();
  for (const r of rows) {
    const key = r.city.trim();
    byCity.set(key, [...(byCity.get(key) ?? []), r]);
  }

  for (const r of rows) {
    const base = { studentId: r.studentId, sortOrder: r.sortOrder, city: r.city };
    if (Math.abs(r.temp) > SOFT_TEMP) flags.push({ ...base, kind: "range", message: `기온 ${r.temp}℃는 보기 드문 값이에요` });
    if (r.rain > SOFT_RAIN || r.rain > RAIN_MAX) flags.push({ ...base, kind: "range", message: `강수량 ${r.rain.toLocaleString("ko-KR")}mm는 보기 드문 값이에요` });

    const same = byCity.get(r.city.trim()) ?? [];
    if (same.length >= MIN_SAME_CITY) {
      const medT = median(same.map((x) => x.temp));
      const medR = median(same.map((x) => x.rain));
      if (Math.abs(r.temp - medT) > TEMP_GAP) {
        flags.push({ ...base, kind: "far-from-class", message: `기온 ${r.temp}℃ (친구들은 보통 ${medT.toFixed(1)}℃)` });
      }
      if (Math.abs(r.rain - medR) > Math.max(RAIN_GAP_MIN, medR * RAIN_GAP_RATIO)) {
        flags.push({ ...base, kind: "far-from-class", message: `강수량 ${r.rain.toLocaleString("ko-KR")}mm (친구들은 보통 ${Math.round(medR).toLocaleString("ko-KR")}mm)` });
      }
    }
  }
  return flags;
}
