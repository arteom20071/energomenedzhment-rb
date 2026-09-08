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

describe("waitForFontsAndImages", () => {
  it("resolves when no pending images", async () => {
    const root = document.createElement("div");
    await expect(waitForFontsAndImages(root, 100)).resolves.toBeUndefined();
  });

  it("rejects failed decode for complete image with zero width", async () => {
    const root = document.createElement("div");
    const img = document.createElement("img");
    Object.defineProperty(img, "complete", { value: true });
    Object.defineProperty(img, "naturalWidth", { value: 0 });
    root.appendChild(img);

    await expect(waitForFontsAndImages(root, 100)).rejects.toThrow("decode");
  });

  it("uses addEventListener without overwriting handlers", async () => {
    const root = document.createElement("div");
    const img = document.createElement("img");
    Object.defineProperty(img, "complete", { value: false });
    const existing = vi.fn();
    img.addEventListener("load", existing);
    root.appendChild(img);

    const promise = waitForFontsAndImages(root, 100);
    Object.defineProperty(img, "naturalWidth", { value: 10 });
    img.dispatchEvent(new Event("load"));
    await expect(promise).resolves.toBeUndefined();
    expect(existing).toHaveBeenCalled();
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

  it("returns decode failure error separately from timeout", async () => {
    const slide = document.createElement("div");
    const result = await captureSlidePng(slide, 1, {
      waitForResources: async () => {
        throw new Error("Image decode failed");
      },
      toPng: vi.fn(),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("decode");
      expect(result.error).not.toContain("Превышено время");
    }
  });

  it("returns timeout error when resources fail to load in time", async () => {
    const slide = document.createElement("div");
    const result = await captureSlidePng(slide, 0, {
      waitForResources: async () => {
        throw new Error("Resource timeout");
      },
      toPng: vi.fn(),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Превышено время ожидания");
    }
  });

  it("times out capture itself", async () => {
    const slide = document.createElement("div");
    const toPng = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          setTimeout(() => resolve("data:image/png;base64,x"), 50);
        }),
    );

    const result = await captureSlidePng(slide, 0, {
      toPng,
      waitForResources: async () => undefined,
      captureTimeoutMs: 5,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Capture timeout");
    }
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
