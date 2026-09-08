import { describe, expect, it } from "vitest";

import { createPresentation, createImageElement, createTextElement } from "../../domain/factories";
import {
  createDataUrlResolver,
  exportPresentationJson,
  sanitizeFilename,
} from "./jsonExporter";
import { toAssetReference } from "../persistence/assetRepository";

const SAMPLE_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("exportPresentationJson", () => {
  it("resolves asset references to validated data URLs", async () => {
    const presentation = createPresentation("Export Test");
    const slide = presentation.slides[0]!;
    const image = createImageElement(slide.elements, {
      content: toAssetReference("img-1"),
    });
    slide.elements.push(image);

    const result = await exportPresentationJson(
      presentation,
      createDataUrlResolver({ "img-1": SAMPLE_DATA_URL }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      const parsed = JSON.parse(result.json);
      expect(parsed.slides[0].elements[0].content).toBe(SAMPLE_DATA_URL);
      expect(result.filename).toBe("Export-Test.presentation.json");
    }
  });

  it("rejects unresolved asset references", async () => {
    const presentation = createPresentation("Unresolved");
    const slide = presentation.slides[0]!;
    slide.elements.push(
      createImageElement(slide.elements, { content: toAssetReference("missing") }),
    );

    const result = await exportPresentationJson(presentation, createDataUrlResolver({}));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("не удалось разрешить");
    }
  });

  it("rejects blob and http image references", async () => {
    const presentation = createPresentation("External");
    const slide = presentation.slides[0]!;
    slide.elements.push(createImageElement(slide.elements, { content: "blob:abc" }));

    const blobResult = await exportPresentationJson(presentation, createDataUrlResolver({}));
    expect(blobResult.success).toBe(false);

    slide.elements[0] = createImageElement(slide.elements, { content: "https://example.com/a.png" });
    const httpResult = await exportPresentationJson(presentation, createDataUrlResolver({}));
    expect(httpResult.success).toBe(false);
  });

  it("rejects malformed data URLs", async () => {
    const presentation = createPresentation("Bad Data");
    const slide = presentation.slides[0]!;
    slide.elements.push(
      createImageElement(slide.elements, { content: "data:text/html;base64,abc" }),
    );

    const result = await exportPresentationJson(presentation, createDataUrlResolver({}));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("data URL");
    }
  });

  it("produces deterministic pretty JSON", async () => {
    const presentation = createPresentation("Deterministic");
    const resolver = createDataUrlResolver({});

    const first = await exportPresentationJson(presentation, resolver);
    const second = await exportPresentationJson(presentation, resolver);

    expect(first.success && second.success).toBe(true);
    if (first.success && second.success) {
      expect(first.json).toBe(second.json);
      expect(first.json).toContain("\n");
    }
  });

  it("blocks export when validation fails after resolution", async () => {
    const presentation = createPresentation("Bad");
    const broken = structuredClone(presentation);
    const duplicate = createTextElement([], { id: "dup-id" });
    broken.slides[0]!.elements = [duplicate, { ...duplicate }];

    const result = await exportPresentationJson(broken, createDataUrlResolver({}));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Экспорт отменён");
    }
  });
});

describe("sanitizeFilename", () => {
  it("removes unsafe characters and handles Windows reserved names", () => {
    expect(sanitizeFilename('My<>Presentation:"')).toBe("MyPresentation.presentation.json");
    expect(sanitizeFilename("CON")).toBe("CON_.presentation.json");
    expect(sanitizeFilename("   ")).toBe("presentation.presentation.json");
    expect(sanitizeFilename("name...")).toBe("name.presentation.json");
  });
});
