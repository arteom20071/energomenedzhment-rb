import { describe, expect, it } from "vitest";

import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../domain/presentation";
import {
  computeEffectiveScale,
  logicalToViewport,
  viewportDeltaToLogical,
  viewportToLogical,
} from "./coordinates";

describe("coordinates", () => {
  it("computes effective scale from zoom and optional fitScale", () => {
    expect(computeEffectiveScale(1)).toBe(1);
    expect(computeEffectiveScale(1.5)).toBe(1.5);
    expect(computeEffectiveScale(1, 0.5)).toBe(0.5);
    expect(computeEffectiveScale(2, 0.25)).toBe(0.5);
  });

  it("converts viewport deltas to logical coordinates", () => {
    expect(viewportDeltaToLogical(20, 1)).toBe(20);
    expect(viewportDeltaToLogical(20, 2)).toBe(10);
    expect(viewportDeltaToLogical(-10, 0.5)).toBe(-20);
  });

  it("converts logical points to viewport and back", () => {
    const scale = 0.75;
    const logical = { x: 100, y: 200 };
    const viewport = logicalToViewport(logical, scale);
    expect(viewport).toEqual({ x: 75, y: 150 });
    expect(viewportToLogical(viewport, scale)).toEqual(logical);
  });

  it("exports canvas dimensions from domain", () => {
    expect(CANVAS_WIDTH).toBe(1920);
    expect(CANVAS_HEIGHT).toBe(1080);
  });
});
