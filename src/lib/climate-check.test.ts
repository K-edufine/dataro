import { describe, expect, it } from "vitest";
import { findFlags, type EnteredClimate } from "./climate-check";

const e = (studentId: string, city: string, temp: number, rain: number, sortOrder = 0): EnteredClimate => ({
  studentId, sortOrder, country: "대한민국", city, temp, rain,
});

describe("의심 값 찾기", () => {
  it("비슷하게 입력한 값은 문제없다", () => {
    const rows = [e("a", "서울", 12.5, 1450), e("b", "서울", 12.3, 1500), e("c", "서울", 12.8, 1400)];
    expect(findFlags(rows)).toEqual([]);
  });

  it("소수점을 빼먹은 값(125℃)을 알려 준다", () => {
    const rows = [e("a", "서울", 12.5, 1450), e("b", "서울", 12.3, 1500), e("c", "서울", 125 / 1, 1400)];
    const flags = findFlags(rows).filter((f) => f.studentId === "c");
    expect(flags.some((f) => f.kind === "range")).toBe(true);
    expect(flags.some((f) => f.kind === "far-from-class" && f.message.includes("12.5"))).toBe(true);
  });

  it("강수량이 학급 중앙값보다 훨씬 크거나 작으면 알려 준다", () => {
    const rows = [e("a", "런던", 11, 600), e("b", "런던", 11, 620), e("c", "런던", 11, 6000), e("d", "런던", 11, 100)];
    const flags = findFlags(rows);
    expect(flags.filter((f) => f.kind === "far-from-class").map((f) => f.studentId).sort()).toEqual(["c", "d"]);
  });

  it("같은 도시를 3명 미만이 입력했으면 비교하지 않는다", () => {
    const rows = [e("a", "리마", 19, 10), e("b", "리마", 5, 3000)];
    expect(findFlags(rows)).toEqual([]);
  });

  it("작은 차이는 무시한다 (기온 5℃·강수량 300mm 이하)", () => {
    const rows = [e("a", "파리", 12, 640), e("b", "파리", 15, 800), e("c", "파리", 12, 600)];
    expect(findFlags(rows)).toEqual([]);
  });

  it("영하 기온은 문제없다", () => {
    const rows = [e("a", "야쿠츠크", -9, 240), e("b", "야쿠츠크", -8.5, 250), e("c", "야쿠츠크", -9.4, 230)];
    expect(findFlags(rows)).toEqual([]);
  });
});
