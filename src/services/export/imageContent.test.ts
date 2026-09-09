import { describe, expect, it } from "vitest";

import {
  detectImageMime,
  isSafeImageDataUrl,
  isSafeStaticSvg,
  storedAssetToDataUrl,
  validateDataUrl,
  validateImageBytes,
} from "./imageContent";
import type { StoredAsset } from "../persistence/assetRepository";

const VALID_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const MINIMAL_PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]);

const MINIMAL_JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

describe("imageContent integrity", () => {
  it("rejects base64 that does not match declared PNG magic", () => {
    expect(isSafeImageDataUrl("data:image/png;base64,SGVsbG8=")).toBe(false);
    expect(validateDataUrl("data:image/png;base64,SGVsbG8=")).toBe(false);
  });

  it("detects PNG and JPEG signatures from bytes", () => {
    expect(detectImageMime(MINIMAL_PNG_BYTES)).toBe("image/png");
    expect(detectImageMime(MINIMAL_JPEG_BYTES)).toBe("image/jpeg");
    expect(validateImageBytes("image/png", MINIMAL_PNG_BYTES)).toBe(true);
    expect(validateImageBytes("image/jpeg", MINIMAL_PNG_BYTES)).toBe(false);
  });

  it("accepts validated real minimal PNG data URL", () => {
    expect(isSafeImageDataUrl(VALID_PNG)).toBe(true);
  });

  it("rejects unsafe SVG unless trusted resolver marks safe", () => {
    const unsafeSvg = "<svg><script>alert(1)</script></svg>";
    const bytes = new TextEncoder().encode(unsafeSvg);
    expect(isSafeStaticSvg(unsafeSvg)).toBe(false);
    expect(validateImageBytes("image/svg+xml", bytes)).toBe(false);
    expect(validateImageBytes("image/svg+xml", bytes, { trustedSvg: true })).toBe(false);
  });

  it("accepts safe static SVG bytes", () => {
    const safeSvg = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>';
    const bytes = new TextEncoder().encode(safeSvg);
    expect(isSafeStaticSvg(safeSvg)).toBe(true);
    expect(validateImageBytes("image/svg+xml", bytes)).toBe(true);
  });

  it("converts StoredAsset blob to validated data URL", async () => {
    const asset: StoredAsset = {
      metadata: {
        id: "img-1",
        mimeType: "image/png",
        byteSize: MINIMAL_PNG_BYTES.length,
        filename: "dot.png",
        createdAt: new Date().toISOString(),
      },
      blob: new Blob([MINIMAL_PNG_BYTES], { type: "image/png" }),
    };

    const dataUrl = await storedAssetToDataUrl(asset);
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(isSafeImageDataUrl(dataUrl!)).toBe(true);
  });

  it("rejects StoredAsset when blob type mismatches magic", async () => {
    const asset: StoredAsset = {
      metadata: {
        id: "img-2",
        mimeType: "image/jpeg",
        byteSize: MINIMAL_PNG_BYTES.length,
        filename: "bad.jpg",
        createdAt: new Date().toISOString(),
      },
      blob: new Blob([MINIMAL_PNG_BYTES], { type: "image/jpeg" }),
    };

    expect(await storedAssetToDataUrl(asset)).toBeNull();
  });
});
