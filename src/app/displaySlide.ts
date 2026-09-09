import type { Slide } from "../domain/presentation";
import {
  parseAssetReference,
  type AssetRepository,
} from "../services/persistence/assetRepository";
import type { AssetUrlCache } from "../services/persistence/assetUrlCache";

export async function resolveDisplaySlide(
  slide: Slide,
  assets: AssetRepository,
  cache: AssetUrlCache,
): Promise<{ slide: Slide; urls: string[] }> {
  const urls: string[] = [];
  const elements = [];

  for (const element of slide.elements) {
    if (element.type !== "image" || !element.content) {
      elements.push(element);
      continue;
    }

    const assetId = parseAssetReference(element.content);
    if (!assetId) {
      elements.push(element);
      continue;
    }

    const stored = await assets.get(assetId);
    if (!stored) {
      elements.push(element);
      continue;
    }

    const url = cache.acquire(assetId, stored.blob);
    urls.push(url);
    elements.push({ ...element, content: url });
  }

  return { slide: { ...slide, elements }, urls };
}

export function releaseDisplayUrls(urls: string[], cache: AssetUrlCache): void {
  for (const url of urls) {
    cache.release(url);
  }
}
