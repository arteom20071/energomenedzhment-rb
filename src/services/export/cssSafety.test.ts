import { describe, expect, it } from "vitest";

import {
  buildStyleAttribute,
  escapeHtmlAttribute,
  serializeFontFamilyForCss,
} from "./cssSafety";

describe("cssSafety HTML serialization", () => {
  it("escapes the entire assembled style attribute", () => {
    const style = buildStyleAttribute({
      color: "red",
      "font-family": serializeFontFamilyForCss('Evil "breakout"', "Inter"),
    });

    expect(style).toContain("&quot;");
    expect(style).not.toMatch(/"breakout";/);
  });

  it("quotes font families with spaces and escapes embedded quotes", () => {
    const value = serializeFontFamilyForCss('Times "New Roman"', "Inter");
    expect(value).toContain('"Times \\"New Roman\\""');
  });

  it("parses in DOM without injecting extra attributes", () => {
    const style = buildStyleAttribute({
      color: "#111827",
      "font-family": serializeFontFamilyForCss("Inter, sans-serif", "Inter"),
      "font-size": "32px",
    });
    const html = `<div id="probe" style="${style}"></div>`;
    const doc = new DOMParser().parseFromString(html, "text/html");
    const node = doc.getElementById("probe");

    expect(node).not.toBeNull();
    expect(node?.getAttribute("style")).toContain("font-size:32px");
    expect(node?.getAttribute("style")).toContain("color:#111827");
    expect(node?.attributes.length).toBe(2);
  });

  it("escapeHtmlAttribute handles backslashes in values", () => {
    expect(escapeHtmlAttribute('foo\\bar"baz')).toContain("&quot;");
  });
});
