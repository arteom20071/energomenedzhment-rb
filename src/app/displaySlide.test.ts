import { describe, expect, it } from "vitest";

import { createImageElement, createSlide } from "../domain/factories";
import { toAssetReference } from "../services/persistence/assetRepository";
import { AssetUrlCache } from "../services/persistence/assetUrlCache";
import { FakeIdbFacade, createAssetRepository } from "../services/persistence";
import { releaseDisplayUrls, resolveDisplaySlide } from "./displaySlide";

describe("resolveDisplaySlide", () => {
  it("replaces asset:// content with an object URL and leaves public paths intact", async () => {
    const idb = new FakeIdbFacade();
    const assets = createAssetRepository(idb);
    const cache = new AssetUrlCache();
    const blob = new Blob(["png"], { type: "image/png" });
    await assets.save({
      metadata: {
        id: "img-1",
        mimeType: "image/png",
        byteSize: 3,
        filename: "a.png",
        width: 10,
        height: 10,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      blob,
    });

    const slide = createSlide([
      createImageElement([], { content: toAssetReference("img-1") }),
      createImageElement([], { content: "assets/images/slide-1-schema.svg" }),
    ]);

    const resolved = await resolveDisplaySlide(slide, assets, cache);
    expect(resolved.slide.elements[0]?.content).toMatch(/^blob:/);
    expect(resolved.slide.elements[1]?.content).toBe("assets/images/slide-1-schema.svg");
    expect(resolved.urls).toHaveLength(1);

    releaseDisplayUrls(resolved.urls, cache);
    expect(cache.size()).toBe(0);
  });
});
