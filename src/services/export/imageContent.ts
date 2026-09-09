import type { StoredAsset } from "../persistence/assetRepository";

export type AssetResolver = (reference: string) => Promise<string | null>;

export interface ImageValidationOptions {
  trustedSvg?: boolean;
}

const SAFE_DATA_URL_PATTERN =
  /^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,([A-Za-z0-9+/=\s]+)$/i;

const UNSAFE_REFERENCE_PREFIXES = ["blob:", "http://", "https://", "//", "/"];

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const GIF87_SIGNATURE = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61];
const GIF89_SIGNATURE = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];

function decodeBase64(base64: string): Uint8Array | null {
  const normalized = base64.replace(/\s/g, "");
  if (normalized.length === 0 || normalized.length % 4 !== 0) {
    return null;
  }

  try {
    if (typeof atob === "function") {
      const binary = atob(normalized);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      return bytes;
    }
  } catch {
    return null;
  }

  return null;
}

function bytesMatch(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) {
    return false;
  }
  return signature.every((value, index) => bytes[index] === value);
}

function isWebp(bytes: Uint8Array): boolean {
  if (bytes.length < 12) {
    return false;
  }
  return (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

function decodeUtf8(bytes: Uint8Array): string {
  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  }
  return String.fromCharCode(...bytes);
}

export function isSafeStaticSvg(content: string): boolean {
  const trimmed = content.trim();
  if (!/<svg\b/i.test(trimmed)) {
    return false;
  }

  const lower = trimmed.toLowerCase();
  if (
    lower.includes("<script") ||
    lower.includes("javascript:") ||
    lower.includes("@import") ||
    lower.includes("<foreignobject") ||
    /\son[a-z]+\s*=/.test(lower)
  ) {
    return false;
  }

  return true;
}

export function detectImageMime(bytes: Uint8Array): string | null {
  if (bytesMatch(bytes, PNG_SIGNATURE)) {
    return "image/png";
  }
  if (bytesMatch(bytes, JPEG_SIGNATURE)) {
    return "image/jpeg";
  }
  if (bytesMatch(bytes, GIF87_SIGNATURE) || bytesMatch(bytes, GIF89_SIGNATURE)) {
    return "image/gif";
  }
  if (isWebp(bytes)) {
    return "image/webp";
  }

  try {
    const text = decodeUtf8(bytes);
    if (isSafeStaticSvg(text)) {
      return "image/svg+xml";
    }
  } catch {
    return null;
  }

  return null;
}

function mimeToDataUrlPrefix(mime: string): string {
  switch (mime) {
    case "image/png":
      return "data:image/png;base64,";
    case "image/jpeg":
      return "data:image/jpeg;base64,";
    case "image/gif":
      return "data:image/gif;base64,";
    case "image/webp":
      return "data:image/webp;base64,";
    case "image/svg+xml":
      return "data:image/svg+xml;base64,";
    default:
      return "";
  }
}

function normalizeMime(mime: string): string {
  return mime.split(";")[0]?.trim().toLowerCase() ?? "";
}

export function validateImageBytes(
  declaredMime: string,
  bytes: Uint8Array,
  options: ImageValidationOptions = {},
): boolean {
  const detected = detectImageMime(bytes);
  if (!detected) {
    if (options.trustedSvg && normalizeMime(declaredMime) === "image/svg+xml") {
      try {
        return isSafeStaticSvg(decodeUtf8(bytes));
      } catch {
        return false;
      }
    }
    return false;
  }

  const normalizedDeclared = normalizeMime(declaredMime);
  if (normalizedDeclared && normalizedDeclared !== detected) {
    return false;
  }

  if (detected === "image/svg+xml" && !options.trustedSvg) {
    try {
      return isSafeStaticSvg(decodeUtf8(bytes));
    } catch {
      return false;
    }
  }

  return true;
}

export function validateDataUrl(
  value: string,
  options: ImageValidationOptions = {},
): boolean {
  const match = SAFE_DATA_URL_PATTERN.exec(value.trim());
  if (!match) {
    return false;
  }

  const mimeKey = match[1]?.toLowerCase() ?? "";
  const declared =
    mimeKey === "jpeg"
      ? "image/jpeg"
      : mimeKey === "svg+xml"
        ? "image/svg+xml"
        : `image/${mimeKey}`;

  const bytes = decodeBase64(match[2] ?? "");
  if (!bytes) {
    return false;
  }

  return validateImageBytes(declared, bytes, options);
}

export function isSafeImageDataUrl(value: string, options?: ImageValidationOptions): boolean {
  return validateDataUrl(value, options);
}

export function isUnresolvedImageReference(value: string, options?: ImageValidationOptions): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return true;
  }

  if (trimmed.startsWith("asset://")) {
    return true;
  }

  if (UNSAFE_REFERENCE_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
    return true;
  }

  if (trimmed.startsWith("data:")) {
    return !isSafeImageDataUrl(trimmed, options);
  }

  return true;
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  const buffer = await blob.arrayBuffer();
  return new Uint8Array(buffer);
}

export async function storedAssetToDataUrl(
  asset: StoredAsset,
  options: ImageValidationOptions = {},
): Promise<string | null> {
  const bytes = await blobToBytes(asset.blob);
  if (!validateImageBytes(asset.metadata.mimeType, bytes, options)) {
    return null;
  }

  const detected = detectImageMime(bytes);
  const mime = detected ?? normalizeMime(asset.metadata.mimeType);
  const prefix = mimeToDataUrlPrefix(mime);
  if (!prefix) {
    return null;
  }

  return `${prefix}${encodeBase64(bytes)}`;
}

export function createStoredAssetResolver(
  getAsset: (assetId: string) => Promise<StoredAsset | undefined>,
  options: ImageValidationOptions = {},
): AssetResolver {
  return async (reference: string) => {
    const assetId = reference.startsWith("asset://")
      ? reference.slice("asset://".length)
      : reference;
    const asset = await getAsset(assetId);
    if (!asset) {
      return null;
    }
    return storedAssetToDataUrl(asset, options);
  };
}

export async function resolveImageContent(
  content: string | undefined,
  resolveAsset: AssetResolver,
  path: string,
  options: ImageValidationOptions = {},
): Promise<{ success: true; value: string } | { success: false; error: string }> {
  if (content === undefined || content.trim().length === 0) {
    return {
      success: false,
      error: `${path}: изображение не содержит данных`,
    };
  }

  const trimmed = content.trim();

  if (isSafeImageDataUrl(trimmed, options)) {
    return { success: true, value: trimmed };
  }

  if (trimmed.startsWith("data:")) {
    return {
      success: false,
      error: `${path}: небезопасный или некорректный data URL изображения`,
    };
  }

  const assetId = trimmed.startsWith("asset://") ? trimmed.slice("asset://".length) : null;
  if (assetId || trimmed.startsWith("blob:")) {
    const resolved = await resolveAsset(trimmed);
    if (!resolved || !isSafeImageDataUrl(resolved, options)) {
      return {
        success: false,
        error: `${path}: не удалось разрешить ссылку на изображение (${trimmed})`,
      };
    }
    return { success: true, value: resolved };
  }

  if (UNSAFE_REFERENCE_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
    return {
      success: false,
      error: `${path}: недопустимая ссылка на изображение (${trimmed})`,
    };
  }

  return {
    success: false,
    error: `${path}: небезопасный или некорректный data URL изображения`,
  };
}
