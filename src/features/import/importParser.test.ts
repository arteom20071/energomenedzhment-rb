import { describe, expect, it } from "vitest";

import { createPresentation } from "../../domain/factories";
import { parseImportJson, formatImportErrors } from "./importParser";
import { MAX_IMPORT_BYTES } from "../../services/export/errors";

describe("parseImportJson", () => {
  it("accepts valid presentation JSON atomically", () => {
    const presentation = createPresentation("Imported");
    const result = parseImportJson(JSON.stringify(presentation));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Imported");
      expect(result.summary.slideCount).toBe(1);
      expect(result.summary.elementCount).toBe(0);
    }
  });

  it("rejects empty input with Russian error", () => {
    const result = parseImportJson("   ");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.atomic).toBe(true);
      expect(result.errors[0]?.message).toContain("пустым");
    }
  });

  it("rejects invalid JSON syntax", () => {
    const result = parseImportJson("{ invalid json");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0]?.message).toContain("Синтаксическая ошибка");
    }
  });

  it("rejects schema violations with path-specific errors", () => {
    const result = parseImportJson(JSON.stringify({ title: "No id" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.path.length > 0)).toBe(true);
      expect(formatImportErrors(result.errors)).toContain(":");
    }
  });

  it("rejects oversized input", () => {
    const huge = `{"id":"x","title":"t","aspectRatio":"16:9","slides":[]}${" ".repeat(MAX_IMPORT_BYTES)}`;
    const result = parseImportJson(huge);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0]?.message).toContain("5 МБ");
    }
  });

  it("does not mutate external store objects", () => {
    const presentation = createPresentation("Immutable");
    const clone = structuredClone(presentation);
    const json = JSON.stringify(presentation);

    parseImportJson(json);

    expect(presentation).toEqual(clone);
  });
});
