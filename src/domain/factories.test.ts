import { describe, expect, it } from "vitest";

import {
  createImageElement,
  createPresentation,
  createShapeElement,
  createSlide,
  createTextElement,
  generateId,
  resetIdGenerator,
  setIdGenerator,
} from "./factories";
import { parsePresentation } from "./presentation";

describe("generateId", () => {
  it("uses injected generator in tests", () => {
    setIdGenerator(() => "fixed-id");
    expect(generateId()).toBe("fixed-id");
    resetIdGenerator();
  });

  it("produces unique ids by default", () => {
    resetIdGenerator();
    const a = generateId();
    const b = generateId();
    expect(a).not.toBe(b);
  });
});

describe("factories", () => {
  it("creates a presentation with one slide", () => {
    setIdGenerator(() => "id-1");
    const presentation = createPresentation("My Deck");
    expect(presentation.title).toBe("My Deck");
    expect(presentation.aspectRatio).toBe("16:9");
    expect(presentation.slides).toHaveLength(1);
    resetIdGenerator();
  });

  it("creates slides with defaults", () => {
    setIdGenerator(() => "slide-id");
    const slide = createSlide();
    expect(slide.transition).toBe("fade");
    expect(slide.elements).toEqual([]);
    resetIdGenerator();
  });

  it("assigns increasing zIndex from existing elements", () => {
    setIdGenerator(() => "el-id");
    const slide = createSlide([
      { id: "a", type: "text", x: 0, y: 0, width: 10, height: 10, rotation: 0, zIndex: 2, styles: {} },
      { id: "b", type: "shape", x: 0, y: 0, width: 10, height: 10, rotation: 0, zIndex: 5, styles: {} },
    ]);
    const text = createTextElement(slide.elements);
    const shape = createShapeElement(slide.elements);
    const image = createImageElement(slide.elements);
    expect(text.zIndex).toBe(6);
    expect(shape.zIndex).toBe(6);
    expect(image.zIndex).toBe(6);
    resetIdGenerator();
  });

  it("guarantees presentation and initial slide ids differ when generator collides", () => {
    setIdGenerator(() => "same-id");
    const presentation = createPresentation("Collision Deck");
    expect(presentation.id).not.toBe(presentation.slides[0]!.id);
    expect(parsePresentation(presentation).success).toBe(true);
    resetIdGenerator();
  });

  it("guarantees unique ids across the full created object graph on collision", () => {
    setIdGenerator(() => "dup");
    const presentation = createPresentation("Graph");
    const ids = new Set<string>([presentation.id]);
    for (const slide of presentation.slides) {
      expect(ids.has(slide.id)).toBe(false);
      ids.add(slide.id);
      for (const element of slide.elements) {
        expect(ids.has(element.id)).toBe(false);
        ids.add(element.id);
      }
    }
    resetIdGenerator();
  });

  it("assigns deterministic fallback ids when generator keeps colliding", () => {
    setIdGenerator(() => "dup");
    const presentation = createPresentation("Fallback");
    expect(presentation.id).toBe("dup");
    expect(presentation.slides[0]!.id).toBe("dup-1");
    resetIdGenerator();
  });
});
