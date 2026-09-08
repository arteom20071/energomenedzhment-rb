import { describe, expect, it } from "vitest";

import { sanitizeSvg } from "./svgSanitizer";

const SAFE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect fill="#6366f1" width="100" height="50"/></svg>';

describe("sanitizeSvg security boundary", () => {
  it("accepts safe simple SVG and returns serialized sanitized output", () => {
    const result = sanitizeSvg(SAFE_SVG);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.width).toBe(100);
      expect(result.height).toBe(50);
      expect(result.svg).toContain("<svg");
      expect(result.svg).toContain('width="100"');
    }
  });

  it("rejects root onload handler", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)" width="10" height="10"></svg>';
    const result = sanitizeSvg(svg);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/обработчик/i);
    }
  });

  it("rejects mixed-case event handler attributes", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect OnClick="evil()" width="10" height="10"/></svg>';
    const result = sanitizeSvg(svg);
    expect(result.success).toBe(false);
  });

  it("rejects mixed-case script tags", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><ScRiPt>alert(1)</ScRiPt></svg>';
    const result = sanitizeSvg(svg);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/script/i);
    }
  });

  it("rejects xlink namespace external references", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="http://evil.example/icon.svg"/></svg>';
    const result = sanitizeSvg(svg);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/внешн/i);
    }
  });

  it("rejects relative href references", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="./secret.png" width="10" height="10"/></svg>';
    const result = sanitizeSvg(svg);
    expect(result.success).toBe(false);
  });

  it("rejects file:// references", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><a href="file:///etc/passwd"><rect width="10" height="10"/></a></svg>';
    const result = sanitizeSvg(svg);
    expect(result.success).toBe(false);
  });

  it("rejects data:text/html references", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><a href="data:text/html,<script>alert(1)</script>"><rect width="10" height="10"/></a></svg>';
    const result = sanitizeSvg(svg);
    expect(result.success).toBe(false);
  });

  it("rejects style elements with url()", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><style>.x{background:url(http://evil.example/x)}</style><rect class="x" width="10" height="10"/></svg>';
    const result = sanitizeSvg(svg);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/style/i);
    }
  });

  it("rejects inline style attributes with @import", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><rect style="@import url(http://evil.example/x)" width="10" height="10"/></svg>';
    const result = sanitizeSvg(svg);
    expect(result.success).toBe(false);
  });

  it("rejects xml-stylesheet processing instructions in source", () => {
    const svg =
      '<?xml-stylesheet href="evil.css" type="text/css"?><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>';
    const result = sanitizeSvg(svg);
    expect(result.success).toBe(false);
  });

  it("rejects doctype declarations", () => {
    const svg =
      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>';
    const result = sanitizeSvg(svg);
    expect(result.success).toBe(false);
  });

  it("rejects malformed SVG with parser errors", () => {
    const result = sanitizeSvg("<svg><unclosed");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/разобрать|parser/i);
    }
  });

  it("allows local fragment references", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><defs><rect id="r" width="10" height="10"/></defs><use href="#r"/></svg>';
    const result = sanitizeSvg(svg);
    expect(result.success).toBe(true);
  });

  it("rejects missing dimensions without valid viewBox", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>';
    const result = sanitizeSvg(svg);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/размер/i);
    }
  });

  it("parses decimal and exponent dimensions from viewBox", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1.5e2 2e1"><rect width="10" height="10"/></svg>';
    const result = sanitizeSvg(svg);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.width).toBe(150);
      expect(result.height).toBe(20);
    }
  });

  it("stores sanitized serialized output distinct from original whitespace", async () => {
    const padded = `\n  ${SAFE_SVG}  \n`;
    const result = sanitizeSvg(padded);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.svg.trim()).toBeTruthy();
      expect(result.svg).not.toEqual(padded);
    }
  });
});
