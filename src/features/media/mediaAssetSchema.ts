import { z } from "zod";

import type { MediaAsset } from "./types";

export const mediaAssetSchema = z
  .object({
    id: z.string().min(1),
    filename: z.string().min(1),
    mimeType: z.enum(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]),
    sizeBytes: z.number().finite().nonnegative(),
    width: z.number().finite().positive(),
    height: z.number().finite().positive(),
    createdAt: z.string().min(1),
  })
  .strict();

export function parseMediaAsset(input: unknown): MediaAsset {
  return mediaAssetSchema.parse(input);
}

export function parseMediaAssets(input: unknown[]): MediaAsset[] {
  return z.array(mediaAssetSchema).parse(input);
}

export function safeParseMediaAssets(
  input: unknown[],
):
  | { success: true; data: MediaAsset[] }
  | { success: false; error: string } {
  const parsed = z.array(mediaAssetSchema).safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Получены некорректные метаданные медиафайлов.",
    };
  }
  return { success: true, data: parsed.data };
}
