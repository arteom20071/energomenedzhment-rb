import { describe, expect, it } from "vitest";

import {
  cssPxToPoints,
  firstFontFamily,
  injectSlideTransitionXml,
  mapSlideTransitionToPptx,
  pptxTransitionToXml,
  pxToInch,
  toPptxHexColor,
} from "./pptxTransitions";

describe("pptxTransitions", () => {
  it("maps editor transitions to PowerPoint equivalents", () => {
    expect(mapSlideTransitionToPptx("fade")).toEqual({ type: "fade", speed: "med" });
    expect(mapSlideTransitionToPptx("slide")).toEqual({
      type: "push",
      speed: "med",
      direction: "l",
    });
    expect(mapSlideTransitionToPptx("zoom")).toEqual({ type: "zoom", speed: "med" });
    expect(mapSlideTransitionToPptx("none")).toBeUndefined();
  });

  it("serializes transition OOXML", () => {
    expect(pptxTransitionToXml({ type: "fade", speed: "med" })).toBe(
      '<p:transition spd="med"><p:fade/></p:transition>',
    );
    expect(pptxTransitionToXml({ type: "push", speed: "med", direction: "l" })).toBe(
      '<p:transition spd="med"><p:push dir="l"/></p:transition>',
    );
    expect(pptxTransitionToXml({ type: "zoom", speed: "fast" })).toBe(
      '<p:transition spd="fast"><p:zoom/></p:transition>',
    );
    expect(pptxTransitionToXml(undefined)).toBe("");
  });

  it("injects or replaces transition nodes before the slide close tag", () => {
    const slide = "<p:sld><p:cSld/></p:sld>";
    const fade = pptxTransitionToXml({ type: "fade", speed: "med" });
    const withFade = injectSlideTransitionXml(slide, fade);
    expect(withFade).toContain(fade);
    expect(withFade.endsWith("</p:sld>")).toBe(true);

    const zoom = pptxTransitionToXml({ type: "zoom", speed: "med" });
    expect(injectSlideTransitionXml(withFade, zoom)).toContain(zoom);
    expect(injectSlideTransitionXml(withFade, zoom)).not.toContain("<p:fade/>");
  });

  it("converts the 1920×1080 canvas to a 16:9 widescreen slide", () => {
    expect(pxToInch(1920)).toBeCloseTo(13.333, 3);
    expect(pxToInch(1080)).toBeCloseTo(7.5, 3);
    expect(cssPxToPoints(32)).toBe(16);
  });

  it("normalizes colors and font families for PowerPoint", () => {
    expect(toPptxHexColor("#4f46e5")).toBe("4F46E5");
    expect(toPptxHexColor("#abc")).toBe("AABBCC");
    expect(toPptxHexColor("rgb(5, 150, 105)")).toBe("059669");
    expect(firstFontFamily("Inter, sans-serif")).toBe("Inter");
  });
});
