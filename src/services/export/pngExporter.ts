import type { Presentation } from "../../domain/presentation";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../domain/presentation";
import { EXPORT_ERRORS } from "./errors";

export interface PngCaptureOptions {
  width?: number;
  height?: number;
  filter?: (node: HTMLElement) => boolean;
  waitForResources?: (root: HTMLElement, timeoutMs?: number) => Promise<void>;
  toPng?: (node: HTMLElement, options: Record<string, unknown>) => Promise<string>;
  resourceTimeoutMs?: number;
  captureTimeoutMs?: number;
}

export interface PngCaptureResult {
  success: true;
  dataUrl: string;
  blob: Blob;
}

export interface PngCaptureFailure {
  success: false;
  error: string;
}

const CHROME_SELECTORS = [
  "[data-editor-chrome]",
  "[data-selection-handle]",
  "[data-moveable-control]",
  ".moveable-control-box",
  ".selecto-selection",
];

export function createChromeFilter(): (node: HTMLElement) => boolean {
  return (node: HTMLElement) => {
    if (node.dataset?.editorChrome === "true") {
      return false;
    }
    if (node.dataset?.selectionHandle !== undefined) {
      return false;
    }
    if (node.classList?.contains("moveable-control-box")) {
      return false;
    }
    if (node.classList?.contains("selecto-selection")) {
      return false;
    }
    for (const selector of CHROME_SELECTORS) {
      if (node.matches?.(selector)) {
        return false;
      }
    }
    return true;
  };
}

interface ImageWaitCleanup {
  cleanup: () => void;
}

function waitForImage(img: HTMLImageElement): { promise: Promise<void>; cleanup: () => void } {
  if (img.complete) {
    if (img.naturalWidth > 0) {
      return { promise: Promise.resolve(), cleanup: () => undefined };
    }
    return {
      promise: Promise.reject(new Error("Image decode failed")),
      cleanup: () => undefined,
    };
  }

  let settled = false;
  let onLoad: (() => void) | null = null;
  let onError: (() => void) | null = null;

  const promise = new Promise<void>((resolve, reject) => {
    onLoad = () => {
      if (settled) {
        return;
      }
      settled = true;
      if (img.naturalWidth > 0) {
        resolve();
      } else {
        reject(new Error("Image decode failed"));
      }
    };

    onError = () => {
      if (settled) {
        return;
      }
      settled = true;
      reject(new Error("Image load failed"));
    };

    img.addEventListener("load", onLoad);
    img.addEventListener("error", onError);
  });

  return {
    promise,
    cleanup: () => {
      if (onLoad) {
        img.removeEventListener("load", onLoad);
      }
      if (onError) {
        img.removeEventListener("error", onError);
      }
    },
  };
}

export async function waitForFontsAndImages(
  root: HTMLElement,
  timeoutMs = 5000,
): Promise<void> {
  const cleanups: ImageWaitCleanup[] = [];
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    const tasks: Promise<unknown>[] = [];

    if (typeof document !== "undefined" && document.fonts?.ready) {
      tasks.push(document.fonts.ready);
    }

    const images = root.querySelectorAll("img");
    for (const node of images) {
      const img = node as HTMLImageElement;
      const waiter = waitForImage(img);
      cleanups.push({ cleanup: waiter.cleanup });
      tasks.push(waiter.promise);
    }

    await Promise.race([
      Promise.all(tasks),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Resource timeout")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    for (const item of cleanups) {
      item.cleanup();
    }
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function captureSlidePng(
  slideElement: HTMLElement,
  slideIndex: number,
  options: PngCaptureOptions = {},
): Promise<PngCaptureResult | PngCaptureFailure> {
  const width = options.width ?? CANVAS_WIDTH;
  const height = options.height ?? CANVAS_HEIGHT;
  const filter = options.filter ?? createChromeFilter();
  const waitForResources = options.waitForResources ?? waitForFontsAndImages;
  const resourceTimeoutMs = options.resourceTimeoutMs ?? 5000;
  const captureTimeoutMs = options.captureTimeoutMs ?? 10000;

  try {
    await waitForResources(slideElement, resourceTimeoutMs);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    if (detail.includes("decode") || detail.includes("load failed")) {
      return {
        success: false,
        error: EXPORT_ERRORS.capture(slideIndex, detail),
      };
    }
    return {
      success: false,
      error: EXPORT_ERRORS.timeout(slideIndex),
    };
  }

  const toPng =
    options.toPng ??
    (async (node, captureOptions) => {
      const { toPng: htmlToPng } = await import("html-to-image");
      return htmlToPng(node, captureOptions);
    });

  try {
    const dataUrl = await withTimeout(
      toPng(slideElement, {
        width,
        height,
        canvasWidth: width,
        canvasHeight: height,
        pixelRatio: 1,
        backgroundColor: "#ffffff",
        filter,
      }),
      captureTimeoutMs,
      "Capture timeout",
    );

    const blob = await dataUrlToBlob(dataUrl);
    return { success: true, dataUrl, blob };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: EXPORT_ERRORS.capture(slideIndex, detail),
    };
  }
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

export function createSlideFilename(
  presentation: Presentation,
  slideIndex: number,
): string {
  const title = presentation.title.trim().replace(/[^\w-]+/g, "-").slice(0, 40) || "slide";
  return `${title}-slide-${slideIndex + 1}.png`;
}
