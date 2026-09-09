import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { createPresentation, createShapeElement, createTextElement } from "../../domain/factories";
import { createDataUrlResolver } from "./jsonExporter";
import { applyPptxTransitions, exportPresentationPptx } from "./pptxExporter";

describe("pptxExporter", () => {
  it("writes a pptx archive and injects mapped slide transitions", async () => {
    const presentation = createPresentation("PowerPoint Export");
    presentation.slides[0]!.transition = "fade";
    const heading = createTextElement([], {
      content: "Заголовок",
      x: 80,
      y: 80,
      width: 800,
      height: 120,
    });
    const block = createShapeElement([heading], {
      x: 80,
      y: 240,
      width: 400,
      height: 160,
      styles: { fill: "#4f46e5" },
    });
    presentation.slides[0]!.elements.push(heading, block);
    presentation.slides.push({
      id: "slide-zoom",
      background: "#0f172a",
      transition: "zoom",
      elements: [createTextElement([], { id: "t-zoom", content: "Zoom", styles: { color: "#ffffff" } })],
    });
    presentation.slides.push({
      id: "slide-push",
      background: "#ffffff",
      transition: "slide",
      elements: [],
    });
    presentation.slides.push({
      id: "slide-none",
      background: "#ffffff",
      transition: "none",
      elements: [],
    });

    const result = await exportPresentationPptx(presentation, createDataUrlResolver({}));
    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.filename).toBe("PowerPoint-Export.pptx");
    const bytes = new Uint8Array(await result.blob.arrayBuffer());
    expect(String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0)).toBe("PK");

    const zip = await JSZip.loadAsync(result.blob);
    const slide1 = await zip.file("ppt/slides/slide1.xml")?.async("string");
    const slide2 = await zip.file("ppt/slides/slide2.xml")?.async("string");
    const slide3 = await zip.file("ppt/slides/slide3.xml")?.async("string");
    const slide4 = await zip.file("ppt/slides/slide4.xml")?.async("string");

    expect(slide1).toContain("<p:fade/>");
    expect(slide2).toContain("<p:zoom/>");
    expect(slide3).toContain('<p:push dir="l"/>');
    expect(slide4).not.toContain("<p:transition");
  });

  it("injects transitions into an existing slide zip in order", async () => {
    const zip = new JSZip();
    zip.file("ppt/slides/slide1.xml", "<p:sld><p:cSld/></p:sld>");
    zip.file("ppt/slides/slide2.xml", "<p:sld><p:cSld/></p:sld>");
    const source = await zip.generateAsync({ type: "blob" });

    const patched = await applyPptxTransitions(source, ["slide", "none"]);
    const next = await JSZip.loadAsync(patched);
    expect(await next.file("ppt/slides/slide1.xml")?.async("string")).toContain("<p:push");
    expect(await next.file("ppt/slides/slide2.xml")?.async("string")).not.toContain(
      "<p:transition",
    );
  });
});
