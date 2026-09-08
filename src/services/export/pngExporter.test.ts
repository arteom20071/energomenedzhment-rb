import { describe, expect, it, vi } from "vitest";

import {
  buildHtmlToImageCaptureOptions,
  captureSlidePng,
  createCaptureAbortScope,
  createChromeFilter,
  createSlideFilename,
  waitForFontsAndImages,
} from "./pngExporter";
import { ResourceWaitError } from "./errors";

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

    await expect(waitForFontsAndImages(root, 100)).rejects.toMatchObject({
      kind: "image-decode",
    });
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

  it("classifies font readiness rejection separately", async () => {
    const root = document.createElement("div");
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: Promise.reject(new Error("Font blocked")) },
    });

    await expect(waitForFontsAndImages(root, 100)).rejects.toMatchObject({
      kind: "font",
    });
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
  });

  it("returns image decode failure separately from timeout", async () => {
    const slide = document.createElement("div");
    const result = await captureSlidePng(slide, 1, {
      waitForResources: async () => {
        throw new ResourceWaitError("Image decode failed", "image-decode");
      },
      toPng: vi.fn(),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("декодировать");
      expect(result.error).not.toContain("Превышено время ожидания загрузки");
    }
  });

  it("returns resource timeout separately from decode errors", async () => {
    const slide = document.createElement("div");
    const result = await captureSlidePng(slide, 0, {
      waitForResources: async () => {
        throw new ResourceWaitError("Resource timeout", "timeout");
      },
      toPng: vi.fn(),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Превышено время ожидания загрузки");
    }
  });

  it("returns capture timeout and absorbs late rejection", async () => {
    const slide = document.createElement("div");
    let rejectLate: ((reason?: unknown) => void) | undefined;
    const toPng = vi.fn(
      () =>
        new Promise<string>((_, reject) => {
          rejectLate = reject;
          setTimeout(() => reject(new Error("late failure")), 30);
        }),
    );

    const rejectionObserver = vi.fn();
    const result = await captureSlidePng(slide, 0, {
      toPng: () => {
        const promise = toPng();
        promise.catch(rejectionObserver);
        return promise;
      },
      waitForResources: async () => undefined,
      captureTimeoutMs: 5,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("ожидания экспорта");
    }

    rejectLate?.(new Error("late failure"));
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(rejectionObserver).toHaveBeenCalled();
  });

  it("passes abort signal via fetchRequestInit without top-level signal", async () => {
    const slide = document.createElement("div");
    let capturedOptions: Record<string, unknown> | undefined;
    const toPng = vi.fn(async (_node, options) => {
      capturedOptions = options;
      return "data:image/png;base64,abc";
    });
    globalThis.fetch = vi.fn().mockResolvedValue({
      blob: () => Promise.resolve(new Blob(["png"], { type: "image/png" })),
    }) as typeof fetch;

    await captureSlidePng(slide, 0, {
      toPng,
      waitForResources: async () => undefined,
      fetchRequestInit: { credentials: "same-origin" },
    });

    expect(capturedOptions).toBeDefined();
    expect(capturedOptions).not.toHaveProperty("signal");
    const fetchInit = capturedOptions!.fetchRequestInit as RequestInit;
    expect(fetchInit.credentials).toBe("same-origin");
    expect(fetchInit.signal).toBeInstanceOf(AbortSignal);
    expect(fetchInit.signal!.aborted).toBe(false);
  });

  it("aborts fetchRequestInit signal on capture timeout", async () => {
    const slide = document.createElement("div");
    let capturedSignal: AbortSignal | undefined;
    const toPng = vi.fn(
      (_node, options) =>
        new Promise<string>((resolve) => {
          capturedSignal = (options.fetchRequestInit as RequestInit).signal ?? undefined;
          setTimeout(() => resolve("data:image/png;base64,x"), 50);
        }),
    );

    await captureSlidePng(slide, 0, {
      toPng,
      waitForResources: async () => undefined,
      captureTimeoutMs: 5,
    });

    expect(capturedSignal).toBeDefined();
    expect(capturedSignal!.aborted).toBe(true);
  });

  it("propagates caller abort through fetchRequestInit signal", async () => {
    const slide = document.createElement("div");
    const caller = new AbortController();
    let capturedSignal: AbortSignal | undefined;
    const toPng = vi.fn(
      (_node, options) =>
        new Promise<string>((_resolve, reject) => {
          capturedSignal = (options.fetchRequestInit as RequestInit).signal ?? undefined;
          if (capturedSignal!.aborted) {
            reject(new Error("aborted"));
            return;
          }
          capturedSignal!.addEventListener(
            "abort",
            () => {
              reject(new Error("aborted"));
            },
            { once: true },
          );
        }),
    );

    const capturePromise = captureSlidePng(slide, 0, {
      toPng,
      waitForResources: async () => undefined,
      captureTimeoutMs: 100,
      captureSignal: caller.signal,
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    caller.abort();
    const result = await capturePromise;

    expect(capturedSignal).toBeDefined();
    expect(capturedSignal!.aborted).toBe(true);
    expect(result.success).toBe(false);
  });
});

describe("buildHtmlToImageCaptureOptions", () => {
  it("merges fetchRequestInit and sets signal", () => {
    const scope = createCaptureAbortScope();
    const options = buildHtmlToImageCaptureOptions({
      width: 1920,
      height: 1080,
      filter: () => true,
      signal: scope.signal,
      fetchRequestInit: { cache: "no-cache" },
    });

    expect(options).not.toHaveProperty("signal");
    expect(options.fetchRequestInit).toEqual({
      cache: "no-cache",
      signal: scope.signal,
    });
  });
});

describe("createCaptureAbortScope", () => {
  it("links caller abort to effective controller", () => {
    const caller = new AbortController();
    const scope = createCaptureAbortScope(caller.signal);

    expect(scope.signal.aborted).toBe(false);
    caller.abort();
    expect(scope.signal.aborted).toBe(true);
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
