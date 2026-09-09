import { describe, expect, it } from "vitest";

import type { SlideElement } from "../../domain/presentation";
import {
  applyTransformPreview,
  buildTransformCommitUpdates,
  directionFromMoveable,
  parseMoveableDrag,
  parseMoveableResize,
  parseMoveableRotate,
  normalizeMoveableEvent,
} from "./transforms";

function element(overrides: Partial<SlideElement> = {}): SlideElement {
  return {
    id: "el-1",
    type: "shape",
    x: 100,
    y: 200,
    width: 120,
    height: 80,
    rotation: 15,
    zIndex: 0,
    styles: {},
    ...overrides,
  };
}

const base = { x: 100, y: 200, width: 120, height: 80, rotation: 15 };

describe("transforms", () => {
  describe("parseMoveableDrag", () => {
    it.each([
      { scale: 0.5, translate: [10, -6], expected: { x: 120, y: 188 } },
      { scale: 1, translate: [20, 10], expected: { x: 120, y: 210 } },
      { scale: 2, translate: [10, -5], expected: { x: 105, y: 197.5 } },
    ])("converts viewport drag deltas at zoom $scale", ({ scale, translate, expected }) => {
      const parsed = parseMoveableDrag({ translate }, scale, base);
      expect(parsed).toEqual(expected);
    });
  });

  describe("parseMoveableResize", () => {
    it.each([
      { scale: 0.5, width: 240, height: 160 },
      { scale: 1, width: 200, height: 100 },
      { scale: 2, width: 180, height: 90 },
    ])("keeps moveable width/height as logical CSS units at zoom $scale", ({ scale, width, height }) => {
      const parsed = parseMoveableResize(
        { translate: [0, 0], width, height },
        scale,
        base,
      );
      expect(parsed.width).toBe(width);
      expect(parsed.height).toBe(height);
      expect(parsed.x).toBe(base.x);
      expect(parsed.y).toBe(base.y);
    });

    it("converts resize drag translate but not dimensions", () => {
      const parsed = parseMoveableResize(
        { translate: [20, 0], width: 140, height: 80 },
        2,
        base,
      );
      expect(parsed).toEqual({ x: 110, y: 200, width: 140, height: 80 });
    });
  });

  describe("parseMoveableRotate", () => {
    it.each([
      { scale: 0.5, rotate: 25, translate: [4, 0], expectedRotation: 25, expectedX: 108 },
      { scale: 1, rotate: 25, translate: [0, 0], expectedRotation: 25, expectedX: 100 },
      { scale: 2, rotate: 20, translate: [10, 0], expectedRotation: 20, expectedX: 105 },
    ])(
      "uses moveable rotate as absolute angle at zoom $scale",
      ({ scale, rotate, translate, expectedRotation, expectedX }) => {
        const parsed = parseMoveableRotate({ rotate, translate }, scale, base);
        expect(parsed.rotation).toBe(expectedRotation);
        expect(parsed.x).toBe(expectedX);
        expect(parsed.y).toBe(200);
      },
    );

    it("does not add reported rotate onto an already rotated element", () => {
      const rotatedBase = { ...base, rotation: 30 };
      const parsed = parseMoveableRotate({ rotate: 45, translate: [0, 0] }, 1, rotatedBase);
      expect(parsed.rotation).toBe(45);
    });

    it("supports dist as gesture delta when rotate is absent", () => {
      const rotatedBase = { ...base, rotation: 30 };
      const parsed = parseMoveableRotate({ dist: 15, translate: [0, 0] }, 1, rotatedBase);
      expect(parsed.rotation).toBe(45);
    });
  });

  it("normalizes moveable drag translate from nested drag payload", () => {
    expect(
      normalizeMoveableEvent({
        drag: { translate: [12, -4] },
        width: 180,
        height: 90,
        rotate: 40,
      }),
    ).toEqual({
      translate: [12, -4],
      width: 180,
      height: 90,
      rotate: 40,
    });
  });

  it("applies transient preview without mutating source elements", () => {
    const source = element();
    const preview = applyTransformPreview(source, { x: 150, y: 250, rotation: 30 });
    expect(preview.x).toBe(150);
    expect(source.x).toBe(100);
  });

  it("builds commit updates for multiple selected elements", () => {
    const a = element({ id: "a", x: 10, y: 20 });
    const b = element({ id: "b", x: 30, y: 40 });
    const previews = new Map([
      ["a", { x: 11, y: 21, width: 120, height: 80, rotation: 15 }],
      ["b", { x: 35, y: 45, width: 120, height: 80, rotation: 15 }],
    ]);

    const updates = buildTransformCommitUpdates([a, b], previews);
    expect(updates).toEqual([
      { id: "a", changes: { x: 11, y: 21 } },
      { id: "b", changes: { x: 35, y: 45 } },
    ]);
  });

  it("omits unchanged fields from commit updates", () => {
    const a = element({ id: "a" });
    const previews = new Map([
      ["a", { x: 100, y: 200, width: 120, height: 80, rotation: 15 }],
    ]);
    expect(buildTransformCommitUpdates([a], previews)).toEqual([]);
  });

  it("maps moveable direction arrays to resize handles", () => {
    expect(directionFromMoveable([1, 0])).toBe("e");
    expect(directionFromMoveable([-1, 0])).toBe("w");
    expect(directionFromMoveable([0, 1])).toBe("s");
    expect(directionFromMoveable([0, -1])).toBe("n");
    expect(directionFromMoveable([1, 1])).toBe("se");
  });
});
