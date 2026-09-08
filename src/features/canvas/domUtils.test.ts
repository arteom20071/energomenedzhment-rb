import { describe, expect, it } from "vitest";

import { buildElementSelector, escapeElementId, queryElementById } from "./domUtils";

describe("domUtils", () => {
  it("escapes special characters in element ids for selectors", () => {
    const weirdId = 'el["weird"]';
    const escaped = escapeElementId(weirdId);
    expect(buildElementSelector(weirdId)).toBe(`[data-element-id="${escaped}"]`);
    expect(buildElementSelector(weirdId)).not.toBe(`[data-element-id="${weirdId}"]`);
  });

  it("finds elements with special-character ids safely", () => {
    const container = document.createElement("div");
    const node = document.createElement("div");
    node.dataset.elementId = 'el["weird"]';
    container.appendChild(node);

    expect(queryElementById(container, 'el["weird"]')).toBe(node);
  });
});
