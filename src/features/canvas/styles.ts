import type { CSSProperties } from "react";

import type { SlideElementType } from "../../domain/presentation";

const SHARED_STYLE_KEYS = new Set(["opacity"]);

const STYLE_KEYS_BY_TYPE: Record<SlideElementType, ReadonlySet<string>> = {
  text: new Set([
    "fontSize",
    "color",
    "fontFamily",
    "fontWeight",
    "textAlign",
    "lineHeight",
    "letterSpacing",
    "opacity",
  ]),
  shape: new Set([
    "fill",
    "borderColor",
    "borderWidth",
    "borderRadius",
    "shapeKind",
    "opacity",
  ]),
  image: new Set([
    "objectFit",
    "objectPosition",
    "cropScale",
    "alt",
    "opacity",
  ]),
};

const TEXT_ALIGN_VALUES = new Set(["left", "center", "right", "justify"]);
const OBJECT_FIT_VALUES = new Set(["cover", "contain", "fill", "none", "scale-down"]);

const SAFE_COLOR_PATTERN =
  /^(#[0-9a-f]{3,8}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(?:0|1|0?\.\d+)\s*\)|[a-z]+)$/i;

function isPrimitiveStyleValue(value: unknown): value is string | number | boolean {
  const valueType = typeof value;
  return valueType === "string" || valueType === "number" || valueType === "boolean";
}

function isDangerousString(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.includes("url(") ||
    normalized.includes("expression(") ||
    normalized.includes("javascript:")
  );
}

function coerceFiniteNumber(value: unknown): number | undefined {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return undefined;
  }
  return numeric;
}

function sanitizeColor(value: unknown): string | undefined {
  if (typeof value !== "string" || isDangerousString(value)) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!SAFE_COLOR_PATTERN.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

function sanitizeOpacity(value: unknown): number | undefined {
  const numeric = coerceFiniteNumber(value);
  if (numeric === undefined) {
    return undefined;
  }
  return Math.min(1, Math.max(0, numeric));
}

function sanitizePositiveNumber(value: unknown): number | undefined {
  const numeric = coerceFiniteNumber(value);
  if (numeric === undefined || numeric < 0) {
    return undefined;
  }
  return numeric;
}

function sanitizeCropScale(value: unknown): number | undefined {
  const numeric = coerceFiniteNumber(value);
  if (numeric === undefined || numeric < 1 || numeric > 3) {
    return undefined;
  }
  return numeric;
}

function sanitizeObjectPosition(value: unknown): string | undefined {
  if (typeof value !== "string" || isDangerousString(value)) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!/^(\d+(?:\.\d+)?%|\d+(?:\.\d+)?px)(?:\s+(\d+(?:\.\d+)?%|\d+(?:\.\d+)?px))?$/.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

function sanitizeStyleValue(
  type: SlideElementType,
  key: string,
  value: unknown,
): string | number | boolean | undefined {
  switch (key) {
    case "color":
    case "fill":
    case "borderColor":
      return sanitizeColor(value);
    case "opacity":
      return sanitizeOpacity(value);
    case "fontSize":
    case "letterSpacing":
    case "lineHeight":
    case "borderWidth":
    case "borderRadius":
      return sanitizePositiveNumber(value);
    case "cropScale":
      return sanitizeCropScale(value);
    case "textAlign":
      return typeof value === "string" && TEXT_ALIGN_VALUES.has(value) ? value : undefined;
    case "objectFit":
      return typeof value === "string" && OBJECT_FIT_VALUES.has(value) ? value : undefined;
    case "objectPosition":
      return sanitizeObjectPosition(value);
    case "fontFamily":
    case "fontWeight":
    case "shapeKind":
    case "alt":
      if (typeof value !== "string" || isDangerousString(value)) {
        return undefined;
      }
      return value;
    default:
      if (!isPrimitiveStyleValue(value)) {
        return undefined;
      }
      if (typeof value === "string" && isDangerousString(value)) {
        return undefined;
      }
      return value;
  }
}

export function sanitizeElementStyles(
  type: SlideElementType,
  styles: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const allowed = STYLE_KEYS_BY_TYPE[type];
  const sanitized: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(styles)) {
    if (!allowed.has(key) && !SHARED_STYLE_KEYS.has(key)) {
      continue;
    }

    const safeValue = sanitizeStyleValue(type, key, value);
    if (safeValue !== undefined) {
      sanitized[key] = safeValue;
    }
  }

  return sanitized;
}

function appendPx(value: string | number | boolean | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "number") {
    return `${value}px`;
  }
  if (typeof value === "boolean") {
    return undefined;
  }
  return value;
}

export function toImageInnerStyles(
  styles: Record<string, unknown>,
): CSSProperties {
  const safe = sanitizeElementStyles("image", styles);
  const cropScale = typeof safe.cropScale === "number" ? safe.cropScale : 1;
  const objectPosition = (safe.objectPosition as string | undefined) ?? "50% 50%";

  return {
    width: "100%",
    height: "100%",
    objectFit: safe.objectFit as CSSProperties["objectFit"],
    objectPosition,
    transform: cropScale === 1 ? undefined : `scale(${cropScale})`,
    transformOrigin: objectPosition,
  };
}

export function toCssProperties(
  type: SlideElementType,
  styles: Record<string, unknown>,
): CSSProperties {
  const safe = sanitizeElementStyles(type, styles);
  const css: CSSProperties = {};

  if (type === "text") {
    css.fontSize = appendPx(safe.fontSize);
    css.color = safe.color as string | undefined;
    css.fontFamily = safe.fontFamily as string | undefined;
    css.fontWeight = safe.fontWeight as CSSProperties["fontWeight"];
    css.textAlign = safe.textAlign as CSSProperties["textAlign"];
    css.lineHeight = safe.lineHeight as CSSProperties["lineHeight"];
    css.letterSpacing = appendPx(safe.letterSpacing);
  }

  if (type === "shape") {
    css.backgroundColor = safe.fill as string | undefined;
    css.borderColor = safe.borderColor as string | undefined;
    css.borderWidth = appendPx(safe.borderWidth);
    css.borderStyle = safe.borderWidth ? "solid" : undefined;
    css.borderRadius = appendPx(safe.borderRadius);
    if (safe.shapeKind === "ellipse" || safe.shapeKind === "circle") {
      css.borderRadius = "50%";
    }
  }

  if (safe.opacity !== undefined) {
    css.opacity = Number(safe.opacity);
  }

  return css;
}

export function getImageAlt(styles: Record<string, unknown>): string {
  const alt = sanitizeElementStyles("image", styles).alt;
  return typeof alt === "string" ? alt : "";
}
