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

  it.each([0.5, 2])(
    "maps unrotated right edge to 100%% at viewport scale %s",
    (viewportScale) => {
      const logicalWidth = 200;
      const logicalHeight = 100;
      const screenWidth = logicalWidth * viewportScale;
      const screenHeight = logicalHeight * viewportScale;
      const centerX = 500;
      const centerY = 400;

      const rightEdge = pointerToLocalFocalPercent({
        clientX: centerX + screenWidth / 2,
        clientY: centerY,
        centerX,
        centerY,
        width: screenWidth,
        height: screenHeight,
        rotationDegrees: 0,
      });

      expect(rightEdge.x).toBeCloseTo(100, 1);
      expect(rightEdge.y).toBeCloseTo(50, 1);
    },
  );

  it.each([0.5, 2])(
    "maps rotated local right edge to 100%% at viewport scale %s",
    (viewportScale) => {
      const logicalWidth = 200;
      const logicalHeight = 100;
      const screenWidth = logicalWidth * viewportScale;
      const screenHeight = logicalHeight * viewportScale;
      const centerX = 500;
      const centerY = 400;

      const rotatedRightEdge = pointerToLocalFocalPercent({
        clientX: centerX,
        clientY: centerY + screenWidth / 2,
        centerX,
        centerY,
        width: screenWidth,
        height: screenHeight,
        rotationDegrees: 90,
      });

      expect(rotatedRightEdge.x).toBeCloseTo(100, 1);
    },
  );
});
