import type { Presentation } from "../domain/presentation";
import {
  energyManagementPresentation,
  resolveSeedAssetUrl,
} from "../seed/energyManagement";

const LEGACY_SEED_DIAGRAM_IMAGE = /slide-\d+-/;
const STALE_CONTENT_PHOTO = /photo-(overview|legal|threshold|audit|instruments|pdca|measures|org|roadmap)\.jpg/;

export function hasLegacySeedDiagramImages(presentation: Presentation): boolean {
  if (presentation.id !== "em-pres") {
    return false;
  }

  return presentation.slides.some((slide) =>
    slide.elements.some(
      (element) =>
        element.type === "image" &&
        typeof element.content === "string" &&
        LEGACY_SEED_DIAGRAM_IMAGE.test(element.content),
    ),
  );
}

export function shouldReplaceEnergySeedDraft(presentation: Presentation): boolean {
  if (presentation.id !== "em-pres") {
    return false;
  }

  if (hasLegacySeedDiagramImages(presentation)) {
    return true;
  }

  if (
    presentation.slides.some((slide) =>
      slide.elements.some(
        (element) =>
          element.type === "image" &&
          typeof element.content === "string" &&
          STALE_CONTENT_PHOTO.test(element.content),
      ),
    )
  ) {
    return true;
  }

  const slideIds = new Set(presentation.slides.map((slide) => slide.id));
  if (!slideIds.has("em-slide-00") || !slideIds.has("em-slide-10")) {
    return true;
  }

  if (
    presentation.slides.some((slide) =>
      slide.elements.some((element) => element.id.includes("-dia")),
    )
  ) {
    return true;
  }

  return presentation.slides.some((slide) =>
    slide.elements.some((element) => {
      if (element.type !== "text" || element.id.includes("foot")) {
        return false;
      }
      const fontSize = element.styles.fontSize;
      return typeof fontSize === "number" && fontSize < 28;
    }),
  );
}

export function cloneSeedPresentation(baseUrl = "/"): Presentation {
  const source = structuredClone(energyManagementPresentation);
  return {
    ...source,
    slides: source.slides.map((slide) => ({
      ...slide,
      elements: slide.elements.map((element) => {
        if (element.type !== "image" || !element.content) {
          return element;
        }
        return {
          ...element,
          content: resolveSeedAssetUrl(element.content, baseUrl),
        };
      }),
    })),
  };
}
