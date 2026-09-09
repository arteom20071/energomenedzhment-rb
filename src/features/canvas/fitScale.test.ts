import { describe, expect, it } from "vitest";

import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../domain/presentation";
import { computeFitScale, resolveFitScale } from "./fitScale";

describe("computeFitScale", () => {
  it("fits a 16:9 slide into the available workspace", () => {
    expect(computeFitScale(960, 540)).toBe(0.5);
    expect(computeFitScale(1920, 1080)).toBe(1);
  });

  it("letterboxes when the host aspect ratio differs", () => {
    expect(computeFitScale(800, 800)).toBeCloseTo(800 / CANVAS_WIDTH);
    expect(computeFitScale(2000, 500)).toBeCloseTo(500 / CANVAS_HEIGHT);
  });

  it("subtracts padding from both axes", () => {
    expect(computeFitScale(992, 572, CANVAS_WIDTH, CANVAS_HEIGHT, 16)).toBe(0.5);
  });

  it("returns 0 when the host has no usable size", () => {
    expect(computeFitScale(0, 540)).toBe(0);
    expect(computeFitScale(960, 0)).toBe(0);
    expect(computeFitScale(20, 20, CANVAS_WIDTH, CANVAS_HEIGHT, 16)).toBe(0);
  });
});

describe("resolveFitScale", () => {
  it("keeps a positive fit scale and falls back when empty", () => {
    expect(resolveFitScale(0.4)).toBe(0.4);
    expect(resolveFitScale(0)).toBe(1);
    expect(resolveFitScale(-1, 0.25)).toBe(0.25);
  });
});
