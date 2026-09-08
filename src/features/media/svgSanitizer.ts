const EVENT_HANDLER_PATTERN = /^on/i;
const UNSAFE_URI_PATTERN = /^(https?:|\/\/|javascript:|data:text\/html)/i;

export interface SvgInspectionResult {
  width: number;
  height: number;
}

export function inspectSvg(svgText: string): SvgInspectionResult | { error: string } {
  const trimmed = svgText.trim();
  if (!trimmed.includes("<svg")) {
    return { error: "Файл SVG не содержит корневой элемент <svg>." };
  }

  let document: Document;
  try {
    document = new DOMParser().parseFromString(trimmed, "image/svg+xml");
  } catch {
    return { error: "Не удалось разобрать SVG." };
  }

  const root = document.documentElement;
  if (!root || root.nodeName.toLowerCase() !== "svg") {
    return { error: "Файл SVG не содержит корневой элемент <svg>." };
  }

  if (root.querySelector("script")) {
    return { error: "SVG содержит запрещённый элемент <script>." };
  }

  if (root.querySelector("foreignObject")) {
    return { error: "SVG содержит запрещённый элемент foreignObject." };
  }

  const elements = root.querySelectorAll("*");
  for (const element of elements) {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();

      if (EVENT_HANDLER_PATTERN.test(name)) {
        return { error: "SVG содержит запрещённые обработчики событий." };
      }

      if (
        (name === "href" ||
          name === "xlink:href" ||
          name === "src" ||
          name.endsWith(":href")) &&
        UNSAFE_URI_PATTERN.test(value)
      ) {
        return { error: "SVG содержит запрещённые внешние ссылки." };
      }
    }
  }

  const hrefElements = root.querySelectorAll("[href], [xlink\\:href], [src]");
  for (const element of hrefElements) {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      if (
        name === "href" ||
        name === "xlink:href" ||
        name === "src" ||
        name.endsWith(":href")
      ) {
        if (UNSAFE_URI_PATTERN.test(attribute.value.trim())) {
          return { error: "SVG содержит запрещённые внешние ссылки." };
        }
      }
    }
  }

  const useElements = root.querySelectorAll("use, image");
  for (const element of useElements) {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      if (name === "href" || name === "xlink:href" || name === "src") {
        const value = attribute.value.trim();
        if (value.startsWith("#")) {
          continue;
        }
        if (UNSAFE_URI_PATTERN.test(value)) {
          return { error: "SVG содержит запрещённые внешние ссылки." };
        }
      }
    }
  }

  const width = readSvgDimension(root, "width");
  const height = readSvgDimension(root, "height");

  if (width <= 0 || height <= 0) {
    const viewBox = root.getAttribute("viewBox");
    if (viewBox) {
      const parts = viewBox.split(/\s+/).map(Number);
      if (parts.length === 4 && parts[2]! > 0 && parts[3]! > 0) {
        return { width: parts[2]!, height: parts[3]! };
      }
    }
    return { width: 512, height: 512 };
  }

  return { width, height };
}

function readSvgDimension(root: Element, attribute: "width" | "height"): number {
  const raw = root.getAttribute(attribute);
  if (!raw) {
    return 0;
  }
  const parsed = Number.parseFloat(raw.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
