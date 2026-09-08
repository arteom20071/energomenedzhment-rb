import { describe, expect, it } from "vitest";

import { createPresentation, createImageElement, createTextElement } from "../../domain/factories";
import { generateStandaloneHtml, sanitizeFilename } from "./htmlExporter";

describe("generateStandaloneHtml", () => {
  it("embeds serialized slides and escapes script-breaking sequences", () => {
    const presentation = createPresentation("HTML Export");
    const slide = presentation.slides[0]!;
    slide.elements.push(
      createTextElement(slide.elements, {
        content: '</script><script>alert("xss")</script>',
      }),
    );

    const html = generateStandaloneHtml(presentation);

    expect(html).toContain("application/json");
    expect(html).toContain("&lt;/script&gt;");
    expect(html).not.toContain('</script><script>alert');
    expect(html).toContain("HTML Export");
    expect(html).toContain("fadeUp");
    expect(html).toContain("ArrowRight");
    expect(html).toContain("button.className = 'dot'");
  });

  it("renders text, image, and shape elements without arbitrary HTML injection", () => {
    const presentation = createPresentation("Elements");
    const slide = presentation.slides[0]!;
    slide.elements = [
      createTextElement([], { content: "<b>bold</b>" }),
      createImageElement([], { content: "data:image/png;base64,x" }),
    ];

    const html = generateStandaloneHtml(presentation);
    expect(html).toContain("&lt;b&gt;bold&lt;/b&gt;");
    expect(html).toContain('class="element image"');
  });

  it("includes transition and animation support markers", () => {
    const presentation = createPresentation("Transitions");
    presentation.slides[0]!.transition = "zoom";
    presentation.slides[0]!.elements.push(
      createTextElement(presentation.slides[0]!.elements, { animation: "bounce" }),
    );

    const html = generateStandaloneHtml(presentation);
    expect(html).toContain('data-transition="zoom"');
    expect(html).toContain('data-animation="bounce"');
    expect(html).toContain("transition-zoom");
  });
});

describe("sanitizeFilename html", () => {
  it("returns .html extension", () => {
    expect(sanitizeFilename("My Deck")).toBe("My-Deck.html");
  });
});
