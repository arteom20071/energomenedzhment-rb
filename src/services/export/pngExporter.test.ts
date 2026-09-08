import { describe, expect, it, vi } from "vitest";

import {
  captureSlidePng,
  createChromeFilter,
  createSlideFilename,
  waitForFontsAndImages,
} from "./pngExporter";

describe("createChromeFilter", () => {
  it("filters editor chrome nodes", () => {
    const filter = createChromeFilter();
    const chrome = document.createElement("div");
    chrome.dataset.editorChrome = "true";

    const content = document.createElement("div");
    expect(filter(chrome)).toBe(false);
    expect(filter(content)).toBe(true);
  });
});

describe("captureSlidePng", () => {
  it("returns png blob with explicit 1920x1080 via injected toPng", async () => {
    const slide = document.createElement("div");
    slide.innerHTML = "<p>Slide</p>";

    const toPng = vi.fn().mockResolvedValue("data:image/png;base64,abc");
    globalThis.fetch = vi.fn().mockResolvedValue({
      blob: () => Promise.resolve(new Blob(["png"], { type: "image/png" })),
    }) as typeof fetch;

    const result = await captureSlidePng(slide, 0, {
      toPng,
      waitForResources: async () => undefined,
      width: 1920,
      height: 1080,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.dataUrl).toBe("data:image/png;base64,abc");
      expect(result.blob.type).toBe("image/png");
    }

    expect(toPng).toHaveBeenCalledWith(
      slide,
      expect.objectContaining({ width: 1920, height: 1080 }),
    );
  });

  it("returns slide-specific error on capture failure", async () => {
    const slide = document.createElement("div");
    const toPng = vi.fn().mockRejectedValue(new Error("capture failed"));

    const result = await captureSlidePng(slide, 2, {
      toPng,
      waitForResources: async () => undefined,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("слайд 3");
      expect(result.error).toContain("capture failed");
    }
  });

  it("returns timeout error when resources fail to load", async () => {
    const slide = document.createElement("div");
    const result = await captureSlidePng(slide, 0, {
      waitForResources: async () => {
        throw new Error("timeout");
      },
      toPng: vi.fn(),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Превышено время ожидания");
    }
  });
});

describe("waitForFontsAndImages", () => {
  it("resolves when no pending images", async () => {
    const root = document.createElement("div");
    await expect(waitForFontsAndImages(root, 100)).resolves.toBeUndefined();
  });
});

describe("createSlideFilename", () => {
  it("builds numbered slide filename", () => {
    const filename = createSlideFilename(
      { id: "1", title: "Demo Deck", aspectRatio: "16:9", slides: [] },
      0,
    );
    expect(filename).toMatch(/Demo-Deck-slide-1\.png/);
  });
});
