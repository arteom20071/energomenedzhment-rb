import { describe, expect, it } from "vitest";

import { pointerToLocalFocalPercent } from "./cropUtils";

describe("pointerToLocalFocalPercent", () => {
  it("maps pointer through inverse rotation for rotated frames", () => {
    const width = 200;
    const height = 100;
    const centerX = 500;
    const centerY = 400;

    const unrotated = pointerToLocalFocalPercent({
      clientX: centerX + 50,
      clientY: centerY,
      centerX,
      centerY,
      width,
      height,
      rotationDegrees: 0,
    });
    expect(unrotated).toEqual({ x: 75, y: 50 });

    const rotated = pointerToLocalFocalPercent({
      clientX: centerX,
      clientY: centerY + 50,
      centerX,
      centerY,
      width,
      height,
      rotationDegrees: 90,
    });

    expect(rotated.x).toBeCloseTo(75, 1);
    expect(rotated.y).toBeCloseTo(50, 1);
  });
});
