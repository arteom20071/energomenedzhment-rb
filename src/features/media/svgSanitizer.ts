export type SanitizeSvgResult =
  | { success: true; width: number; height: number; svg: string }
  | { success: false; error: string };

const FORBIDDEN_TAGS = new Set(["script", "foreignobject", "style"]);
const EVENT_HANDLER_PATTERN = /^on[a-z]/i;
const UNSAFE_CSS_PATTERN = /url\s*\(|@import|expression\s*\(|javascript\s*:/i;

function normalizeTagName(tagName: string): string {
  return tagName.toLowerCase();
}

function normalizeAttributeName(name: string): string {
  return name.toLowerCase();
}

function isLinkAttribute(name: string): boolean {
  const normalized = normalizeAttributeName(name);
  return (
    normalized === "href" ||
    normalized === "src" ||
    normalized === "xlink:href" ||
    normalized === "url" ||
    normalized.endsWith(":href")
  );
}

function isLocalFragmentReference(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith("#") && trimmed.length > 1;
}

function isForbiddenReference(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  return !isLocalFragmentReference(trimmed);
}

function preflightSource(source: string): string | null {
  if (/<!doctype/i.test(source)) {
    return "SVG содержит запрещённый DOCTYPE.";
  }
  if (/<!entity/i.test(source)) {
    return "SVG содержит запрещённые XML-сущности.";
  }
  if (/<\?xml-stylesheet/i.test(source)) {
    return "SVG содержит запрещённую инструкцию xml-stylesheet.";
  }
  return null;
}

function parseDimensionValue(raw: string): number | null {
  const match = raw.trim().match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/);
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

function readSvgDimensions(
  root: Element,
): { width: number; height: number } | { error: string } {
  const width = parseDimensionValue(root.getAttribute("width") ?? "");
  const height = parseDimensionValue(root.getAttribute("height") ?? "");

  if (width !== null && height !== null) {
    return { width, height };
  }

  const viewBox = root.getAttribute("viewBox");
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/);
    if (parts.length === 4) {
      const viewBoxWidth = parseDimensionValue(parts[2] ?? "");
      const viewBoxHeight = parseDimensionValue(parts[3] ?? "");
      if (viewBoxWidth !== null && viewBoxHeight !== null) {
        return { width: viewBoxWidth, height: viewBoxHeight };
      }
    }
  }

  return { error: "SVG не содержит допустимых размеров или viewBox." };
}

function inspectElementTree(root: Element): string | null {
  const elements: Element[] = [root];
  const descendants = root.querySelectorAll("*");
  descendants.forEach((element) => elements.push(element));

  for (const element of elements) {
    const tagName = normalizeTagName(element.tagName);
    if (FORBIDDEN_TAGS.has(tagName)) {
      if (tagName === "script") {
        return "SVG содержит запрещённый элемент <script>.";
      }
      if (tagName === "foreignobject") {
        return "SVG содержит запрещённый элемент foreignObject.";
      }
      return "SVG содержит запрещённый элемент <style>.";
    }

    for (const attribute of Array.from(element.attributes)) {
      const attributeName = normalizeAttributeName(attribute.name);
      const attributeValue = attribute.value;

      if (EVENT_HANDLER_PATTERN.test(attributeName)) {
        return "SVG содержит запрещённые обработчики событий.";
      }

      if (attributeName === "style" && UNSAFE_CSS_PATTERN.test(attributeValue)) {
        return "SVG содержит небезопасные CSS-ссылки в атрибуте style.";
      }

      if (isLinkAttribute(attributeName) && isForbiddenReference(attributeValue)) {
        return "SVG содержит запрещённые внешние ссылки.";
      }
    }
  }

  return null;
}

export function sanitizeSvg(source: string): SanitizeSvgResult {
  const preflightError = preflightSource(source);
  if (preflightError) {
    return { success: false, error: preflightError };
  }

  const document = new DOMParser().parseFromString(source.trim(), "image/svg+xml");

  if (document.querySelector("parsererror")) {
    return { success: false, error: "Не удалось разобрать SVG." };
  }

  if (document.doctype) {
    return { success: false, error: "SVG содержит запрещённый DOCTYPE." };
  }

  for (const child of Array.from(document.childNodes)) {
    if (child.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
      return {
        success: false,
        error: "SVG содержит запрещённые инструкции обработки XML.",
      };
    }
  }

  const root = document.documentElement;
  if (!root || normalizeTagName(root.tagName) !== "svg") {
    return { success: false, error: "Файл SVG не содержит корневой элемент <svg>." };
  }

  const treeError = inspectElementTree(root);
  if (treeError) {
    return { success: false, error: treeError };
  }

  const dimensions = readSvgDimensions(root);
  if ("error" in dimensions) {
    return { success: false, error: dimensions.error };
  }

  const svg = new XMLSerializer().serializeToString(root);
  return {
    success: true,
    width: dimensions.width,
    height: dimensions.height,
    svg,
  };
}

/** @deprecated Use sanitizeSvg instead */
export function inspectSvg(
  svgText: string,
): { width: number; height: number } | { error: string } {
  const result = sanitizeSvg(svgText);
  if (!result.success) {
    return { error: result.error };
  }
  return { width: result.width, height: result.height };
}
