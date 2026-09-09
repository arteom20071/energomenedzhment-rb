import type { Presentation } from "../domain/presentation";
import {
  energyManagementPresentation,
  resolveSeedAssetUrl,
} from "../seed/energyManagement";

const LEGACY_SEED_DIAGRAM_IMAGE = /slide-\d+-/;

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
