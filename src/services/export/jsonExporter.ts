import type { Presentation, SlideElement } from "../../domain/presentation";
import { parsePresentation } from "../../domain/presentation";
import { parseAssetReference } from "../persistence/assetRepository";
import { EXPORT_ERRORS } from "./errors";

export type AssetResolver = (reference: string) => Promise<string | null>;

const DATA_URL_PATTERN = /^data:[^;]+;base64,/;

function isDataUrl(value: string): boolean {
  return DATA_URL_PATTERN.test(value);
}

async function resolveElementContent(
  content: string | undefined,
  resolveAsset: AssetResolver,
): Promise<string | undefined> {
  if (content === undefined) {
    return undefined;
  }

  if (isDataUrl(content)) {
    return content;
  }

  const assetId = parseAssetReference(content);
  if (assetId) {
    const resolved = await resolveAsset(content);
    return resolved ?? content;
  }

  if (content.startsWith("blob:")) {
    const resolved = await resolveAsset(content);
    return resolved ?? content;
  }

  return content;
}

async function resolveSlideElements(
  elements: SlideElement[],
  resolveAsset: AssetResolver,
): Promise<SlideElement[]> {
  return Promise.all(
    elements.map(async (element) => {
      if (element.type !== "image") {
        return element;
      }

      const content = await resolveElementContent(element.content, resolveAsset);
      const styles = { ...element.styles };

      for (const [key, value] of Object.entries(styles)) {
        if (typeof value === "string") {
          const resolved = await resolveElementContent(value, resolveAsset);
          if (resolved !== undefined) {
            styles[key] = resolved;
          }
        }
      }

      return { ...element, content, styles };
    }),
  );
}

export async function exportPresentationJson(
  presentation: Presentation,
  resolveAsset: AssetResolver,
): Promise<{ success: true; json: string; filename: string } | { success: false; error: string }> {
  const resolvedSlides = await Promise.all(
    presentation.slides.map(async (slide) => ({
      ...slide,
      elements: await resolveSlideElements(slide.elements, resolveAsset),
    })),
  );

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
  const filename = sanitizeFilename(validated.data.title);

  return { success: true, json, filename };
}

function stripUnsafeFilenameChars(value: string): string {
  return [...value]
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && !'<>:"/\\|?*'.includes(char);
    })
    .join("");
}

export function sanitizeFilename(title: string): string {
  const sanitized = stripUnsafeFilenameChars(title.trim())
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  const base = sanitized.length > 0 ? sanitized : "presentation";
  return `${base}.presentation.json`;
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
