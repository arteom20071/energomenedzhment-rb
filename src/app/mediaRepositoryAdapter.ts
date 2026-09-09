import type { MediaAsset, MediaRepository } from "../features/media/types";
import type { AssetRepository } from "../services/persistence/assetRepository";
import type { AssetUrlCache } from "../services/persistence/assetUrlCache";

export function createMediaRepositoryAdapter(
  assets: AssetRepository,
  cache: AssetUrlCache,
): MediaRepository {
  return {
    async list(): Promise<MediaAsset[]> {
      const metadata = await assets.list();
      return metadata.map((item) => ({
        id: item.id,
        filename: item.filename,
        mimeType: item.mimeType,
        sizeBytes: item.byteSize,
        width: item.width ?? 0,
        height: item.height ?? 0,
        createdAt: item.createdAt,
      }));
    },

    async getPreviewUrl(assetId: string): Promise<string | null> {
      const stored = await assets.get(assetId);
      if (!stored) {
        return null;
      }
      return cache.acquire(assetId, stored.blob);
    },

    releasePreviewUrl(_assetId: string, url: string): void {
      cache.release(url);
    },

    async delete(assetId: string): Promise<void> {
      await assets.delete(assetId);
    },
  };
}

export function fitImageSize(
  width: number,
  height: number,
  maxWidth = 960,
  maxHeight = 540,
): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: 480, height: 270 };
  }

  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
