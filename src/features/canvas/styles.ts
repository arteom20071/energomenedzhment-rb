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

function isPrimitiveStyleValue(value: unknown): value is string | number | boolean {
  const valueType = typeof value;
  return valueType === "string" || valueType === "number" || valueType === "boolean";
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
    if (!isPrimitiveStyleValue(value)) {
      continue;
    }
    sanitized[key] = value;
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
  }

  if (type === "image") {
    css.objectFit = safe.objectFit as CSSProperties["objectFit"];
    css.objectPosition = safe.objectPosition as string | undefined;
    const cropScale = typeof safe.cropScale === "number" ? safe.cropScale : 1;
    if (cropScale !== 1) {
      css.transform = `scale(${cropScale})`;
      css.transformOrigin = safe.objectPosition as string | undefined ?? "center";
    }
  }

  if (safe.opacity !== undefined) {
    css.opacity = Number(safe.opacity);
  }

  return css;
}

export function getImageAlt(styles: Record<string, unknown>): string {
  const alt = styles.alt;
  return typeof alt === "string" ? alt : "";
}
