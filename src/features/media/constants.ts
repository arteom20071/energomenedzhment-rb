export const MAX_MEDIA_FILE_SIZE_BYTES = 15 * 1024 * 1024;

export const ACCEPTED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
] as const;

export type AcceptedMimeType = (typeof ACCEPTED_MIME_TYPES)[number];

export const ACCEPTED_FORMATS_LABEL =
  "PNG, JPEG, WebP, SVG · максимум 15 МБ";

const EXTENSION_TO_MIME: Record<string, AcceptedMimeType> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export function inferMimeFromFilename(filename: string): AcceptedMimeType | null {
  const lower = filename.toLowerCase();
  for (const [extension, mimeType] of Object.entries(EXTENSION_TO_MIME)) {
    if (lower.endsWith(extension)) {
      return mimeType;
    }
  }
  return null;
}

export function extensionMatchesMime(filename: string, mimeType: string): boolean {
  const inferred = inferMimeFromFilename(filename);
  if (!inferred) {
    return false;
  }
  return inferred === mimeType;
}
