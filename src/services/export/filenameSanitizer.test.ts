import { describe, expect, it } from "vitest";

import { sanitizeExportBasename, sanitizeHtmlFilename, sanitizeJsonFilename } from "./filenameSanitizer";

describe("filenameSanitizer", () => {
  it("handles Windows reserved names", () => {
    expect(sanitizeExportBasename("CON")).toBe("CON_");
    expect(sanitizeExportBasename("com1")).toBe("com1_");
    expect(sanitizeExportBasename("LPT9")).toBe("LPT9_");
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

  it("builds json and html filenames", () => {
    expect(sanitizeJsonFilename("Deck")).toBe("Deck.presentation.json");
    expect(sanitizeHtmlFilename("Deck")).toBe("Deck.html");
  });
});
