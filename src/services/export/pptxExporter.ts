import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";

import type { Presentation, Slide, SlideElement, SlideTransition } from "../../domain/presentation";

type PptxSlide = ReturnType<PptxGenJS["addSlide"]>;
import { parsePresentation } from "../../domain/presentation";
import { EXPORT_ERRORS } from "./errors";
import { sanitizePptxFilename } from "./filenameSanitizer";
import {
  isSafeImageDataUrl,
  resolveImageContent,
  type AssetResolver,
} from "./imageContent";
import {
  cssPxToPoints,
  firstFontFamily,
  injectSlideTransitionXml,
  LOGICAL_PIXELS_PER_INCH,
  mapSlideTransitionToPptx,
  pptxTransitionToXml,
  pxToInch,
  toPptxHexColor,
} from "./pptxTransitions";

export interface PptxExportSuccess {
  success: true;
  blob: Blob;
  filename: string;
}

export interface PptxExportFailure {
  success: false;
  error: string;
}

export type PptxExportResult = PptxExportSuccess | PptxExportFailure;

export interface PptxExportOptions {
  createDeck?: () => PptxGenJS;
  fetchPublicImage?: (url: string) => Promise<string | null>;
}

function isPublicImagePath(value: string): boolean {
  if (value.startsWith("asset://") || value.includes("://")) {
    return false;
  }

  return (
    value.startsWith("/") ||
    value.startsWith("./") ||
    value.startsWith("assets/") ||
    value.includes("/")
  );
}

async function defaultFetchPublicImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const blob = await response.blob();
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function resolvePptxImage(
  content: string | undefined,
  resolveAsset: AssetResolver,
  path: string,
  fetchPublicImage: (url: string) => Promise<string | null>,
): Promise<{ success: true; value: string } | { success: false; error: string }> {
  const resolved = await resolveImageContent(content, resolveAsset, path);
  if (resolved.success) {
    return resolved;
  }

  const trimmed = content?.trim() ?? "";
  if (trimmed && isPublicImagePath(trimmed) && !trimmed.startsWith("asset://")) {
    const fetched = await fetchPublicImage(trimmed);
    if (fetched && (isSafeImageDataUrl(fetched) || fetched.startsWith("data:image/"))) {
      return { success: true, value: fetched };
    }
  }

  return resolved;
}

function box(element: SlideElement) {
  return {
    x: pxToInch(element.x),
    y: pxToInch(element.y),
    w: pxToInch(element.width),
    h: pxToInch(element.height),
    rotate: element.rotation,
  };
}

function addText(slide: PptxSlide, element: SlideElement): void {
  const styles = element.styles;
  const fontSize =
    typeof styles.fontSize === "number" ? cssPxToPoints(styles.fontSize) : 16;
  const align = styles.textAlign;
  slide.addText(element.content ?? "", {
    ...box(element),
    fontSize,
    fontFace: firstFontFamily(styles.fontFamily),
    color: toPptxHexColor(typeof styles.color === "string" ? styles.color : "#0f172a", "0F172A"),
    bold: styles.fontWeight === "bold" || styles.fontWeight === 700,
    align:
      align === "center" || align === "right" || align === "justify" ? align : "left",
    valign: "top",
    wrap: true,
    margin: 0,
  });
}

function addShape(deck: PptxGenJS, slide: PptxSlide, element: SlideElement): void {
  const styles = element.styles;
  const fillRaw = typeof styles.fill === "string" ? styles.fill.trim() : "";
  const isTransparent = fillRaw === "transparent" || fillRaw === "none";
  const fill = isTransparent ? undefined : toPptxHexColor(fillRaw || "#6366f1", "6366F1");
  const lineColor =
    typeof styles.borderColor === "string"
      ? toPptxHexColor(styles.borderColor, fill ?? "E2E8F0")
      : undefined;
  const lineWidth = typeof styles.borderWidth === "number" ? styles.borderWidth / 2 : 0;
  const shapeKind = styles.shapeKind;
  const isEllipse = shapeKind === "ellipse" || shapeKind === "circle";
  const radiusPx = typeof styles.borderRadius === "number" ? styles.borderRadius : 0;
  const shape = isEllipse
    ? deck.ShapeType.ellipse
    : radiusPx > 0
      ? deck.ShapeType.roundRect
      : deck.ShapeType.rect;

  const options: Record<string, unknown> = {
    ...box(element),
    fill: fill ? { color: fill } : undefined,
    line:
      lineWidth > 0 && lineColor
        ? { color: lineColor, width: lineWidth }
        : undefined,
  };

  if (!isEllipse && radiusPx > 0) {
    const maxRadius = Math.min(pxToInch(Math.max(element.width, 1)), pxToInch(Math.max(element.height, 1))) / 2;
    options.rectRadius = Math.min(radiusPx / LOGICAL_PIXELS_PER_INCH, maxRadius);
  }

  slide.addShape(shape, options as Parameters<PptxSlide["addShape"]>[1]);
}

