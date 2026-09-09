import type { Presentation } from "../../domain/presentation";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../domain/presentation";
import { CaptureError, EXPORT_ERRORS, ResourceWaitError } from "./errors";

export interface PngCaptureOptions {
  width?: number;
  height?: number;
  filter?: (node: HTMLElement) => boolean;
  waitForResources?: (root: HTMLElement, timeoutMs?: number) => Promise<void>;
  toPng?: (
    node: HTMLElement,
    options: Record<string, unknown>,
  ) => Promise<string>;
  resourceTimeoutMs?: number;
  captureTimeoutMs?: number;
  captureSignal?: AbortSignal;
  fetchRequestInit?: RequestInit;
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

export interface CaptureAbortScope {
  controller: AbortController;
  signal: AbortSignal;
}

const CHROME_SELECTORS = [
  "[data-editor-chrome]",
  "[data-selection-handle]",
  "[data-moveable-control]",
  ".moveable-control-box",
  ".selecto-selection",
];

export function createCaptureAbortScope(callerSignal?: AbortSignal): CaptureAbortScope {
  const controller = new AbortController();

  if (callerSignal) {
    if (callerSignal.aborted) {
      controller.abort(callerSignal.reason);
    } else {
      callerSignal.addEventListener(
        "abort",
        () => {
          controller.abort(callerSignal.reason);
        },
        { once: true },
      );
    }
  }

  return { controller, signal: controller.signal };
}

export function buildHtmlToImageCaptureOptions(
  params: {
    width: number;
    height: number;
    filter: (node: HTMLElement) => boolean;
    signal: AbortSignal;
    fetchRequestInit?: RequestInit;
  },
): Record<string, unknown> {
  return {
    width: params.width,
    height: params.height,
    canvasWidth: params.width,
    canvasHeight: params.height,
    pixelRatio: 1,
    backgroundColor: "#ffffff",
    filter: params.filter,
    fetchRequestInit: {
      ...params.fetchRequestInit,
      signal: params.signal,
    },
  };
}

export function createDefaultToPngCapture(): (
  node: HTMLElement,
  options: Record<string, unknown>,
) => Promise<string> {
  return async (node, captureOptions) => {
    const { toPng: htmlToPng } = await import("html-to-image");
    return htmlToPng(node, captureOptions);
  };
}

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
      promise: Promise.reject(new ResourceWaitError("Image decode failed", "image-decode")),
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
        reject(new ResourceWaitError("Image decode failed", "image-decode"));
      }
    };

    onError = () => {
      if (settled) {
        return;
      }
      settled = true;
      reject(new ResourceWaitError("Image load failed", "image-load"));
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
      tasks.push(
        document.fonts.ready.catch((error: unknown) => {
          const detail = error instanceof Error ? error.message : String(error);
          throw new ResourceWaitError(detail, "font");
        }),
      );
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
        timeoutId = setTimeout(
          () => reject(new ResourceWaitError("Resource timeout", "timeout")),
          timeoutMs,
        );
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

function mapResourceError(slideIndex: number, error: unknown): PngCaptureFailure {
  if (error instanceof ResourceWaitError) {
    switch (error.kind) {
      case "font":
        return { success: false, error: EXPORT_ERRORS.fontLoad(slideIndex, error.message) };
      case "image-decode":
        return { success: false, error: EXPORT_ERRORS.imageDecode(slideIndex, error.message) };
      case "image-load":
        return { success: false, error: EXPORT_ERRORS.imageLoad(slideIndex, error.message) };
      case "timeout":
        return { success: false, error: EXPORT_ERRORS.resourceTimeout(slideIndex) };
      default:
        return { success: false, error: EXPORT_ERRORS.resourceTimeout(slideIndex) };
    }
  }

  const detail = error instanceof Error ? error.message : String(error);
  if (detail.includes("decode")) {
    return { success: false, error: EXPORT_ERRORS.imageDecode(slideIndex, detail) };
  }
  if (detail.includes("load failed")) {
    return { success: false, error: EXPORT_ERRORS.imageLoad(slideIndex, detail) };
  }
  return { success: false, error: EXPORT_ERRORS.resourceTimeout(slideIndex) };
}

async function withCaptureTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  abortScope: CaptureAbortScope,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let timedOut = false;

  const observed = promise.catch((error: unknown) => {
    if (timedOut) {
      return Promise.reject(error);
    }
    throw error;
  });

  observed.catch(() => undefined);

  try {
    return await Promise.race([
      observed,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          timedOut = true;
          abortScope.controller.abort();
          reject(new CaptureError("Capture timeout", "timeout"));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function mapCaptureError(slideIndex: number, error: unknown): PngCaptureFailure {
  if (error instanceof CaptureError) {
    if (error.kind === "timeout") {
      return { success: false, error: EXPORT_ERRORS.captureTimeout(slideIndex) };
    }
    return { success: false, error: EXPORT_ERRORS.capture(slideIndex, error.message) };
  }

  const detail = error instanceof Error ? error.message : String(error);
  if (detail.includes("Capture timeout")) {
    return { success: false, error: EXPORT_ERRORS.captureTimeout(slideIndex) };
  }
  return { success: false, error: EXPORT_ERRORS.capture(slideIndex, detail) };
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
  const abortScope = createCaptureAbortScope(options.captureSignal);

  try {
    await waitForResources(slideElement, resourceTimeoutMs);
  } catch (error) {
    return mapResourceError(slideIndex, error);
  }

  const toPng = options.toPng ?? createDefaultToPngCapture();
  const captureOptions = buildHtmlToImageCaptureOptions({
    width,
    height,
    filter,
    signal: abortScope.signal,
    fetchRequestInit: options.fetchRequestInit,
  });

  const capturePromise = toPng(slideElement, captureOptions);
  capturePromise.catch(() => undefined);

  try {
    const dataUrl = await withCaptureTimeout(
      capturePromise,
      captureTimeoutMs,
      abortScope,
    );

    const blob = await dataUrlToBlob(dataUrl);
    return { success: true, dataUrl, blob };
  } catch (error) {
    return mapCaptureError(slideIndex, error);
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
