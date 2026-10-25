import { describe, expect, it } from "vitest";
import { eulReul, eunNeun, hasBatchim, iGa } from "./korean";

describe("조사 고르기", () => {
  it("받침 여부", () => {
    expect(hasBatchim("간식")).toBe(true);
    expect(hasBatchim("도시")).toBe(false);
    expect(hasBatchim("")).toBe(false);
    expect(hasBatchim("abc")).toBe(false);
  });

  it("을/를, 이/가, 은/는", () => {
    expect(eulReul("간식")).toBe("간식을");
    expect(eulReul("도시")).toBe("도시를");
    expect(iGa("간식")).toBe("간식이");
    expect(iGa("도시")).toBe("도시가");
    expect(eunNeun("도시")).toBe("도시는");
    expect(eunNeun("간식")).toBe("간식은");
  });
});

import { judgmentHelp } from "./k-trials";

describe("판단 설명이 점의 이름에 맞게 나온다", () => {
  it("간식/도시", () => {
    expect(judgmentHelp("wide", "도시")).toBe("한 그룹에 서로 다른 도시가 너무 많이 섞였어요");
    expect(judgmentHelp("wide", "간식")).toBe("한 그룹에 서로 다른 간식이 너무 많이 섞였어요");
    expect(judgmentHelp("good", "도시")).toBe("비슷한 도시끼리 잘 모였어요");
    expect(judgmentHelp("split", "간식")).toBe("비슷한 간식이 여러 그룹으로 너무 잘게 나뉘었어요");
  });
});
