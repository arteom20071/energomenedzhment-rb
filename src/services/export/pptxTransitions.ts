import type { SlideTransition } from "../../domain/presentation";

export const PPTX_SLIDE_WIDTH_IN = 13.333;
export const PPTX_SLIDE_HEIGHT_IN = 7.5;
export const LOGICAL_PIXELS_PER_INCH = 144;

export interface PptxTransitionSpec {
  type: "fade" | "push" | "zoom";
  speed: "slow" | "med" | "fast";
  direction?: "l" | "r" | "u" | "d";
}

export function mapSlideTransitionToPptx(
  transition: SlideTransition,
): PptxTransitionSpec | undefined {
  switch (transition) {
    case "fade":
      return { type: "fade", speed: "med" };
    case "slide":
      return { type: "push", speed: "med", direction: "l" };
    case "zoom":
      return { type: "zoom", speed: "med" };
    case "none":
      return undefined;
  }
}

export function pptxTransitionToXml(spec: PptxTransitionSpec | undefined): string {
  if (!spec) {
    return "";
  }

  const inner =
    spec.type === "push"
      ? `<p:push dir="${spec.direction ?? "l"}"/>`
      : spec.type === "zoom"
        ? "<p:zoom/>"
        : "<p:fade/>";

  return `<p:transition spd="${spec.speed}">${inner}</p:transition>`;
}

export function injectSlideTransitionXml(slideXml: string, transitionXml: string): string {
  if (!transitionXml) {
    return slideXml;
  }

  if (slideXml.includes("<p:transition")) {
    return slideXml.replace(/<p:transition[\s\S]*?<\/p:transition>/, transitionXml);
  }

  return slideXml.replace("</p:sld>", `${transitionXml}</p:sld>`);
}

export function pxToInch(px: number): number {
  return px / LOGICAL_PIXELS_PER_INCH;
}

export function cssPxToPoints(px: number): number {
  return px / 2;
}

export function toPptxHexColor(value: string, fallback = "FFFFFF"): string {
  const trimmed = value.trim();
  const hex = trimmed.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!hex) {
    const rgb = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (!rgb) {
      return fallback;
    }
    return [rgb[1], rgb[2], rgb[3]]
      .map((channel) => Number(channel).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  }

  const raw = hex[1] ?? "";
  if (raw.length === 3) {
    return raw
      .split("")
      .map((char) => `${char}${char}`)
      .join("")
      .toUpperCase();
  }

  return raw.toUpperCase();
}

export function firstFontFamily(fontFamily: unknown, fallback = "Inter"): string {
  if (typeof fontFamily !== "string" || fontFamily.trim().length === 0) {
    return fallback;
  }

  const first = fontFamily.split(",")[0]?.trim().replace(/^["']|["']$/g, "");
  return first && first.length > 0 ? first : fallback;
}
