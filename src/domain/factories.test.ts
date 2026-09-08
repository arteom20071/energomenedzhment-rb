import { describe, expect, it } from "vitest";

import {
  collectPresentationIds,
  createImageElement,
  createPresentation,
  createShapeElement,
  createSlide,
  createTextElement,
  generateId,
  generateUniqueId,
  resetIdGenerator,
  setIdGenerator,
} from "./factories";
import type { SlideElement } from "./presentation";
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

  it("createSlide id differs from supplied element ids and usedIds", () => {
    setIdGenerator(() => "dup");
    const usedIds = new Set<string>(["dup", "el-a"]);
    const slide = createSlide(
      [
        {
          id: "el-a",
          type: "text",
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          rotation: 0,
          zIndex: 0,
          styles: {},
        },
      ],
      usedIds,
    );
    expect(slide.id).not.toBe("el-a");
    expect(slide.id).not.toBe("dup");
    expect(usedIds.has(slide.id)).toBe(true);
    resetIdGenerator();
  });

  it("createSlide checks fallback candidates against usedIds", () => {
    setIdGenerator(() => "dup");
    const usedIds = new Set<string>(["dup", "dup-1", "dup-2"]);
    const slide = createSlide([], usedIds);
    expect(slide.id).toBe("dup-3");
    resetIdGenerator();
  });

  it("constant generator produces unique ids across presentation slides and elements", () => {
    setIdGenerator(() => "same");
    const presentation = createPresentation("All Same");
    const allIds = new Set<string>([presentation.id]);
    for (const slide of presentation.slides) {
      expect(allIds.has(slide.id)).toBe(false);
      allIds.add(slide.id);
      for (const element of slide.elements) {
        expect(allIds.has(element.id)).toBe(false);
        allIds.add(element.id);
      }
    }
    resetIdGenerator();
  });
});

const baseElement = (id: string, type: SlideElement["type"] = "text"): SlideElement => ({
  id,
  type,
  x: 0,
  y: 0,
  width: 10,
  height: 10,
  rotation: 0,
  zIndex: 0,
  styles: {},
});

describe("generateUniqueId", () => {
  it("returns unused id when more than 1000 suffixed candidates are occupied", () => {
    setIdGenerator(() => "dup");
    const usedIds = new Set<string>(["dup"]);
    for (let attempt = 1; attempt <= 1000; attempt += 1) {
      usedIds.add(`dup-${attempt}`);
    }

    const id = generateUniqueId(usedIds);

    expect(usedIds.has(id)).toBe(false);
    expect(id).toBe("dup-1001");
    resetIdGenerator();
  });

  it("never returns unchecked fallback ids when suffix space is exhausted up to 1000", () => {
    setIdGenerator(() => "dup");
    const usedIds = new Set<string>(["dup"]);
    for (let attempt = 1; attempt <= 1000; attempt += 1) {
      usedIds.add(`dup-${attempt}`);
    }

    const id = generateUniqueId(usedIds);

    expect(id).not.toMatch(/fallback/);
    resetIdGenerator();
  });
});

describe("element factory id collision safety", () => {
  it("createTextElement avoids existing element ids when generator repeats", () => {
    setIdGenerator(() => "same-id");
    const existing = [baseElement("same-id")];
    const element = createTextElement(existing);
    expect(element.id).not.toBe("same-id");
    expect(existing.some((item) => item.id === element.id)).toBe(false);
    resetIdGenerator();
  });

  it("createShapeElement avoids existing element ids when generator repeats", () => {
    setIdGenerator(() => "same-id");
    const existing = [baseElement("same-id", "shape")];
    const element = createShapeElement(existing);
    expect(element.id).not.toBe("same-id");
    expect(existing.some((item) => item.id === element.id)).toBe(false);
    resetIdGenerator();
  });

  it("createImageElement avoids existing element ids when generator repeats", () => {
    setIdGenerator(() => "same-id");
    const existing = [baseElement("same-id", "image")];
    const element = createImageElement(existing);
    expect(element.id).not.toBe("same-id");
    expect(existing.some((item) => item.id === element.id)).toBe(false);
    resetIdGenerator();
  });

  it("replaces colliding explicit id overrides with a unique id", () => {
    setIdGenerator(() => "generated");
    const existing = [baseElement("occupied")];
    const element = createTextElement(existing, { id: "occupied" });
    expect(element.id).not.toBe("occupied");
    expect(existing.some((item) => item.id === element.id)).toBe(false);
    resetIdGenerator();
  });

  it("creates unique ids across a full presentation graph when generator repeats", () => {
    setIdGenerator(() => "dup");
    const presentation = createPresentation("Graph Collision");
    const slide = presentation.slides[0]!;
    const occupiedIds = collectPresentationIds(presentation);

    const text = createTextElement(slide.elements, {}, occupiedIds);
    expect(occupiedIds.has(text.id)).toBe(false);
    occupiedIds.add(text.id);
    slide.elements.push(text);

    const shape = createShapeElement(slide.elements, {}, occupiedIds);
    expect(occupiedIds.has(shape.id)).toBe(false);
    occupiedIds.add(shape.id);
    slide.elements.push(shape);

    const image = createImageElement(slide.elements, {}, occupiedIds);
    expect(occupiedIds.has(image.id)).toBe(false);
    slide.elements.push(image);

    expect(parsePresentation({ ...presentation, slides: [{ ...slide }] }).success).toBe(true);
    resetIdGenerator();
  });
});
