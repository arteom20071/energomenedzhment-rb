import { describe, expect, it } from "vitest";

import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  parsePresentation,
  presentationSchema,
  type Presentation,
} from "./presentation";

const validElement = {
  id: "el-1",
  type: "text" as const,
  x: 100,
  y: 200,
  width: 400,
  height: 80,
  rotation: 0,
  zIndex: 0,
  animation: "fade-up" as const,
  content: "Hello",
  styles: { fontSize: 24, color: "#111827" },
};

const validPresentation: Presentation = {
  id: "pres-1",
  title: "Test Deck",
  aspectRatio: "16:9",
  slides: [
    {
      id: "slide-1",
      background: "#ffffff",
      transition: "fade",
      elements: [validElement],
    },
  ],
};

describe("presentation constants", () => {
  it("exports canvas dimensions", () => {
    expect(CANVAS_WIDTH).toBe(1920);
    expect(CANVAS_HEIGHT).toBe(1080);
  });
});

describe("presentationSchema", () => {
  it("accepts a valid presentation payload", () => {
    const parsed = presentationSchema.parse(validPresentation);
    expect(parsed).toEqual(validPresentation);
  });

  it("round-trips through parsePresentation", () => {
    const result = parsePresentation(validPresentation);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validPresentation);
    }
  });
});

describe("parsePresentation invalid cases", () => {
  it("rejects unknown top-level keys", () => {
    const result = parsePresentation({ ...validPresentation, extra: true });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.message.includes("extra"))).toBe(true);
    }
  });

  it("rejects invalid aspect ratio", () => {
    const result = parsePresentation({ ...validPresentation, aspectRatio: "4:3" });
    expect(result.success).toBe(false);
  });

  it("rejects empty slides array", () => {
    const result = parsePresentation({ ...validPresentation, slides: [] });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate slide ids", () => {
    const slide = validPresentation.slides[0];
    const result = parsePresentation({
      ...validPresentation,
      slides: [slide, { ...slide }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.message.includes("duplicate"))).toBe(
        true,
      );
    }
  });

  it("rejects duplicate element ids across slides", () => {
    const result = parsePresentation({
      ...validPresentation,
      slides: [
        validPresentation.slides[0],
        {
          id: "slide-2",
          background: "#000000",
          transition: "none",
          elements: [{ ...validElement }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-finite numbers", () => {
    const result = parsePresentation({
      ...validPresentation,
      slides: [
        {
          ...validPresentation.slides[0],
          elements: [{ ...validElement, x: Number.NaN }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-positive dimensions", () => {
    const result = parsePresentation({
      ...validPresentation,
      slides: [
        {
          ...validPresentation.slides[0],
          elements: [{ ...validElement, width: 0 }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects unsupported element types", () => {
    const result = parsePresentation({
      ...validPresentation,
      slides: [
        {
          ...validPresentation.slides[0],
          elements: [{ ...validElement, type: "video" }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects unsupported transitions", () => {
    const result = parsePresentation({
      ...validPresentation,
      slides: [{ ...validPresentation.slides[0], transition: "flip" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects unsupported animations", () => {
    const result = parsePresentation({
      ...validPresentation,
      slides: [
        {
          ...validPresentation.slides[0],
          elements: [{ ...validElement, animation: "spin" }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects prototype pollution keys in styles", () => {
    const pollutedStyles = JSON.parse('{"__proto__":{"polluted":true},"color":"#111827"}');
    const result = parsePresentation({
      ...validPresentation,
      slides: [
        {
          ...validPresentation.slides[0],
          elements: [{ ...validElement, styles: pollutedStyles }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects function values in styles", () => {
    const result = parsePresentation({
      ...validPresentation,
      slides: [
        {
          ...validPresentation.slides[0],
          elements: [
            {
              ...validElement,
              styles: { onClick: () => undefined },
            },
          ],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("returns path-specific errors", () => {
    const result = parsePresentation({
      ...validPresentation,
      slides: [
        {
          ...validPresentation.slides[0],
          elements: [{ ...validElement, height: -10 }],
        },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0]?.path).toMatch(/height/);
    }
  });
});
