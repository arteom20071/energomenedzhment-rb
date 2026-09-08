function containsControlCharacters(value: string): boolean {
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 32) {
      return true;
    }
  }
  return false;
}

const CSS_INJECTION_PATTERN = /[;]|url\s*\(|expression\s*\(|@import/i;
const NAMED_COLORS = new Set([
  "transparent",
  "white",
  "black",
  "red",
  "blue",
  "green",
  "yellow",
  "gray",
  "grey",
  "orange",
  "purple",
  "pink",
  "brown",
  "cyan",
  "magenta",
  "#ffffff",
  "#000000",
]);

const FONT_FAMILY_PATTERN = /^[\w\s,"'-]+$/;
const OBJECT_FIT_VALUES = new Set(["cover", "contain", "fill", "none", "scale-down"]);
const TEXT_ALIGN_VALUES = new Set(["left", "center", "right", "justify"]);
const FONT_WEIGHT_VALUES = new Set(["normal", "bold", "lighter", "bolder"]);

function hasCssInjection(value: string): boolean {
  return CSS_INJECTION_PATTERN.test(value) || containsControlCharacters(value);
}

export function serializeColor(value: unknown, fallback: string): string {
  if (typeof value !== "string" || value.length === 0 || hasCssInjection(value)) {
    return fallback;
  }

  const trimmed = value.trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) {
    return trimmed;
  }

  if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*(?:0?\.\d+|1|0))?\s*\)$/.test(trimmed)) {
    return trimmed;
  }

  if (NAMED_COLORS.has(trimmed.toLowerCase())) {
    return trimmed;
  }

  return fallback;
}

export function serializeFontFamily(value: unknown, fallback: string): string {
  if (typeof value !== "string" || hasCssInjection(value) || !FONT_FAMILY_PATTERN.test(value)) {
    return fallback;
  }
  return value.trim();
}

export function serializeFontWeight(value: unknown, fallback: string): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string" && FONT_WEIGHT_VALUES.has(value)) {
    return value;
  }
  return fallback;
}

export function serializeTextAlign(value: unknown, fallback: string): string {
  if (typeof value === "string" && TEXT_ALIGN_VALUES.has(value)) {
    return value;
  }
  return fallback;
}

export function serializeObjectFit(value: unknown, fallback: string): string {
  if (typeof value === "string" && OBJECT_FIT_VALUES.has(value)) {
    return value;
  }
  return fallback;
}

export function serializePxNumber(value: unknown, fallback: number): string {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return `${value}px`;
  }
  return `${fallback}px`;
}

export function serializeLineHeight(value: unknown, fallback: number): string {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return String(value);
  }
  return String(fallback);
}

export function serializeBorder(value: unknown, fallback: string): string {
  if (value === "none") {
    return "none";
  }

  if (typeof value !== "string" || hasCssInjection(value)) {
    return fallback;
  }

  const trimmed = value.trim();
  if (/^\d+(?:\.\d+)?px\s+(solid|dashed|dotted)\s+(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|[a-zA-Z]+)$/.test(trimmed)) {
    return trimmed;
  }

  return fallback;
}

export function serializePlainText(value: unknown, fallback = ""): string {
  if (typeof value !== "string") {
    return fallback;
  }
  return value;
}

export function serializeRotation(value: number): string {
  if (!Number.isFinite(value)) {
    return "0deg";
  }
  return `${value}deg`;
}

export function serializePosition(value: number): string {
  if (!Number.isFinite(value)) {
    return "0px";
  }
  return `${value}px`;
}

export function serializeZIndex(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return String(Math.trunc(value));
}
