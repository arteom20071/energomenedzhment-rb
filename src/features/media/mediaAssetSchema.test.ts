import { describe, expect, it } from "vitest";

import {
  mediaAssetSchema,
  parseMediaAsset,
  parseMediaAssets,
  safeParseMediaAssets,
} from "./mediaAssetSchema";

const validAsset = {
  id: "asset-1",
  filename: "photo.png",
  mimeType: "image/png",
  sizeBytes: 1024,
  width: 800,
  height: 600,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("mediaAssetSchema", () => {
  it("accepts valid media asset metadata", () => {
    expect(parseMediaAsset(validAsset)).toEqual(validAsset);
  });

  it("rejects unknown keys", () => {
    expect(() =>
      mediaAssetSchema.parse({ ...validAsset, extra: true }),
    ).toThrow();
  });

  it("rejects invalid mime types", () => {
    expect(() =>
      parseMediaAsset({ ...validAsset, mimeType: "image/gif" }),
    ).toThrow();
  });

  it("rejects non-positive dimensions", () => {
    expect(() => parseMediaAsset({ ...validAsset, width: 0 })).toThrow();
  });

  it("requires strict ISO datetime for createdAt", () => {
    expect(() =>
      parseMediaAsset({ ...validAsset, createdAt: "2026-01-01" }),
    ).toThrow();
    expect(() =>
      parseMediaAsset({ ...validAsset, createdAt: "not-a-date" }),
    ).toThrow();
  });

  it("validates repository list payloads", () => {
    expect(parseMediaAssets([validAsset])).toHaveLength(1);
    expect(() => parseMediaAssets([{ ...validAsset, id: "" }])).toThrow();
  });

  it("rejects duplicate asset IDs with precise path", () => {
    const duplicate = safeParseMediaAssets([
      validAsset,
      { ...validAsset, filename: "other.png" },
    ]);

    expect(duplicate.success).toBe(false);
    if (!duplicate.success) {
      expect(duplicate.error).toMatch(/\[1\]\.id/);
      expect(duplicate.error).toMatch(/\[0\]\.id/);
      expect(duplicate.error).toMatch(/duplicate/i);
    }
  });
});
