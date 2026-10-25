import { describe, expect, it } from "vitest";
import { CLUSTER_KS, computeClassClusters, groupMeans, membersOf } from "./class-cluster";
import { typeOfCentroid } from "./cluster-types";
import { makeDemoRows } from "./demo-class";
import { AXIS_MAX, AXIS_MID, AXIS_MIN } from "./survey";

describe("4유형 판정", () => {
  it("척도 가운데보다 크면 높음, 같거나 작으면 낮음", () => {
    expect(typeOfCentroid(14, 6, 10)).toBe("high-low");
    expect(typeOfCentroid(6, 14, 10)).toBe("low-high");
    expect(typeOfCentroid(15, 15, 10)).toBe("high-high");
    expect(typeOfCentroid(5, 5, 10)).toBe("low-low");
    expect(typeOfCentroid(10, 10, 10)).toBe("low-low");
  });
});

describe("학급 군집화", () => {
  const rows = makeDemoRows(25);

  it("가상 학급 점수는 척도 범위 안이다", () => {
    expect(rows).toHaveLength(25);
    expect(rows.every((r) => r.consume >= AXIS_MIN && r.consume <= AXIS_MAX && r.save >= AXIS_MIN && r.save <= AXIS_MAX)).toBe(true);
  });

  it("K=2·3·4 결과를 모두 만든다", () => {
    expect(computeClassClusters(rows, AXIS_MID).map((r) => r.k)).toEqual(CLUSTER_KS);
  });

  it("같은 응답이면 언제나 같은 결과 (새로고침해도 바뀌지 않는다)", () => {
    expect(computeClassClusters(rows, AXIS_MID)).toEqual(computeClassClusters([...rows], AXIS_MID));
  });

  it("모든 학생이 하나의 그룹에 속하고 빈 그룹이 없다", () => {
    for (const res of computeClassClusters(rows, AXIS_MID)) {
      expect(Object.keys(res.assignments)).toHaveLength(25);
      for (let g = 0; g < res.k; g++) expect(membersOf(res, g).length).toBeGreaterThan(0);
      expect(res.centroids).toHaveLength(res.k);
      expect(res.types).toHaveLength(res.k);
    }
  });

  it("그룹 번호는 소비 점수가 낮은 그룹부터 붙는다", () => {
    for (const res of computeClassClusters(rows, AXIS_MID)) {
      const consumes = res.centroids.map((c) => c[0]);
      expect(consumes).toEqual([...consumes].sort((a, b) => a - b));
    }
  });

  it("뚜렷한 4성향 학급은 K=4 에서 4유형이 하나씩 나온다", () => {
    const k4 = computeClassClusters(rows, AXIS_MID).find((r) => r.k === 4)!;
    expect(new Set(k4.types).size).toBe(4);
  });

  it("번호표는 번호 순으로 정렬된다", () => {
    const k2 = computeClassClusters(rows, AXIS_MID)[0];
    const members = membersOf(k2, 0);
    const nums = members.map((c) => Number(c.slice(1)));
    expect(nums).toEqual([...nums].sort((a, b) => a - b));
  });

  it("그룹 평균을 계산한다", () => {
    const k2 = computeClassClusters(rows, AXIS_MID)[0];
    const m = groupMeans(k2, rows, 0)!;
    expect(m.consume).toBeGreaterThanOrEqual(AXIS_MIN);
    expect(groupMeans(k2, rows, 9)).toBeNull();
  });

  it("학생이 K보다 적으면 그 K는 건너뛴다", () => {
    expect(computeClassClusters(rows.slice(0, 3), AXIS_MID).map((r) => r.k)).toEqual([2, 3]);
    expect(computeClassClusters([], AXIS_MID)).toEqual([]);
  });
});
