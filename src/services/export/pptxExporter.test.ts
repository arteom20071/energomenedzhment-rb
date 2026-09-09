import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { createPresentation, createShapeElement, createTextElement } from "../../domain/factories";
import type { Presentation } from "../../domain/presentation";
import { energyManagementPresentation } from "../../seed/energyManagement";
import { createDataUrlResolver } from "./jsonExporter";
import { applyPptxTransitions, exportPresentationPptx } from "./pptxExporter";

const SAMPLE_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function loadExportedZip(presentation: Presentation) {
  const result = await exportPresentationPptx(presentation, createDataUrlResolver({}), {
    fetchPublicImage: async () => SAMPLE_PNG,
  });
  expect(result.success).toBe(true);
  if (!result.success) {
    throw new Error(result.error);
  }
  return JSZip.loadAsync(result.blob);
}

function listedContentParts(typesXml: string): string[] {
  return [...typesXml.matchAll(/PartName="\/([^"]+)"/g)].map((match) => match[1]!);
}

function geometryAdjValues(xml: string): number[] {
  return [...xml.matchAll(/<a:gd name="adj" fmla="val (-?\d+)"/g)].map((match) => Number(match[1]));
}

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

  it("does not advertise missing package parts that PowerPoint would repair away", async () => {
    const zip = await loadExportedZip(energyManagementPresentation);
    const typesXml = await zip.file("[Content_Types].xml")?.async("string");
    expect(typesXml).toBeTruthy();
    const missing = listedContentParts(typesXml!).filter((part) => !zip.file(part));
    expect(missing).toEqual([]);
  });

  it("keeps thin and elliptical shapes within valid DrawingML geometry", async () => {
    const presentation = createPresentation("Geometry");
    presentation.slides[0]!.elements.push(
      createShapeElement([], {
        id: "hairline",
        x: 80,
        y: 1010,
        width: 1760,
        height: 1,
        styles: { fill: "#e2e8f0" },
      }),
      createShapeElement([], {
        id: "ellipse",
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        styles: { fill: "#0284c7", shapeKind: "ellipse", borderRadius: 100 },
      }),
      createShapeElement([], {
        id: "card",
        x: 400,
        y: 100,
        width: 240,
        height: 80,
        styles: { fill: "#4f46e5", borderRadius: 12 },
      }),
    );

    const zip = await loadExportedZip(presentation);
    const xml = await zip.file("ppt/slides/slide1.xml")?.async("string");
    expect(xml).toBeTruthy();
    for (const adj of geometryAdjValues(xml!)) {
      expect(adj).toBeGreaterThanOrEqual(0);
      expect(adj).toBeLessThanOrEqual(50000);
    }
    expect(xml).toContain('prst="ellipse"');
    expect(xml).not.toMatch(/prst="ellipse"><a:avLst><a:gd name="adj"/);
    expect(xml).toContain('prst="rect"');
  });
});
