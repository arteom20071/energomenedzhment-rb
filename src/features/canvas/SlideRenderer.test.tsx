import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createTextElement, createShapeElement, createImageElement } from "../../domain/factories";
import type { Slide } from "../../domain/presentation";
import { SlideRenderer } from "./SlideRenderer";

function buildSlide(): Slide {
  const elements = [
    createTextElement([], {
      id: "text-1",
      x: 100,
      y: 120,
      width: 400,
      height: 80,
      content: "Hello slide",
      zIndex: 1,
    }),
    createShapeElement([], {
      id: "shape-1",
      x: 600,
      y: 200,
      width: 200,
      height: 200,
      zIndex: 0,
    }),
    createImageElement([], {
      id: "image-1",
      x: 50,
      y: 400,
      width: 300,
      height: 200,
      content: "https://example.com/image.png",
      zIndex: 2,
      styles: { objectFit: "cover", alt: "Example" },
    }),
  ];

  return {
    id: "slide-1",
    background: "#f8fafc",
    transition: "fade",
    elements,
  };
}

describe("SlideRenderer", () => {
  it("renders slide at logical 1920x1080 with clipped overflow", () => {
    const { container } = render(
      <SlideRenderer slide={buildSlide()} interactive scale={0.5} />,
    );

    const canvas = container.querySelector('[data-testid="slide-canvas"]');
    expect(canvas).toHaveStyle({ width: "960px", height: "540px" });
    expect(canvas).toHaveStyle({ overflow: "hidden" });
    expect(canvas).toHaveStyle({ background: "#f8fafc" });
  });

  it("renders text, shape, and image elements with absolute positioning", () => {
    render(<SlideRenderer slide={buildSlide()} interactive={false} />);

    const text = screen.getByTestId("element-text-1");
    expect(text).toHaveStyle({ left: "100px", top: "120px", width: "400px", height: "80px" });
    expect(text).toHaveTextContent("Hello slide");

    const shape = screen.getByTestId("element-shape-1");
    expect(shape).toHaveStyle({ left: "600px", top: "200px" });

    const frame = screen.getByTestId("element-image-1");
    expect(frame).toHaveStyle({ left: "50px", top: "400px", overflow: "hidden" });

    const image = screen.getByTestId("element-image-image-1");
    expect(image.tagName).toBe("IMG");
    expect(image).toHaveAttribute("src", "https://example.com/image.png");
    expect(image).toHaveAttribute("alt", "Example");
  });

  it("keeps image crop scale on inner img without overwriting frame rotation", () => {
    const slide = buildSlide();
    slide.elements[2]!.rotation = 45;
    render(
      <SlideRenderer
        slide={slide}
        interactive
        cropPreview={{ objectPosition: "20% 80%", cropScale: 1.5 }}
        cropElementId="image-1"
      />,
    );

    const frame = screen.getByTestId("element-image-1");
    expect(frame).toHaveStyle({ transform: "rotate(45deg)" });

    const image = screen.getByTestId("element-image-image-1");
    expect(image).toHaveStyle({
      objectPosition: "20% 80%",
      transform: "scale(1.5)",
    });
  });

  it("exposes selected elements as focusable with aria state", () => {
    render(
      <SlideRenderer slide={buildSlide()} interactive selectedIds={["text-1"]} />,
    );

    const text = screen.getByTestId("element-text-1");
    expect(text).toHaveAttribute("tabindex", "0");
    expect(text).toHaveAttribute("aria-selected", "true");
  });

  it("does not render editor chrome when interactive is false", () => {
    const { container } = render(
      <SlideRenderer slide={buildSlide()} interactive={false} selectedIds={["text-1"]} />,
    );
    expect(container.querySelector('[data-testid="selection-frame"]')).toBeNull();
    expect(container.querySelector('[data-testid="snap-guides"]')).toBeNull();
  });

  it("sanitizes disallowed style keys from rendered output", () => {
    const slide = buildSlide();
    slide.elements[0]!.styles = {
      fontSize: 24,
      color: "#111827",
      onclick: "evil()",
      __proto__: { polluted: true },
    };

    render(<SlideRenderer slide={slide} interactive={false} />);
    const text = screen.getByTestId("element-text-1");
    expect(text.getAttribute("onclick")).toBeNull();
    expect(text).toHaveStyle({ fontSize: "24px", color: "rgb(17, 24, 39)" });
  });

  it("wraps text and eases layout except while a transform preview is active", () => {
    const slide = buildSlide();
    const { rerender } = render(
      <SlideRenderer
        slide={slide}
        interactive
        previewElements={new Map([["text-1", { width: 220, height: 60 }]])}
      />,
    );

    const transforming = screen.getByTestId("element-text-1");
    expect(transforming).toHaveAttribute("data-transforming", "true");
    expect(transforming).toHaveStyle({
      whiteSpace: "pre-wrap",
      overflow: "hidden",
      transition: "none",
      width: "220px",
    });

    rerender(<SlideRenderer slide={slide} interactive={false} />);
    const idle = screen.getByTestId("element-text-1");
    expect(idle).not.toHaveAttribute("data-transforming");
    expect(idle).toHaveStyle({
      transition:
        "left 180ms ease, top 180ms ease, width 180ms ease, height 180ms ease, transform 180ms ease",
    });
  });
});
