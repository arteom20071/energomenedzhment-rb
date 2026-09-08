export class AssetUrlCache {
  private readonly urls = new Map<string, string>();
  private readonly refCounts = new Map<string, number>();
  private readonly blobs = new Map<string, Blob>();

  get(assetId: string): string | undefined {
    return this.urls.get(assetId);
  }

  acquire(assetId: string, blob: Blob): string {
    const existingBlob = this.blobs.get(assetId);
    const existingUrl = this.urls.get(assetId);

    if (existingUrl && existingBlob && existingBlob !== blob) {
      URL.revokeObjectURL(existingUrl);
      this.urls.delete(assetId);
      this.refCounts.delete(assetId);
      this.blobs.delete(assetId);
    }

    if (existingUrl && existingBlob === blob) {
      this.refCounts.set(assetId, (this.refCounts.get(assetId) ?? 0) + 1);
      return existingUrl;
    }

    const url = URL.createObjectURL(blob);
    this.urls.set(assetId, url);
    this.blobs.set(assetId, blob);
    this.refCounts.set(assetId, 1);
    return url;
  }

  release(assetId: string): void {
    const count = this.refCounts.get(assetId) ?? 0;
    if (count <= 1) {
      const url = this.urls.get(assetId);
      if (url) {
        URL.revokeObjectURL(url);
      }
      this.urls.delete(assetId);
      this.refCounts.delete(assetId);
      this.blobs.delete(assetId);
      return;
    }

    this.refCounts.set(assetId, count - 1);
  }

  revokeAll(): void {
    for (const url of this.urls.values()) {
      URL.revokeObjectURL(url);
    }
    this.urls.clear();
    this.refCounts.clear();
    this.blobs.clear();
  }

  size(): number {
    return this.urls.size;
  }
}

export const assetUrlCache = new AssetUrlCache();
