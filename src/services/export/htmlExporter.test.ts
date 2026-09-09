import { describe, expect, it } from "vitest";

import { createPresentation, createImageElement, createTextElement } from "../../domain/factories";
import {
  generateStandaloneHtml,
  generateStandaloneHtmlFromResolved,
  sanitizeFilename,
} from "./htmlExporter";
import { createDataUrlResolver } from "./jsonExporter";
import { toAssetReference } from "../persistence/assetRepository";

const SAMPLE_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("generateStandaloneHtmlFromResolved", () => {
  it("embeds serialized slides and escapes script-breaking sequences", () => {
    const presentation = createPresentation("HTML Export");
    const slide = presentation.slides[0]!;
    slide.elements.push(
      createTextElement(slide.elements, {
        content: '</script><script>alert("xss")</script>',
      }),
    );

    const html = generateStandaloneHtmlFromResolved(presentation);

    expect(html).toContain("application/json");
    expect(html).toContain("&lt;/script&gt;");
    expect(html).not.toContain('</script><script>alert');
    expect(html).toContain("requestAnimationFrame");
    expect(html).toContain("stage-enter");
    expect(html).toContain("element-outer");
    expect(html).toContain("element-inner");
  });

  it("uses property-specific CSS serializers and blocks injection", () => {
    const presentation = createPresentation("CSS Safety");
    const slide = presentation.slides[0]!;
    slide.elements.push(
      createTextElement(slide.elements, {
        styles: {
          color: "red; background: url(http://evil.test)",
          fontFamily: "Inter; @import url(x)",
        },
      }),
    );

    const html = generateStandaloneHtmlFromResolved(presentation);
    const rendered = html.match(/<section[\s\S]*?<\/section>/)?.[0] ?? "";
    expect(rendered).not.toContain("url(http://evil.test)");
    expect(rendered).not.toContain("@import");
    expect(rendered).toContain("color:#111827");
  });

  it("writes element opacity and image rounding onto the outer wrapper", () => {
    const presentation = createPresentation("Opacity");
    const slide = presentation.slides[0]!;
    slide.elements.push(
      createImageElement(slide.elements, {
        content: SAMPLE_DATA_URL,
        styles: { opacity: 0.4, borderRadius: 16, alt: "campus" },
      }),
    );

    const html = generateStandaloneHtmlFromResolved(presentation);
    expect(html).toContain("opacity:0.4");
    expect(html).toContain("border-radius:16px");
  });

  it("preserves rotation on outer wrapper while inner handles animation", () => {
    const presentation = createPresentation("Rotation");
    const slide = presentation.slides[0]!;
    slide.elements.push(
      createTextElement(slide.elements, {
        rotation: 45,
        animation: "fade-up",
      }),
    );

    const html = generateStandaloneHtmlFromResolved(presentation);
    expect(html).toContain("rotate(45deg)");
    expect(html).toContain('data-animation="fade-up"');
    expect(html).toContain("element-inner");
  });
});

describe("generateStandaloneHtml", () => {
  it("rejects unresolved image references before generation", async () => {
    const presentation = createPresentation("HTML Unresolved");
    const slide = presentation.slides[0]!;
    slide.elements.push(
      createImageElement(slide.elements, { content: toAssetReference("missing") }),
    );

    const result = await generateStandaloneHtml(presentation, createDataUrlResolver({}));
    expect(result.success).toBe(false);
  });

  it("resolves assets and generates self-contained html", async () => {
    const presentation = createPresentation("Resolved HTML");
    const slide = presentation.slides[0]!;
    slide.elements.push(
      createImageElement(slide.elements, { content: toAssetReference("img-1") }),
    );

    const result = await generateStandaloneHtml(
      presentation,
      createDataUrlResolver({ "img-1": SAMPLE_DATA_URL }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.html).toContain(SAMPLE_DATA_URL);
      expect(result.filename.endsWith(".html")).toBe(true);
      expect(result.html).not.toMatch(/src="https?:/);
    }
  });
});

describe("sanitizeFilename html", () => {
  it("returns sanitized .html extension", () => {
    expect(sanitizeFilename("COM1")).toBe("COM1_.html");
    expect(sanitizeFilename("My Deck")).toBe("My-Deck.html");
  });
});

describe("css transition staging", () => {
  it("includes opacity and transform transitions with fade staging", () => {
    const presentation = createPresentation("Transitions");
    presentation.slides[0]!.transition = "fade";

    const html = generateStandaloneHtmlFromResolved(presentation);
    expect(html).toContain("transition: opacity 0.4s ease, transform 0.4s ease");
    expect(html).toContain("transition-fade");
    expect(html).toContain("opacity: 0");
    expect(html).toContain("stage-active");
    expect(html).toContain("requestAnimationFrame");
  });

  it("includes slide-left and zoom staged initial states", () => {
    const presentation = createPresentation("Zoom");
    presentation.slides[0]!.transition = "zoom";

    const html = generateStandaloneHtmlFromResolved(presentation);
    expect(html).toContain("transition-zoom");
    expect(html).toContain("scale(0.85)");
    expect(html).toContain("opacity: 0");
  });

  it("uses transition-none without fade staging or double rAF", () => {
    const presentation = createPresentation("No Transition");
    presentation.slides[0]!.transition = "none";

    const html = generateStandaloneHtmlFromResolved(presentation);
    expect(html).toContain("transition-none");
    expect(html).toContain(".slide.active.transition-none");
    expect(html).toContain("transition: none");
    expect(html).toContain("if (transition === 'none')");
    expect(html).not.toMatch(/transition === 'fade' \|\| transition === 'none'/);
  });

  it("distinguishes fade from none in stageSlide", () => {
    const fadePresentation = createPresentation("Fade Deck");
    fadePresentation.slides[0]!.transition = "fade";
    const fadeHtml = generateStandaloneHtmlFromResolved(fadePresentation);

    const nonePresentation = createPresentation("None Deck");
    nonePresentation.slides[0]!.transition = "none";
    const noneHtml = generateStandaloneHtmlFromResolved(nonePresentation);

    expect(fadeHtml).toContain("transition-fade");
    expect(fadeHtml).toContain("requestAnimationFrame");
    expect(noneHtml).toContain("transition-none");
    expect(noneHtml).not.toMatch(/transition === 'fade' \|\| transition === 'none'/);
    expect(noneHtml).toMatch(/if \(transition === 'none'\)[\s\S]*return;/);
  });
});
