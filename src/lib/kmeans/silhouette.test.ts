import { describe, expect, it } from "vitest";
import { runBest } from "./best";
import { silhouette } from "./silhouette";
import data from "../../data/gyeonggi-traffic.json";

const points = data.cities.map((c, i) => ({ id: `t${i}`, x: c.transit, y: c.seoul }));

describe("silhouette", () => {
  it("멀리 떨어진 두 덩어리는 1에 가깝다", () => {
    const p = [0, 1, 100, 101].map((x, i) => ({ id: `${i}`, x, y: 0 }));
    expect(silhouette(p, [0, 0, 1, 1]).mean).toBeGreaterThan(0.95);
  });
  it("혼자인 그룹의 점은 0", () => {
    const p = [0, 1, 2].map((x, i) => ({ id: `${i}`, x, y: 0 }));
    expect(silhouette(p, [0, 0, 1]).perPoint[2]).toBe(0);
  });
  it("경기도 12개 도시: K=3이 K=2·4보다 높다", () => {
    const s = [2, 3, 4].map((k) => silhouette(points, runBest(points, k).assignments).mean);
    expect(s[1]).toBeGreaterThan(s[0]);
    expect(s[1]).toBeGreaterThan(s[2]);
  });
});
