import { describe, expect, it } from "vitest";
import {
  computerJudgment, evaluateFromGroups, initFromGroups, nextAction, runToEnd, step, summarize, type Point,
} from "./index";

const points: Point[] = [
  { id: "a1", x: 300, y: 1 }, { id: "a2", x: 500, y: 1.5 }, { id: "a3", x: 400, y: 1 },
  { id: "b1", x: 1800, y: 4.5 }, { id: "b2", x: 2000, y: 5 }, { id: "b3", x: 1900, y: 4 },
];
const perfect = [0, 0, 0, 1, 1, 1];

describe("학생이 묶은 그룹에서 시작", () => {
  it("묶은 그룹 그대로 배정되고 아직 중심점은 없다", () => {
    const s = initFromGroups(points, perfect);
    expect(s.phase).toBe("grouped");
    expect(s.k).toBe(2);
    expect(s.assignments).toEqual(perfect);
    expect(s.centroids).toHaveLength(0);
    expect(nextAction(s)).toBe("centroids");
  });

  it("첫 단계는 각 그룹의 한가운데(평균)에 중심점을 만든다", () => {
    const s = step(initFromGroups(points, perfect));
    expect(s.phase).toBe("centroids");
    expect(s.centroids[0][0]).toBeCloseTo(400);
    expect(s.centroids[0][1]).toBeCloseTo(1.1667, 3);
    expect(s.centroids[1][0]).toBeCloseTo(1900);
    // 배정은 학생이 묶은 그대로
    expect(s.assignments).toEqual(perfect);
  });

  it("잘 묶었으면 바로 수렴하고 그룹이 바뀌지 않는다", () => {
    const end = runToEnd(initFromGroups(points, perfect));
    expect(end.phase).toBe("converged");
    expect(end.assignments).toEqual(perfect);
    expect(end.iteration).toBe(1);
  });

  it("엉성하게 묶으면 컴퓨터가 다듬어 준다", () => {
    const messy = [0, 0, 1, 1, 1, 0]; // a3 와 b3 가 서로 바뀜
    const end = runToEnd(initFromGroups(points, messy));
    expect(end.assignments).toEqual([0, 0, 0, 1, 1, 1]);
    const sums = summarize(end);
    expect(sums.map((s) => s.count)).toEqual([3, 3]);
  });

  it("step 으로 끝까지 가도 runToEnd 와 같다", () => {
    let s = initFromGroups(points, [0, 1, 0, 1, 0, 1]);
    while (s.phase !== "converged") s = step(s);
    expect(s).toEqual(runToEnd(initFromGroups(points, [0, 1, 0, 1, 0, 1])));
  });

  it("묶지 않은 점이나 빈 그룹이 있으면 오류", () => {
    expect(() => initFromGroups(points, [0, 0, 0, 1, 1, -1])).toThrow("묶지 않은");
    expect(() => initFromGroups(points, [0, 0, 0, 2, 2, 2])).toThrow("비어 있는");
    expect(() => initFromGroups(points, [0, 1])).toThrow();
  });
});

describe("컴퓨터 판정", () => {
  it("뚜렷한 2덩어리는 알맞다", () => {
    expect(computerJudgment(evaluateFromGroups(points, perfect))).toBe("good");
  });

  it("전부 한 그룹이면 넓다", () => {
    const wide: Point[] = [
      { id: "1", x: 0, y: 1 }, { id: "2", x: 1000, y: 1 },
      { id: "3", x: 0, y: 5 }, { id: "4", x: 1000, y: 5 },
    ];
    // 두 그룹으로 묶되 한 그룹에 서로 먼 점이 섞이게
    expect(computerJudgment(evaluateFromGroups(wide, [0, 0, 0, 1]))).toBe("wide");
  });

  it("혼자인 그룹이 많으면 잘게 나눈 것", () => {
    const four: Point[] = [
      { id: "1", x: 0, y: 1 }, { id: "2", x: 1000, y: 1 },
      { id: "3", x: 0, y: 5 }, { id: "4", x: 1000, y: 5 },
    ];
    expect(computerJudgment(evaluateFromGroups(four, [0, 1, 2, 3]))).toBe("split");
  });
});
