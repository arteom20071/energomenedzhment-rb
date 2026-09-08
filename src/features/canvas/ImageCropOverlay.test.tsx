import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createImageElement } from "../../domain/factories";
import { ImageCropOverlay } from "./ImageCropOverlay";

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
        onPreviewChange={onPreviewChange}
        onCommit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const overlay = screen.getByTestId("crop-overlay-img-rot");
    const rect = {
      left: 400,
      top: 300,
      width: 100,
      height: 200,
      right: 500,
      bottom: 500,
      x: 400,
      y: 300,
      toJSON: () => ({}),
    } as DOMRect;
    overlay.getBoundingClientRect = () => rect;

    const handle = screen.getByTestId("crop-focal-handle");
    fireEvent.pointerDown(handle, { clientX: 450, clientY: 350, pointerId: 1 });
    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 450, clientY: 450, pointerId: 1 }),
    );
    window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }));

    const latest = onPreviewChange.mock.calls.at(-1)?.[0];
    expect(latest?.objectPosition).toMatch(/75%/);
  });
});
