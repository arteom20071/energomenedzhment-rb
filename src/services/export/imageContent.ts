import { parseAssetReference } from "../persistence/assetRepository";

export type AssetResolver = (reference: string) => Promise<string | null>;

const SAFE_DATA_URL_PATTERN =
  /^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,([A-Za-z0-9+/=\s]+)$/;

const UNSAFE_REFERENCE_PREFIXES = ["blob:", "http://", "https://", "//", "/"];

export function isSafeImageDataUrl(value: string): boolean {
  const match = SAFE_DATA_URL_PATTERN.exec(value.trim());
  if (!match) {
    return false;
  }

  const base64 = match[2]?.replace(/\s/g, "") ?? "";
  if (base64.length === 0 || base64.length % 4 !== 0) {
    return false;
  }

  try {
    if (typeof atob === "function") {
      atob(base64);
    }
    return true;
  } catch {
    return false;
  }
}

export function isUnresolvedImageReference(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return true;
  }

  if (parseAssetReference(trimmed)) {
    return true;
  }

  if (UNSAFE_REFERENCE_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
    return true;
  }

  if (trimmed.startsWith("data:") && !isSafeImageDataUrl(trimmed)) {
    return true;
  }

  if (!trimmed.startsWith("data:")) {
    return true;
  }

  return false;
}

export async function resolveImageContent(
  content: string | undefined,
  resolveAsset: AssetResolver,
  path: string,
): Promise<{ success: true; value: string } | { success: false; error: string }> {
  if (content === undefined || content.trim().length === 0) {
    return {
      success: false,
      error: `${path}: изображение не содержит данных`,
    };
  }

  const trimmed = content.trim();

  if (isSafeImageDataUrl(trimmed)) {
    return { success: true, value: trimmed };
  }

  if (trimmed.startsWith("data:")) {
    return {
      success: false,
      error: `${path}: небезопасный или некорректный data URL изображения`,
    };
  }

  const assetId = parseAssetReference(trimmed);
  if (assetId || trimmed.startsWith("blob:")) {
    const resolved = await resolveAsset(trimmed);
    if (!resolved || !isSafeImageDataUrl(resolved)) {
      return {
        success: false,
        error: `${path}: не удалось разрешить ссылку на изображение (${trimmed})`,
      };
    }
    return { success: true, value: resolved };
  }

  if (UNSAFE_REFERENCE_PREFIXES.some((prefix) => trimmed.startsWith(prefix)) || !trimmed.startsWith("data:")) {
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
