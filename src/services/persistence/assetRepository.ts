export interface AssetMetadata {
  id: string;
  mimeType: string;
  byteSize: number;
  filename: string;
  width?: number;
  height?: number;
  createdAt: string;
}

export interface StoredAsset {
  metadata: AssetMetadata;
  blob: Blob;
}

export interface AssetRepository {
  save(asset: StoredAsset): Promise<void>;
  get(id: string): Promise<StoredAsset | undefined>;
  delete(id: string): Promise<void>;
  list(): Promise<AssetMetadata[]>;
}

export const ASSET_SCHEME = "asset://";

export function toAssetReference(assetId: string): string {
  return `${ASSET_SCHEME}${assetId}`;
}

export function parseAssetReference(reference: string): string | null {
  if (!reference.startsWith(ASSET_SCHEME)) {
    return null;
  }
  const id = reference.slice(ASSET_SCHEME.length);
  return id.length > 0 ? id : null;
}
