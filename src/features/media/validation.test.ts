import { describe, expect, it, vi } from "vitest";

import type { ImageDimensionDecoder } from "./types";
import {
  ACCEPTED_FORMATS_LABEL,
  MAX_MEDIA_FILE_SIZE_BYTES,
  validateMediaFile,
} from "./validation";
import { sanitizeSvg } from "./svgSanitizer";

function createFile(content: BlobPart, name: string, type: string): File {
  return new File([content], name, { type });
}

const mockDecoder: ImageDimensionDecoder = {
  decode: vi.fn(async () => ({ width: 800, height: 600 })),
};

describe("validateMediaFile", () => {
  it("accepts PNG with valid MIME and decodes dimensions", async () => {
    const file = createFile("png-bytes", "photo.png", "image/png");
    const result = await validateMediaFile(file, mockDecoder);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.file.mimeType).toBe("image/png");
      expect(result.file.width).toBe(800);
      expect(result.file.height).toBe(600);
    }
  });

  it("rejects unsupported MIME with a Russian error", async () => {
    const file = createFile("data", "file.gif", "image/gif");
    const result = await validateMediaFile(file, mockDecoder);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/неподдерживаем/i);
      expect(result.error).toMatch(/PNG|JPEG|WebP|SVG/i);
    }
  });

  it("rejects files larger than 15 MB", async () => {
    const bytes = new Uint8Array(MAX_MEDIA_FILE_SIZE_BYTES + 1);
    const file = createFile(bytes, "large.png", "image/png");
    const result = await validateMediaFile(file, mockDecoder);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/15\s*МБ/i);
    }
  });

  it("uses extension as secondary check when MIME is empty", async () => {
    const file = createFile("png-bytes", "photo.png", "");
    const result = await validateMediaFile(file, mockDecoder);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.file.mimeType).toBe("image/png");
    }
  });

  it("accepts supported declared MIME regardless of extension", async () => {
    const file = createFile("png-bytes", "photo.exe", "image/png");
    const result = await validateMediaFile(file, mockDecoder);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.file.mimeType).toBe("image/png");
    }
  });

  it("rejects unsupported declared MIME even when extension matches png", async () => {
    const file = createFile("data", "photo.png", "image/gif");
    const result = await validateMediaFile(file, mockDecoder);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/неподдерживаем/i);
    }
  });

  it("rejects non-image declared MIME with png extension", async () => {
    const file = createFile("data", "photo.png", "text/plain");
    const result = await validateMediaFile(file, mockDecoder);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/неподдерживаем/i);
    }
  });

  it("rejects empty MIME when filename has no known extension", async () => {
    const file = createFile("data", "photo.bin", "");
    const result = await validateMediaFile(file, mockDecoder);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/неподдерживаем/i);
    }
  });

  it("returns Russian error when decoder fails", async () => {
    const file = createFile("bad", "photo.png", "image/png");
    const failingDecoder: ImageDimensionDecoder = {
      decode: vi.fn(async () => {
        throw new Error("decode failed");
      }),
    };

    const result = await validateMediaFile(file, failingDecoder);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/декодир/i);
    }
  });

  it("rejects SVG containing script tags", async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
    const file = createFile(svg, "icon.svg", "image/svg+xml");
    const result = await validateMediaFile(file, mockDecoder);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/script/i);
    }
  });

  it("rejects SVG with event handler attributes", async () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><rect onclick="alert(1)" width="10" height="10"/></svg>';
    const file = createFile(svg, "icon.svg", "image/svg+xml");
    const result = await validateMediaFile(file, mockDecoder);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/обработчик/i);
    }
  });

  it("rejects SVG with external href references", async () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><a href="https://evil.example/x"><rect width="10" height="10"/></a></svg>';
    const file = createFile(svg, "icon.svg", "image/svg+xml");
    const result = await validateMediaFile(file, mockDecoder);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/внешн/i);
    }
  });

  it("rejects SVG with foreignObject", async () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div>html</div></foreignObject></svg>';
    const file = createFile(svg, "icon.svg", "image/svg+xml");
    const result = await validateMediaFile(file, mockDecoder);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/foreignObject/i);
    }
  });

  it("accepts safe inline SVG and stores sanitized blob only", async () => {
    const svg =
      '\n  <svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect fill="#6366f1" width="100" height="50"/></svg>\n';
    const file = createFile(svg, "icon.svg", "image/svg+xml");
    const result = await validateMediaFile(file, mockDecoder);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.file.width).toBe(100);
      expect(result.file.height).toBe(50);
      const stored = await result.file.blob.text();
      expect(stored).toContain('width="100"');
      expect(stored).not.toContain("<script");
      const sanitized = sanitizeSvg(svg);
      expect(sanitized.success).toBe(true);
      if (sanitized.success) {
        expect(stored).toBe(sanitized.svg);
      }
    }
  });

  it("rejects SVG without valid dimensions", async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>';
    const file = createFile(svg, "icon.svg", "image/svg+xml");
    const result = await validateMediaFile(file, mockDecoder);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/размер/i);
    }
  });
});

describe("ACCEPTED_FORMATS_LABEL", () => {
  it("lists PNG, JPEG, WebP, SVG and 15 MB limit", () => {
    expect(ACCEPTED_FORMATS_LABEL).toMatch(/PNG/i);
    expect(ACCEPTED_FORMATS_LABEL).toMatch(/JPEG/i);
    expect(ACCEPTED_FORMATS_LABEL).toMatch(/WebP/i);
    expect(ACCEPTED_FORMATS_LABEL).toMatch(/SVG/i);
    expect(ACCEPTED_FORMATS_LABEL).toMatch(/15\s*МБ/i);
  });
});
