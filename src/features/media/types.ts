export interface MediaAsset {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  createdAt: string;
}

export interface MediaRepository {
  list(): Promise<MediaAsset[]>;
  getPreviewUrl(assetId: string): Promise<string | null>;
  releasePreviewUrl(assetId: string, url: string): void | Promise<void>;
  delete(assetId: string): Promise<void>;
}

export interface UnsplashProvider {
  isConfigured(): boolean;
  search?(query: string): Promise<unknown[]>;
}

export interface ValidatedMediaFile {
  blob: Blob;
  mimeType: string;
  filename: string;
  width: number;
  height: number;
}

export type MediaValidationResult =
  | { success: true; file: ValidatedMediaFile }
  | { success: false; error: string };

export interface ImageDimensionDecoder {
  decode(blob: Blob, mimeType: string): Promise<{ width: number; height: number }>;
}
