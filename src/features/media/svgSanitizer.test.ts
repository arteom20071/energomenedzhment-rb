import { describe, expect, it } from "vitest";

import { sanitizeSvg } from "./svgSanitizer";

const SVG_NS = "http://www.w3.org/2000/svg";

const SAFE_SVG = `<svg xmlns="${SVG_NS}" width="100" height="50"><rect fill="#6366f1" width="100" height="50"/></svg>`;

describe("sanitizeSvg allowlist boundary", () => {
  it("accepts safe paths, gradients, and text", () => {
    const svg = `<svg xmlns="${SVG_NS}" width="120" height="80" viewBox="0 0 120 80">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#6366f1"/>
          <stop offset="1" stop-color="#312e81"/>
        </linearGradient>
      </defs>
      <path d="M10 10 H110 V70 H10 Z" fill="url-not-used"/>
      <text x="10" y="40" fill="#f8fafc">Безопасный текст</text>
    </svg>`.replace('fill="url-not-used"', 'fill="#6366f1"');

    const result = sanitizeSvg(svg);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.svg).toContain("<linearGradient");
      expect(result.svg).toContain("<text");
    }
  });

  it("rejects prefixed foreign namespace script elements", () => {
    const svg = `<svg xmlns="${SVG_NS}" xmlns:s="http://evil.example" width="10" height="10"><s:script>alert(1)</s:script></svg>`;
    expect(sanitizeSvg(svg).success).toBe(false);
  });

  it("rejects foreign namespace unprefixed elements", () => {
    const svg = `<svg xmlns="${SVG_NS}" width="10" height="10"><foreignTag xmlns="http://evil.example"/></svg>`;
    expect(sanitizeSvg(svg).success).toBe(false);
  });

  it("rejects fill=url(http) in attributes", () => {
    const svg = `<svg xmlns="${SVG_NS}" width="10" height="10"><rect fill="url(http://evil.example/x)" width="10" height="10"/></svg>`;
    const result = sanitizeSvg(svg);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/небезопасн|url/i);
    }
  });

  it("rejects fill=url(#fragment) references", () => {
    const svg = `<svg xmlns="${SVG_NS}" width="10" height="10"><rect fill="url(#grad)" width="10" height="10"/></svg>`;
    expect(sanitizeSvg(svg).success).toBe(false);
  });

  it("rejects SMIL set elements", () => {
    const svg = `<svg xmlns="${SVG_NS}" width="10" height="10"><set attributeName="x" to="100"/></svg>`;
    expect(sanitizeSvg(svg).success).toBe(false);
  });

  it("rejects animate elements", () => {
    const svg = `<svg xmlns="${SVG_NS}" width="10" height="10"><animate attributeName="opacity" from="0" to="1"/></svg>`;
    expect(sanitizeSvg(svg).success).toBe(false);
  });

  it("rejects use and image tags explicitly", () => {
    expect(
      sanitizeSvg(`<svg xmlns="${SVG_NS}" width="10" height="10"><use href="#x"/></svg>`).success,
    ).toBe(false);
    expect(
      sanitizeSvg(`<svg xmlns="${SVG_NS}" width="10" height="10"><image href="x.png"/></svg>`).success,
    ).toBe(false);
  });

  it("rejects unknown attributes with mixed case", () => {
    const svg = `<svg xmlns="${SVG_NS}" width="10" height="10"><rect UnknownAttr="1" width="10" height="10"/></svg>`;
    expect(sanitizeSvg(svg).success).toBe(false);
  });

  it("rejects prefixed attributes", () => {
    const svg = `<svg xmlns="${SVG_NS}" xmlns:xlink="http://www.w3.org/1999/xlink" width="10" height="10"><rect xlink:title="x" width="10" height="10"/></svg>`;
    expect(sanitizeSvg(svg).success).toBe(false);
  });

  it("rejects percentage dimensions", () => {
    const svg = `<svg xmlns="${SVG_NS}" width="100%" height="50"><rect width="10" height="10"/></svg>`;
    const result = sanitizeSvg(svg);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/размер/i);
    }
  });

  it("rejects viewBox tokens with px suffix", () => {
    const svg = `<svg xmlns="${SVG_NS}" viewBox="0 0 100px 100"><rect width="10" height="10"/></svg>`;
    const result = sanitizeSvg(svg);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/размер|viewBox/i);
    }
  });

  it("rejects dimension suffix garbage", () => {
    const svg = `<svg xmlns="${SVG_NS}" width="100px2" height="50"><rect width="10" height="10"/></svg>`;
    expect(sanitizeSvg(svg).success).toBe(false);
  });

  it("accepts px suffix and exponent dimensions", () => {
    const svg = `<svg xmlns="${SVG_NS}" width="1.5e2px" height="50"><rect width="10" height="10"/></svg>`;
    const result = sanitizeSvg(svg);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.width).toBe(150);
      expect(result.height).toBe(50);
    }
  });

  it("rejects zero and negative explicit dimensions", () => {
    expect(sanitizeSvg(`<svg xmlns="${SVG_NS}" width="0" height="10"></svg>`).success).toBe(false);
    expect(sanitizeSvg(`<svg xmlns="${SVG_NS}" width="-5" height="10"></svg>`).success).toBe(false);
  });

  it("no longer allows use href fragment references", () => {
    const svg = `<svg xmlns="${SVG_NS}" width="10" height="10"><defs><rect id="r" width="10" height="10"/></defs><use href="#r"/></svg>`;
    expect(sanitizeSvg(svg).success).toBe(false);
  });
});

describe("sanitizeSvg legacy bypass cases", () => {
  it("accepts safe simple SVG baseline", () => {
    const result = sanitizeSvg(SAFE_SVG);
    expect(result.success).toBe(true);
  });

  it("rejects root onload handler", () => {
    const result = sanitizeSvg(
      `<svg xmlns="${SVG_NS}" onload="alert(1)" width="10" height="10"></svg>`,
    );
    expect(result.success).toBe(false);
  });

  it("rejects mixed-case script tags", () => {
    const result = sanitizeSvg(`<svg xmlns="${SVG_NS}"><ScRiPt>alert(1)</ScRiPt></svg>`);
    expect(result.success).toBe(false);
  });

  it("rejects style elements", () => {
    const result = sanitizeSvg(
      `<svg xmlns="${SVG_NS}"><style>.x{}</style><rect width="10" height="10"/></svg>`,
    );
    expect(result.success).toBe(false);
  });
});
