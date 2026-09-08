import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createImageElement } from "../../domain/factories";
import { ImageCropOverlay } from "./ImageCropOverlay";

function mockOverlayRect(
  overlay: HTMLElement,
  screenWidth: number,
  screenHeight: number,
  origin: { left: number; top: number } = { left: 400, top: 300 },
) {
  overlay.getBoundingClientRect = () =>
    ({
      left: origin.left,
      top: origin.top,
      width: screenWidth,
      height: screenHeight,
      right: origin.left + screenWidth,
      bottom: origin.top + screenHeight,
      x: origin.left,
      y: origin.top,
      toJSON: () => ({}),
    }) as DOMRect;
}

describe("ImageCropOverlay", () => {
  it("maps rotated pointer drags through local image space", () => {
    const onPreviewChange = vi.fn();
    const element = createImageElement([], {
      id: "img-rot",
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      rotation: 90,
      content: "https://example.com/rotated.jpg",
    });

    render(
      <ImageCropOverlay
        element={element}
        scale={1}
        viewportScale={1}
        onPreviewChange={onPreviewChange}
        onCommit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const overlay = screen.getByTestId("crop-overlay-img-rot");
    mockOverlayRect(overlay, 100, 200);

    const handle = screen.getByTestId("crop-focal-handle");
    fireEvent.pointerDown(handle, { clientX: 450, clientY: 350, pointerId: 1 });
    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 450, clientY: 450, pointerId: 1 }),
    );
    window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }));

    const latest = onPreviewChange.mock.calls.at(-1)?.[0];
    expect(latest?.objectPosition).toMatch(/75%/);
  });

  it.each([
    { viewportScale: 0.5, expectPercent: 100, offsetRatio: 0.5 },
    { viewportScale: 2, expectPercent: 75, offsetRatio: 0.25 },
  ])(
    "maps pointer to $expectPercent% at viewport scale $viewportScale",
    ({ viewportScale, expectPercent, offsetRatio }) => {
      const onPreviewChange = vi.fn();
      const element = createImageElement([], {
        id: `img-${viewportScale}`,
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        rotation: 0,
        content: "https://example.com/zoom.jpg",
      });
      const screenWidth = element.width * viewportScale;
      const screenHeight = element.height * viewportScale;

      render(
        <ImageCropOverlay
          element={element}
          scale={1}
          viewportScale={viewportScale}
          onPreviewChange={onPreviewChange}
          onCommit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const overlay = screen.getByTestId(`crop-overlay-img-${viewportScale}`);
      mockOverlayRect(overlay, screenWidth, screenHeight);

      const centerX = 400 + screenWidth / 2;
      const centerY = 300 + screenHeight / 2;
      const handle = screen.getByTestId("crop-focal-handle");
      fireEvent.pointerDown(handle, { clientX: centerX, clientY: centerY, pointerId: 1 });
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          clientX: centerX + screenWidth * offsetRatio,
          clientY: centerY,
          pointerId: 1,
        }),
      );
      window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }));

      const latest = onPreviewChange.mock.calls.at(-1)?.[0];
      expect(latest?.objectPosition).toMatch(new RegExp(`${expectPercent}(\\.0)?%`));
    },
  );

  it("maps rotated right edge to 100% at viewport scale 0.5", () => {
    const onPreviewChange = vi.fn();
    const viewportScale = 0.5;
    const element = createImageElement([], {
      id: "img-rot-zoom",
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      rotation: 90,
      content: "https://example.com/rotated-zoom.jpg",
    });
    const screenWidth = element.width * viewportScale;
    const screenHeight = element.height * viewportScale;

    render(
      <ImageCropOverlay
        element={element}
        scale={1}
        viewportScale={viewportScale}
        onPreviewChange={onPreviewChange}
        onCommit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const overlay = screen.getByTestId("crop-overlay-img-rot-zoom");
    mockOverlayRect(overlay, screenHeight, screenWidth);

    const centerX = 400 + screenHeight / 2;
    const centerY = 300 + screenWidth / 2;
    const handle = screen.getByTestId("crop-focal-handle");
    fireEvent.pointerDown(handle, { clientX: centerX, clientY: centerY, pointerId: 1 });
    window.dispatchEvent(
      new PointerEvent("pointermove", {
        clientX: centerX,
        clientY: centerY + screenWidth / 2,
        pointerId: 1,
      }),
    );
    window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }));

    const latest = onPreviewChange.mock.calls.at(-1)?.[0];
    expect(latest?.objectPosition).toMatch(/100(\.0)?%/);
  });
});
