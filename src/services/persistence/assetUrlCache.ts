interface UrlEntry {
  assetId: string;
  url: string;
  blob: Blob;
  refCount: number;
}

export class AssetUrlCache {
  private readonly byUrl = new Map<string, UrlEntry>();
  private readonly latestByAsset = new Map<string, string>();

  get(assetId: string): string | undefined {
    const url = this.latestByAsset.get(assetId);
    return url;
  }

  acquire(assetId: string, blob: Blob): string {
    const latestUrl = this.latestByAsset.get(assetId);
    const latest = latestUrl ? this.byUrl.get(latestUrl) : undefined;

    if (latest && latest.blob === blob) {
      latest.refCount += 1;
      return latest.url;
    }

    const url = URL.createObjectURL(blob);
    this.byUrl.set(url, { assetId, url, blob, refCount: 1 });
    this.latestByAsset.set(assetId, url);
    return url;
  }

  release(url: string): void {
    const entry = this.byUrl.get(url);
    if (!entry) {
      return;
    }

    entry.refCount -= 1;
    if (entry.refCount > 0) {
      return;
    }

    URL.revokeObjectURL(url);
    this.byUrl.delete(url);

    if (this.latestByAsset.get(entry.assetId) === url) {
      this.latestByAsset.delete(entry.assetId);
    }
  }

  revokeAll(): void {
    for (const entry of this.byUrl.values()) {
      URL.revokeObjectURL(entry.url);
    }
    this.byUrl.clear();
    this.latestByAsset.clear();
  }

  size(): number {
    return this.byUrl.size;
  }

  getRefCount(url: string): number {
    return this.byUrl.get(url)?.refCount ?? 0;
  }
}

export const assetUrlCache = new AssetUrlCache();
