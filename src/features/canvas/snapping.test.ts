import { describe, expect, it } from "vitest";

import type { SlideElement } from "../../domain/presentation";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../domain/presentation";
import {
  computeResizeSnap,
  computeSnap,
  SNAP_THRESHOLD_SCREEN_PX,
  toLogicalSnapThreshold,
  type SnapGuide,
} from "./snapping";

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

describe("snap threshold", () => {
  it("converts screen-pixel tolerance to logical units by effective scale", () => {
    expect(SNAP_THRESHOLD_SCREEN_PX).toBe(8);
    expect(toLogicalSnapThreshold(1)).toBe(8);
    expect(toLogicalSnapThreshold(0.5)).toBe(16);
    expect(toLogicalSnapThreshold(2)).toBe(4);
  });

  it("keeps visual tolerance constant across zoom levels", () => {
    const bounds = { x: 906, y: 490, width: 100, height: 100 };
    const canvas = { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };

    const atHalf = computeSnap(bounds, [], canvas, toLogicalSnapThreshold(0.5));
    const atTwo = computeSnap(bounds, [], canvas, toLogicalSnapThreshold(2));

    expect(atHalf.x).toBe(910);
    expect(atTwo.x).toBe(910);
  });
});

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

describe("computeResizeSnap", () => {
  const canvas = { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
  const peer = element("peer", 400, 300, 200, 100);

  it("snaps east edge without moving x when resizing from the east handle", () => {
    const result = computeResizeSnap(
      { x: 100, y: 200, width: 298, height: 80 },
      "e",
      [peer],
      canvas,
      8,
    );

    expect(result.x).toBe(100);
    expect(result.width).toBe(300);
  });

  it("snaps west edge by adjusting x and width together", () => {
    const peerAtLeft = element("peer", 100, 300, 200, 100);
    const result = computeResizeSnap(
      { x: 102, y: 200, width: 198, height: 80 },
      "w",
      [peerAtLeft],
      canvas,
      8,
    );

    expect(result.x).toBe(100);
    expect(result.width).toBe(200);
  });

  it("snaps south edge without moving y when resizing from the south handle", () => {
    const result = computeResizeSnap(
      { x: 400, y: 300, width: 200, height: 98 },
      "s",
      [peer],
      canvas,
      8,
    );

    expect(result.y).toBe(300);
    expect(result.height).toBe(100);
  });

  it("snaps north edge by adjusting y and height together", () => {
    const result = computeResizeSnap(
      { x: 400, y: 302, width: 200, height: 98 },
      "n",
      [peer],
      canvas,
      8,
    );

    expect(result.y).toBe(300);
    expect(result.height).toBe(100);
  });

  it("snaps southeast corner on both axes", () => {
    const result = computeResizeSnap(
      { x: 400, y: 300, width: 198, height: 98 },
      "se",
      [peer],
      canvas,
      8,
    );

    expect(result.x).toBe(400);
    expect(result.y).toBe(300);
    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
  });

  it("uses zoom-adjusted threshold for resize snapping", () => {
    const bounds = { x: 100, y: 200, width: 298, height: 80 };
    const atHalf = computeResizeSnap(bounds, "e", [peer], canvas, toLogicalSnapThreshold(0.5));
    const atTwo = computeResizeSnap(bounds, "e", [peer], canvas, toLogicalSnapThreshold(2));

    expect(atHalf.width).toBe(300);
    expect(atTwo.width).toBe(300);
  });
});
