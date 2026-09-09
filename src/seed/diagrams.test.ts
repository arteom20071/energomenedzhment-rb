import { describe, expect, it } from "vitest";

import { containFrame, schemaDiagram } from "./diagrams";

describe("containFrame", () => {
  it("letterboxes a square view into a wider box", () => {
    expect(containFrame({ x: 0, y: 0, w: 200, h: 100 }, 400, 400)).toEqual({
      x: 50,
      y: 0,
      w: 100,
      h: 100,
      vw: 400,
      vh: 400,
    });
  });
});

describe("schemaDiagram", () => {
  it("emits editable text rather than images", () => {
    const diagram = schemaDiagram("demo", { x: 0, y: 0, w: 820, h: 720 }, 0);
    expect(diagram.elements.some((element) => element.type === "image")).toBe(false);
    expect(
      diagram.elements.some(
        (element) => element.type === "text" && element.content?.includes("КОНТУР УПРАВЛЕНИЯ ТЭР"),
      ),
    ).toBe(true);
    expect(diagram.nextZ).toBe(diagram.elements.length);
  });
});
