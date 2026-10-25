import data from "@/data/climate-cities.json";

/** 고학년 4차시: 국가별 기후 데이터 입력 (연평균 기온 ℃, 연강수량 mm) */

export interface PresetCity {
  country: string;
  city: string;
}

export const PRESET_CITIES: PresetCity[] = data.cities;
/** 입력해야 하는 도시 수 */
export const CLIMATE_COUNT = PRESET_CITIES.length;
/** 5차시 분석을 열 수 있는 최소 입력 개수 */
export const MIN_FOR_ANALYSIS = 10;

export const TEMP_MIN = -60;
export const TEMP_MAX = 60;
export const RAIN_MAX = 12000;
/** 이 값을 넘으면 막지는 않고 "맞나요?" 하고 되묻는다 */
export const SOFT_TEMP = 50;
export const SOFT_RAIN = 10000;

/** 입력 칸의 글자 그대로의 값 */
export interface ClimateInputRow {
  country: string;
  city: string;
  temp: string;
  rain: string;
}

export interface ClimateRow {
  country: string;
  city: string;
  temp: number;
  rain: number;
}

const clean = (text: string) => text.replace(/[−–﹣－]/g, "-").replace(/,/g, ".").replace(/\s/g, "");

/** "-3.5", "−3,5" → -3.5 (소수 첫째 자리까지). 올바르지 않으면 null */
export function parseTemp(text: string): number | null {
  const t = clean(text);
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  const v = Math.round(Number(t) * 10) / 10;
  return v >= TEMP_MIN && v <= TEMP_MAX ? v : null;
}

/** "1,450", "1450" → 1450 (정수). 올바르지 않으면 null */
export function parseRain(text: string): number | null {
  const t = text.replace(/[,\s]/g, "");
  if (!/^\d+$/.test(t)) return null;
  const v = Number(t);
  return v <= RAIN_MAX ? v : null;
}

export function toRow(r: ClimateInputRow): ClimateRow | null {
  const country = r.country.trim();
  const city = r.city.trim();
  const temp = parseTemp(r.temp);
  const rain = parseRain(r.rain);
  return country && city && temp !== null && rain !== null ? { country, city, temp, rain } : null;
}

export const isComplete = (r: ClimateInputRow): boolean => toRow(r) !== null;
export const isBlank = (r: ClimateInputRow): boolean => !r.country.trim() && !r.city.trim() && !r.temp.trim() && !r.rain.trim();

/** 칸마다 무엇이 잘못됐는지 알려 주는 말 (비어 있으면 빈 배열) */
export function rowProblems(r: ClimateInputRow): string[] {
  if (isBlank(r)) return [];
  const out: string[] = [];
  if (!r.country.trim()) out.push("국가명을 써 주세요");
  if (!r.city.trim()) out.push("도시명을 써 주세요");
  if (!r.temp.trim()) out.push("연평균 기온을 써 주세요");
  else if (parseTemp(r.temp) === null) out.push(`기온은 ${TEMP_MIN}~${TEMP_MAX} 사이 숫자로 써 주세요`);
  if (!r.rain.trim()) out.push("연강수량을 써 주세요");
  else if (parseRain(r.rain) === null) out.push(`강수량은 0~${RAIN_MAX.toLocaleString("ko-KR")} 사이 숫자로 써 주세요`);
  return out;
}

/** 막지는 않지만 한 번 더 확인해 보라고 알려 주는 말 */
export function rowWarnings(r: ClimateInputRow, all: readonly ClimateInputRow[] = []): string[] {
  const out: string[] = [];
  const temp = parseTemp(r.temp);
  const rain = parseRain(r.rain);
  if (temp !== null && Math.abs(temp) > SOFT_TEMP) out.push("기온이 너무 높거나 낮아요. 맞는지 확인해 봐요");
  if (rain !== null && rain > SOFT_RAIN) out.push("강수량이 아주 많아요. 맞는지 확인해 봐요");
  const city = r.city.trim();
  if (city && all.filter((x) => x.city.trim() === city).length > 1) out.push("같은 도시가 두 번 있어요");
  return out;
}

/** 서버에 보낼 행들: 모두 채워진 행만 */
export function toPayload(rows: readonly ClimateInputRow[]): ClimateRow[] {
  return rows.map(toRow).filter((r): r is ClimateRow => r !== null);
}

/** 미리 채운 도시 목록으로 빈 입력 행 만들기 */
export function emptyRows(): ClimateInputRow[] {
  return PRESET_CITIES.map((c) => ({ country: c.country, city: c.city, temp: "", rain: "" }));
}
