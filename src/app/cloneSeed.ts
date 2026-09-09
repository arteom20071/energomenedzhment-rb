import type { Presentation } from "../domain/presentation";
import {
  energyManagementPresentation,
  resolveSeedAssetUrl,
} from "../seed/energyManagement";

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
