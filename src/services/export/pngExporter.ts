import type { Presentation } from "../../domain/presentation";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../domain/presentation";
import { EXPORT_ERRORS } from "./errors";

export interface PngCaptureOptions {
  width?: number;
  height?: number;
  filter?: (node: HTMLElement) => boolean;
  waitForResources?: (root: HTMLElement) => Promise<void>;
  toPng?: (node: HTMLElement, options: Record<string, unknown>) => Promise<string>;
  resourceTimeoutMs?: number;
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

export async function waitForFontsAndImages(
  root: HTMLElement,
  timeoutMs = 5000,
): Promise<void> {
  const tasks: Promise<unknown>[] = [];

  if (typeof document !== "undefined" && document.fonts?.ready) {
    tasks.push(document.fonts.ready);
  }

  const images = root.querySelectorAll("img");
  for (const img of images) {
    if (img.complete) {
      continue;
    }
    tasks.push(
      new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Image load failed"));
      }),
    );
  }

  await Promise.race([
    Promise.all(tasks),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Resource timeout")), timeoutMs);
    }),
  ]);
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

  try {
    await waitForResources(slideElement, resourceTimeoutMs);
  } catch {
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
    const dataUrl = await toPng(slideElement, {
      width,
      height,
      canvasWidth: width,
      canvasHeight: height,
      pixelRatio: 1,
      backgroundColor: "#ffffff",
      filter,
    });

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
