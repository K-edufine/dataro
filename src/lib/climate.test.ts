import { describe, expect, it } from "vitest";
import {
  CLIMATE_COUNT, MIN_FOR_ANALYSIS, emptyRows, isBlank, isComplete, parseRain, parseTemp, rowProblems, rowWarnings, toPayload,
} from "./climate";

const row = (over: Partial<Record<"country" | "city" | "temp" | "rain", string>> = {}) => ({
  country: "대한민국", city: "서울", temp: "12.5", rain: "1450", ...over,
});

describe("기후 데이터 입력", () => {
  it("25개 도시가 미리 채워져 있다", () => {
    expect(CLIMATE_COUNT).toBe(25);
    expect(MIN_FOR_ANALYSIS).toBeLessThan(CLIMATE_COUNT);
    const rows = emptyRows();
    expect(rows).toHaveLength(25);
    expect(rows[0]).toEqual({ country: "대한민국", city: "서울", temp: "", rain: "" });
    expect(new Set(rows.map((r) => r.city)).size).toBe(25);
  });

  it("기온: 영하·소수·여러 가지 마이너스 기호를 읽는다", () => {
    expect(parseTemp("12.5")).toBe(12.5);
    expect(parseTemp("-9")).toBe(-9);
    expect(parseTemp("−3.5")).toBe(-3.5); // 유니코드 마이너스
    expect(parseTemp("3,5")).toBe(3.5); // 쉼표 소수점
    expect(parseTemp("12.54")).toBe(12.5);
    expect(parseTemp(" 7 ")).toBe(7);
  });

  it("기온: 숫자가 아니거나 범위 밖이면 null", () => {
    expect(parseTemp("")).toBeNull();
    expect(parseTemp("abc")).toBeNull();
    expect(parseTemp("61")).toBeNull();
    expect(parseTemp("-61")).toBeNull();
    expect(parseTemp("1.2.3")).toBeNull();
  });

  it("강수량: 정수, 천 단위 쉼표 허용", () => {
    expect(parseRain("1450")).toBe(1450);
    expect(parseRain("1,450")).toBe(1450);
    expect(parseRain("0")).toBe(0);
    expect(parseRain("-5")).toBeNull();
    expect(parseRain("12.5")).toBeNull();
    expect(parseRain("12001")).toBeNull();
    expect(parseRain("")).toBeNull();
  });

  it("행이 완성되었는지/비었는지", () => {
    expect(isComplete(row())).toBe(true);
    expect(isComplete(row({ temp: "" }))).toBe(false);
    expect(isComplete(row({ city: "  " }))).toBe(false);
    expect(isBlank({ country: "", city: "", temp: "", rain: "" })).toBe(true);
    expect(isBlank(row())).toBe(false);
  });

  it("무엇이 잘못됐는지 알려 준다 (빈 행은 문제 없음)", () => {
    expect(rowProblems({ country: "", city: "", temp: "", rain: "" })).toEqual([]);
    expect(rowProblems(row({ temp: "999" }))[0]).toContain("기온");
    expect(rowProblems(row({ rain: "" }))).toEqual(["연강수량을 써 주세요"]);
    expect(rowProblems(row())).toEqual([]);
  });

  it("막지는 않고 되묻는 경고", () => {
    expect(rowWarnings(row({ temp: "55" }))).toHaveLength(1);
    expect(rowWarnings(row({ rain: "11000" }))).toHaveLength(1);
    expect(rowWarnings(row())).toEqual([]);
    const dup = [row(), row({ country: "일본" })];
    expect(rowWarnings(dup[0], dup)).toContain("같은 도시가 두 번 있어요");
  });

  it("서버에는 완성된 행만 보낸다", () => {
    const rows = [row(), row({ city: "도쿄", temp: "" }), row({ city: "파리", temp: "-3,5", rain: "1,200" })];
    expect(toPayload(rows)).toEqual([
      { country: "대한민국", city: "서울", temp: 12.5, rain: 1450 },
      { country: "대한민국", city: "파리", temp: -3.5, rain: 1200 },
    ]);
  });
});