function addImage(slide: PptxSlide, element: SlideElement): void {
  const src = element.content ?? "";
  if (!src.startsWith("data:image/")) {
    return;
  }

  slide.addImage({
    ...box(element),
    data: src,
  });
}

function addElement(deck: PptxGenJS, slide: PptxSlide, element: SlideElement): void {
  if (element.type === "text") {
    addText(slide, element);
    return;
  }
  if (element.type === "image") {
    addImage(slide, element);
    return;
  }
  addShape(deck, slide, element);
}

function addResolvedSlide(deck: PptxGenJS, slideData: Slide): void {
  const slide = deck.addSlide();
  slide.background = { color: toPptxHexColor(slideData.background, "FFFFFF") };
  const ordered = [...slideData.elements].sort((left, right) => left.zIndex - right.zIndex);
  for (const element of ordered) {
    addElement(deck, slide, element);
  }
}

export async function applyPptxTransitions(
  blob: Blob,
  transitions: SlideTransition[],
): Promise<Blob> {
  const zip = await JSZip.loadAsync(blob);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((left, right) => {
      const leftIndex = Number(left.match(/slide(\d+)\.xml/)?.[1] ?? 0);
      const rightIndex = Number(right.match(/slide(\d+)\.xml/)?.[1] ?? 0);
      return leftIndex - rightIndex;
    });

  await Promise.all(
    slideFiles.map(async (name, index) => {
      const file = zip.file(name);
      if (!file) {
        return;
      }
      const xml = await file.async("string");
      const mapped = mapSlideTransitionToPptx(transitions[index] ?? "none");
      zip.file(name, injectSlideTransitionXml(xml, pptxTransitionToXml(mapped)));
    }),
  );

  const typesFile = zip.file("[Content_Types].xml");
  if (typesFile) {
    const typesXml = await typesFile.async("string");
    zip.file(
      "[Content_Types].xml",
      typesXml.replace(/<Override PartName="\/([^"]+)"[^>]*\/>/g, (override, part: string) =>
        zip.file(part) ? override : "",
      ),
    );
  }

  return zip.generateAsync({ type: "blob" });
}

async function resolvePresentationImages(
  presentation: Presentation,
  resolveAsset: AssetResolver,
  fetchPublicImage: (url: string) => Promise<string | null>,
): Promise<{ success: true; presentation: Presentation } | { success: false; error: string }> {
  const slides: Slide[] = [];

  for (const [slideIndex, slide] of presentation.slides.entries()) {
    const elements: SlideElement[] = [];
    for (const [elementIndex, element] of slide.elements.entries()) {
      if (element.type !== "image") {
        elements.push(element);
        continue;
      }

      const path = `slides[${slideIndex}].elements[${elementIndex}].content`;
      const content = await resolvePptxImage(element.content, resolveAsset, path, fetchPublicImage);
      if (!content.success) {
        return { success: false, error: content.error };
      }
      elements.push({ ...element, content: content.value });
    }
    slides.push({ ...slide, elements });
  }

  const resolved = { ...presentation, slides };
  const validated = parsePresentation(resolved);
  if (!validated.success) {
    const first = validated.errors[0]!;
    return { success: false, error: EXPORT_ERRORS.validation(first.path, first.message) };
  }

  return { success: true, presentation: validated.data };
}

export async function exportPresentationPptx(
  presentation: Presentation,
  resolveAsset: AssetResolver,
  options: PptxExportOptions = {},
): Promise<PptxExportResult> {
  const fetchPublicImage = options.fetchPublicImage ?? defaultFetchPublicImage;
  const resolved = await resolvePresentationImages(presentation, resolveAsset, fetchPublicImage);
  if (!resolved.success) {
    return resolved;
  }

  const deck = options.createDeck?.() ?? new PptxGenJS();
  deck.layout = "LAYOUT_WIDE";
  deck.title = resolved.presentation.title;
  deck.author = "Local Presentation Editor";

  for (const slide of resolved.presentation.slides) {
    addResolvedSlide(deck, slide);
  }

  const raw = await deck.write({ outputType: "blob" });
  if (!(raw instanceof Blob)) {
    return { success: false, error: "Не удалось сформировать файл PowerPoint" };
  }

  const blob = await applyPptxTransitions(
    raw,
    resolved.presentation.slides.map((slide) => slide.transition),
  );

  return {
    success: true,
    blob,
    filename: sanitizePptxFilename(resolved.presentation.title),
  };
}
