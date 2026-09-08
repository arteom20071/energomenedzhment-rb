import {
  ACCEPTED_MIME_TYPES,
  extensionMatchesMime,
  inferMimeFromFilename,
  MAX_MEDIA_FILE_SIZE_BYTES,
  type AcceptedMimeType,
} from "./constants";
import { inspectSvg } from "./svgSanitizer";
import type { ImageDimensionDecoder, MediaValidationResult } from "./types";

export {
  ACCEPTED_FORMATS_LABEL,
  MAX_MEDIA_FILE_SIZE_BYTES,
} from "./constants";

function resolveMimeType(file: File): AcceptedMimeType | null {
  const declared = file.type.toLowerCase();
  if (ACCEPTED_MIME_TYPES.includes(declared as AcceptedMimeType)) {
    return declared as AcceptedMimeType;
  }

  return inferMimeFromFilename(file.name);
}

export async function validateMediaFile(
  file: File,
  decoder: ImageDimensionDecoder,
): Promise<MediaValidationResult> {
  if (file.size > MAX_MEDIA_FILE_SIZE_BYTES) {
    return {
      success: false,
      error: "Размер файла превышает 15 МБ.",
    };
  }

  const mimeType = resolveMimeType(file);
  if (!mimeType) {
    return {
      success: false,
      error: "Неподдерживаемый тип файла. Допустимы PNG, JPEG, WebP и SVG.",
    };
  }

  if (file.type && !extensionMatchesMime(file.name, mimeType)) {
    return {
      success: false,
      error: "Расширение файла не соответствует типу изображения.",
    };
  }

  if (mimeType === "image/svg+xml") {
    const svgText = await file.text();
    const inspection = inspectSvg(svgText);
    if ("error" in inspection) {
      return { success: false, error: inspection.error };
    }

    return {
      success: true,
      file: {
        blob: new Blob([svgText], { type: mimeType }),
        mimeType,
        filename: file.name,
        width: inspection.width,
        height: inspection.height,
      },
    };
  }

  try {
    const dimensions = await decoder.decode(file, mimeType);
    if (dimensions.width <= 0 || dimensions.height <= 0) {
      return {
        success: false,
        error: "Не удалось декодировать изображение.",
      };
    }

    return {
      success: true,
      file: {
        blob: file,
        mimeType,
        filename: file.name,
        width: dimensions.width,
        height: dimensions.height,
      },
    };
  } catch {
    return {
      success: false,
      error: "Не удалось декодировать изображение.",
    };
  }
}

export const defaultImageDecoder: ImageDimensionDecoder = {
  async decode(blob, mimeType) {
    if (typeof createImageBitmap === "function" && mimeType !== "image/svg+xml") {
      const bitmap = await createImageBitmap(blob);
      const dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return dimensions;
    }

    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => {
        const dimensions = { width: image.naturalWidth, height: image.naturalHeight };
        URL.revokeObjectURL(url);
        resolve(dimensions);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("decode failed"));
      };
      image.src = url;
    });
  },
};
