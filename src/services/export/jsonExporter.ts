import type { Presentation, SlideElement } from "../../domain/presentation";
import { parsePresentation } from "../../domain/presentation";
import { parseAssetReference } from "../persistence/assetRepository";
import { EXPORT_ERRORS } from "./errors";
import { sanitizeJsonFilename } from "./filenameSanitizer";
import {
  type AssetResolver,
  isSafeImageDataUrl,
  resolveImageContent,
} from "./imageContent";

export type { AssetResolver } from "./imageContent";

async function resolveSlideElements(
  elements: SlideElement[],
  slideIndex: number,
  resolveAsset: AssetResolver,
): Promise<{ success: true; elements: SlideElement[] } | { success: false; error: string }> {
  const resolved: SlideElement[] = [];

  for (const [elementIndex, element] of elements.entries()) {
    if (element.type !== "image") {
      resolved.push(element);
      continue;
    }

    const path = `slides[${slideIndex}].elements[${elementIndex}].content`;
    const contentResult = await resolveImageContent(element.content, resolveAsset, path);
    if (!contentResult.success) {
      return { success: false, error: contentResult.error };
    }

    const styles = { ...element.styles };
    for (const [key, value] of Object.entries(styles)) {
      if (typeof value !== "string") {
        continue;
      }

      if (isSafeImageDataUrl(value)) {
        continue;
      }

      if (parseAssetReference(value) || value.startsWith("blob:")) {
        const stylePath = `slides[${slideIndex}].elements[${elementIndex}].styles.${key}`;
        const styleResult = await resolveImageContent(value, resolveAsset, stylePath);
        if (!styleResult.success) {
          return { success: false, error: styleResult.error };
        }
        styles[key] = styleResult.value;
      }
    }

    resolved.push({ ...element, content: contentResult.value, styles });
  }

  return { success: true, elements: resolved };
}

export async function exportPresentationJson(
  presentation: Presentation,
  resolveAsset: AssetResolver,
): Promise<{ success: true; json: string; filename: string } | { success: false; error: string }> {
  const resolvedSlides = [];

  for (const [slideIndex, slide] of presentation.slides.entries()) {
    const elementsResult = await resolveSlideElements(slide.elements, slideIndex, resolveAsset);
    if (!elementsResult.success) {
      return { success: false, error: elementsResult.error };
    }

    resolvedSlides.push({
      ...slide,
      elements: elementsResult.elements,
    });
  }

  const resolved: Presentation = {
    ...presentation,
    slides: resolvedSlides,
  };

  const validated = parsePresentation(resolved);
  if (!validated.success) {
    const first = validated.errors[0]!;
    return {
      success: false,
      error: EXPORT_ERRORS.validation(first.path, first.message),
    };
  }

  const json = JSON.stringify(validated.data, null, 2);
  const filename = sanitizeJsonFilename(validated.data.title);

  return { success: true, json, filename };
}

export function sanitizeFilename(title: string): string {
  return sanitizeJsonFilename(title);
}

export function createDataUrlResolver(
  assets: Record<string, string>,
): AssetResolver {
  return async (reference: string) => {
    const assetId = parseAssetReference(reference);
    if (assetId && assets[assetId]) {
      return assets[assetId];
    }
    if (assets[reference]) {
      return assets[reference];
    }
    return null;
  };
}
