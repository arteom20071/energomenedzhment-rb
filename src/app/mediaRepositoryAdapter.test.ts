import { describe, expect, it } from "vitest";

import { FakeIdbFacade, createAssetRepository } from "../services/persistence";
import { AssetUrlCache } from "../services/persistence/assetUrlCache";
import { createMediaRepositoryAdapter, fitImageSize } from "./mediaRepositoryAdapter";

describe("createMediaRepositoryAdapter", () => {
  it("lists assets and issues preview URLs through the cache", async () => {
    const assets = createAssetRepository(new FakeIdbFacade());
    const cache = new AssetUrlCache();
    const repository = createMediaRepositoryAdapter(assets, cache);
    await assets.save({
      metadata: {
        id: "photo",
        mimeType: "image/png",
        byteSize: 4,
        filename: "photo.png",
        width: 20,
        height: 10,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      blob: new Blob(["data"], { type: "image/png" }),
    });

    const list = await repository.list();
    expect(list).toEqual([
      expect.objectContaining({
        id: "photo",
        filename: "photo.png",
        sizeBytes: 4,
        width: 20,
        height: 10,
      }),
    ]);

    const url = await repository.getPreviewUrl("photo");
    expect(url).toMatch(/^blob:/);
    repository.releasePreviewUrl("photo", url!);
    expect(cache.size()).toBe(0);
  });
});

describe("fitImageSize", () => {
  it("scales large images down and keeps small images as-is", () => {
    expect(fitImageSize(1920, 1080)).toEqual({ width: 960, height: 540 });
    expect(fitImageSize(200, 100)).toEqual({ width: 200, height: 100 });
    expect(fitImageSize(0, 0)).toEqual({ width: 480, height: 270 });
  });
});
