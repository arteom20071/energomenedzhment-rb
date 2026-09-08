import { describe, expect, it } from "vitest";

import type { SlideElement } from "../../domain/presentation";
import {
  applyTransformPreview,
  buildTransformCommitUpdates,
  parseMoveableTransform,
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

describe("transforms", () => {
  it("parses moveable transform into logical geometry", () => {
    const parsed = parseMoveableTransform(
      { translate: [10, -5], rotate: 5, width: 240, height: 160 },
      2,
      { x: 100, y: 200, width: 120, height: 80, rotation: 15 },
    );
    expect(parsed).toEqual({
      x: 105,
      y: 197.5,
      width: 120,
      height: 80,
      rotation: 20,
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
});
