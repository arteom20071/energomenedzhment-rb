import { describe, expect, it } from "vitest";

import {
  sanitizeExportBasename,
  sanitizeHtmlFilename,
  sanitizeJsonFilename,
  sanitizePptxFilename,
} from "./filenameSanitizer";

describe("filenameSanitizer", () => {
  it("handles Windows reserved names", () => {
    expect(sanitizeExportBasename("CON")).toBe("CON_");
    expect(sanitizeExportBasename("com1")).toBe("com1_");
    expect(sanitizeExportBasename("LPT9")).toBe("LPT9_");
  });

  it("prefixes device stems even with extensions and suffixes", () => {
    expect(sanitizeExportBasename("CON.txt")).toBe("CON.txt_");
    expect(sanitizeExportBasename("LPT1.foo")).toBe("LPT1.foo_");
    expect(sanitizeJsonFilename("CON.txt")).toBe("CON.txt_.presentation.json");
    expect(sanitizeHtmlFilename("LPT1.foo")).toBe("LPT1.foo_.html");
  });

  it("strips trailing dots and spaces", () => {
    expect(sanitizeExportBasename("name...")).toBe("name");
    expect(sanitizeExportBasename("title   ")).toBe("title");
  });

  it("truncates by code points without splitting surrogate pairs", () => {
    const mixed = "A📊B📊C";
    const truncated = sanitizeExportBasename(mixed, 3);
    expect([...truncated].length).toBeLessThanOrEqual(3);
    expect(truncated).toBe("A📊B");
  });

  it("builds json, html, and pptx filenames", () => {
    expect(sanitizeJsonFilename("Deck")).toBe("Deck.presentation.json");
    expect(sanitizeHtmlFilename("Deck")).toBe("Deck.html");
    expect(sanitizePptxFilename("Deck")).toBe("Deck.pptx");
  });
});
