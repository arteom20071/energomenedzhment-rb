import { z } from "zod";

import type { MediaAsset } from "./types";

const CANONICAL_UTC_ISO_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function isCanonicalUtcIsoTimestamp(value: string): boolean {
  if (!CANONICAL_UTC_ISO_PATTERN.test(value)) {
    return false;
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return false;
  }

  return parsed.toISOString() === value;
}

export const mediaAssetSchema = z
  .object({
    id: z.string().min(1),
    filename: z.string().min(1),
    mimeType: z.enum(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]),
    sizeBytes: z.number().finite().nonnegative(),
    width: z.number().finite().positive(),
    height: z.number().finite().positive(),
    createdAt: z
      .string()
      .refine(isCanonicalUtcIsoTimestamp, {
        message: "createdAt must be a canonical UTC ISO-8601 timestamp",
      }),
  })
  .strict();

function findDuplicateAssetId(assets: MediaAsset[]): string | null {
  const seen = new Map<string, number>();

  for (let index = 0; index < assets.length; index += 1) {
    const asset = assets[index]!;
    const previousIndex = seen.get(asset.id);
    if (previousIndex !== undefined) {
      return `[${index}].id: duplicate id "${asset.id}" (also used at [${previousIndex}].id)`;
    }
    seen.set(asset.id, index);
  }

  return null;
}

export function parseMediaAsset(input: unknown): MediaAsset {
  return mediaAssetSchema.parse(input);
}

export function parseMediaAssets(input: unknown[]): MediaAsset[] {
  const assets = z.array(mediaAssetSchema).parse(input);
  const duplicateError = findDuplicateAssetId(assets);
  if (duplicateError) {
    throw new Error(duplicateError);
  }
  return assets;
}

export function safeParseMediaAssets(
  input: unknown[],
):
  | { success: true; data: MediaAsset[] }
  | { success: false; error: string } {
  const parsed = z.array(mediaAssetSchema).safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const path = firstIssue?.path.join(".") ?? "(root)";
    return {
      success: false,
      error: `Получены некорректные метаданные медиафайлов: ${path}: ${firstIssue?.message ?? "validation error"}.`,
    };
  }

  const duplicateError = findDuplicateAssetId(parsed.data);
  if (duplicateError) {
    return {
      success: false,
      error: duplicateError,
    };
  }

  return { success: true, data: parsed.data };
}
