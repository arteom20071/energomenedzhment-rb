import { describe, expect, it } from "vitest";

import type { SlideElement } from "../../domain/presentation";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../domain/presentation";
import { computeSnap, type SnapGuide } from "./snapping";

function element(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
): SlideElement {
  return {
    id,
    type: "shape",
    x,
    y,
    width,
    height,
    rotation: 0,
    zIndex: 0,
    styles: {},
  };
}

describe("computeSnap", () => {
  it("snaps moving box to slide center and edges", () => {
    const others: SlideElement[] = [];
    const result = computeSnap(
      { x: 908, y: 492, width: 100, height: 100 },
      others,
      { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
      8,
    );

    expect(result.x).toBe(960 - 50);
    expect(result.y).toBe(540 - 50);
    expect(result.guides.some((g: SnapGuide) => g.orientation === "vertical" && g.position === 960)).toBe(
      true,
    );
    expect(result.guides.some((g: SnapGuide) => g.orientation === "horizontal" && g.position === 540)).toBe(
      true,
    );
  });

  it("snaps to other element edges and centers", () => {
    const others = [element("a", 400, 300, 200, 100)];
    const result = computeSnap(
      { x: 598, y: 298, width: 120, height: 80 },
      others,
      { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
      8,
      [],
    );

    expect(result.x).toBe(600);
    expect(result.y).toBe(300);
    expect(result.guides.length).toBeGreaterThan(0);
  });

  it("ignores selected elements when snapping to peers", () => {
    const others = [
      element("a", 100, 100, 50, 50),
      element("b", 500, 500, 50, 50),
    ];
    const result = computeSnap(
      { x: 498, y: 400, width: 50, height: 50 },
      others,
      { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
      8,
      ["b"],
    );

    expect(result.x).toBe(498);
    expect(result.y).toBe(400);
    expect(result.guides.every((g) => g.position !== 500)).toBe(true);
  });

  it("returns unchanged position when outside threshold", () => {
    const others = [element("a", 400, 300, 200, 100)];
    const bounds = { x: 700, y: 700, width: 100, height: 100 };
    const result = computeSnap(bounds, others, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT }, 8);

    expect(result.x).toBe(700);
    expect(result.y).toBe(700);
    expect(result.guides).toEqual([]);
  });
});
