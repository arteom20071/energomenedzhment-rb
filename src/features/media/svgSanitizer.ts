export type SanitizeSvgResult =
  | { success: true; width: number; height: number; svg: string }
  | { success: false; error: string };

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const ALLOWED_TAGS = new Set([
  "svg",
  "g",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "defs",
  "clippath",
  "mask",
  "lineargradient",
  "radialgradient",
  "stop",
  "title",
  "desc",
]);

const GLOBAL_ATTRIBUTES = new Set([
  "id",
  "class",
  "opacity",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "fill-opacity",
  "stroke-opacity",
  "transform",
  "display",
  "visibility",
]);

const TAG_ATTRIBUTES: Record<string, readonly string[]> = {
  svg: ["xmlns", "width", "height", "viewbox", "preserveaspectratio"],
  rect: ["x", "y", "width", "height", "rx", "ry"],
  circle: ["cx", "cy", "r"],
  ellipse: ["cx", "cy", "rx", "ry"],
  line: ["x1", "y1", "x2", "y2"],
  polyline: ["points"],
  polygon: ["points"],
  path: ["d", "fill-rule", "clip-rule"],
  text: [
    "x",
    "y",
    "dx",
    "dy",
    "text-anchor",
    "font-family",
    "font-size",
    "font-weight",
    "dominant-baseline",
  ],
  tspan: [
    "x",
    "y",
    "dx",
    "dy",
    "text-anchor",
    "font-family",
    "font-size",
    "font-weight",
    "dominant-baseline",
  ],
  lineargradient: [
    "x1",
    "y1",
    "x2",
    "y2",
    "gradientunits",
    "gradienttransform",
    "spreadmethod",
  ],
  radialgradient: [
    "cx",
    "cy",
    "r",
    "fx",
    "fy",
    "gradientunits",
    "gradienttransform",
    "spreadmethod",
  ],
  stop: ["offset", "stop-color", "stop-opacity"],
};

const EXPLICIT_DIMENSION_PATTERN =
  /^(?:\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)(?:px)?$/;

const UNITLESS_NUMBER_PATTERN =
  /^-?(?:\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)$/;

const UNSAFE_VALUE_PATTERN =
  /url\s*\(|@import|expression\s*\(|javascript\s*:|data\s*:|https?\s*:|\/\/|file\s*:|blob\s*:/i;

function containsForbiddenControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code === 0x09 || code === 0x0a || code === 0x0d) {
      continue;
    }
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

function normalizeLocalName(element: Element): string {
  return element.localName.toLowerCase();
}

function normalizeAttributeName(name: string): string {
  return name.toLowerCase();
}

function isSvgNamespace(namespaceUri: string | null): boolean {
  return namespaceUri === SVG_NAMESPACE || namespaceUri === null;
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

function parseExplicitDimension(raw: string): number | null {
  const trimmed = raw.trim();
  if (!EXPLICIT_DIMENSION_PATTERN.test(trimmed)) {
    return null;
  }

  const numericPart = trimmed.endsWith("px") ? trimmed.slice(0, -2) : trimmed;
  const value = Number(numericPart);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

function parseUnitlessNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!UNITLESS_NUMBER_PATTERN.test(trimmed)) {
    return null;
  }

  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

function parsePositiveUnitlessNumber(raw: string): number | null {
  const value = parseUnitlessNumber(raw);
  if (value === null || value <= 0) {
    return null;
  }

  return value;
}

function readSvgDimensions(
  root: Element,
): { width: number; height: number } | { error: string } {
  const width = parseExplicitDimension(root.getAttribute("width") ?? "");
  const height = parseExplicitDimension(root.getAttribute("height") ?? "");

  if (width !== null && height !== null) {
    return { width, height };
  }

  const viewBox = root.getAttribute("viewBox");
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/);
    if (parts.length === 4) {
      const minX = parseUnitlessNumber(parts[0] ?? "");
      const minY = parseUnitlessNumber(parts[1] ?? "");
      const viewBoxWidth = parsePositiveUnitlessNumber(parts[2] ?? "");
      const viewBoxHeight = parsePositiveUnitlessNumber(parts[3] ?? "");

      if (
        minX !== null &&
        minY !== null &&
        viewBoxWidth !== null &&
        viewBoxHeight !== null
      ) {
        return { width: viewBoxWidth, height: viewBoxHeight };
      }
    }
  }

  return { error: "SVG не содержит допустимых размеров или viewBox." };
}

function isAllowedAttribute(tagName: string, attributeName: string): boolean {
  if (GLOBAL_ATTRIBUTES.has(attributeName)) {
    return true;
  }

  const tagAttributes = TAG_ATTRIBUTES[tagName];
  return tagAttributes?.includes(attributeName) ?? false;
}

function inspectAttributeValue(value: string): string | null {
  if (containsForbiddenControlCharacters(value)) {
    return "SVG содержит недопустимые управляющие символы.";
  }

  if (UNSAFE_VALUE_PATTERN.test(value)) {
    return "SVG содержит небезопасное значение атрибута.";
  }

  return null;
}

function inspectElementTree(root: Element): string | null {
  const elements: Element[] = [root];
  root.querySelectorAll("*").forEach((element) => elements.push(element));

  for (const element of elements) {
    if (!isSvgNamespace(element.namespaceURI)) {
      return "SVG содержит элементы вне SVG-пространства имён.";
    }

    const tagName = normalizeLocalName(element);
    if (!ALLOWED_TAGS.has(tagName)) {
      return `SVG содержит запрещённый элемент <${element.localName}>.`;
    }

    for (const attribute of Array.from(element.attributes)) {
      if (attribute.name.includes(":")) {
        return "SVG содержит запрещённые атрибуты с префиксом пространства имён.";
      }

      const attributeName = normalizeAttributeName(attribute.name);

      if (/^on[a-z]/i.test(attributeName)) {
        return "SVG содержит запрещённые обработчики событий.";
      }

      if (
        attributeName === "href" ||
        attributeName === "src" ||
        attributeName === "xlink:href"
      ) {
        return "SVG содержит запрещённые ссылочные атрибуты.";
      }

      if (!isAllowedAttribute(tagName, attributeName)) {
        return `SVG содержит неразрешённый атрибут «${attribute.name}».`;
      }

      if (tagName === "svg" && attributeName === "xmlns") {
        if (attribute.value !== SVG_NAMESPACE) {
          return "SVG содержит недопустимое значение xmlns.";
        }
        continue;
      }

      const valueError = inspectAttributeValue(attribute.value);
      if (valueError) {
        return valueError;
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
  if (!root || normalizeLocalName(root) !== "svg") {
    return { success: false, error: "Файл SVG не содержит корневой элемент <svg>." };
  }

  if (!isSvgNamespace(root.namespaceURI)) {
    return { success: false, error: "SVG содержит элементы вне SVG-пространства имён." };
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
