import { describe, expect, it } from "vitest";

import { resetIdGenerator, setIdGenerator } from "../../domain/factories";
import { CANVAS_HEIGHT, CANVAS_WIDTH, slideSchema } from "../../domain/presentation";
import { applyTemplate, SLIDE_TEMPLATES } from "./applyTemplate";

describe("applyTemplate", () => {
  it("defines four templates", () => {
    expect(SLIDE_TEMPLATES).toHaveLength(4);
    expect(SLIDE_TEMPLATES.map((t) => t.id)).toEqual([
      "title",
      "two-columns",
      "metrics-grid",
      "timeline",
    ]);
  });

  it("returns a new slide without mutating occupied ids set", () => {
    setIdGenerator(() => "tpl-id");
    const occupied = new Set(["existing-id"]);
    const before = new Set(occupied);

    const slide = applyTemplate("title", occupied);

    expect(occupied).toEqual(before);
    expect(slide.id).toBeTruthy();
    expect(slide.elements.length).toBeGreaterThan(0);
    resetIdGenerator();
  });

  it.each([
    "title",
    "two-columns",
    "metrics-grid",
    "timeline",
  ] as const)("produces valid slide for %s template", (templateId) => {
    setIdGenerator(() => `id-${templateId}`);
    const slide = applyTemplate(templateId);

    const parsed = slideSchema.safeParse(slide);
    expect(parsed.success).toBe(true);

    const ids = slide.elements.map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);

    const zIndexes = slide.elements.map((element) => element.zIndex);
    expect(new Set(zIndexes).size).toBe(zIndexes.length);

    for (const element of slide.elements) {
      expect(element.x).toBeGreaterThanOrEqual(0);
      expect(element.y).toBeGreaterThanOrEqual(0);
      expect(element.x + element.width).toBeLessThanOrEqual(CANVAS_WIDTH);
      expect(element.y + element.height).toBeLessThanOrEqual(CANVAS_HEIGHT);
    }

    resetIdGenerator();
  });

  it("uses Russian default content in title template", () => {
    setIdGenerator(() => "ru-title");
    const slide = applyTemplate("title");
    const texts = slide.elements
      .filter((element) => element.type === "text")
      .map((element) => element.content ?? "");

    expect(texts.some((text) => /[А-Яа-яЁё]/.test(text))).toBe(true);
    resetIdGenerator();
  });

  it("applies indigo accent styling in templates", () => {
    setIdGenerator(() => "style-id");
    const slide = applyTemplate("metrics-grid");
    const styled = slide.elements.some((element) =>
      JSON.stringify(element.styles).includes("#6366f1"),
    );
    expect(styled).toBe(true);
    resetIdGenerator();
  });
});
