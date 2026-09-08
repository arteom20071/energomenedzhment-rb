import type { Presentation, Slide } from "../../domain/presentation";
import type { EditorStoreApi } from "../../store/editorStore";

export type SlideDeletionKind = "remove-slide" | "clear-contents";

export interface SlideDeletionOperation {
  kind: SlideDeletionKind;
  deletedSlide: Slide;
  slideIndex: number;
  activeSlideIdBefore: string;
  postDeleteFingerprint: string;
  hadMutation: boolean;
}

interface BuildSlideDeletionOperationInput {
  presentationAfter: Presentation;
  deletedSlide: Slide;
  slideIndex: number;
  activeSlideIdBefore: string;
  kind: SlideDeletionKind;
}

export function fingerprintPresentation(presentation: Presentation): string {
  return JSON.stringify(presentation);
}

export function buildSlideDeletionOperation(
  input: BuildSlideDeletionOperationInput,
): SlideDeletionOperation {
  const hadMutation =
    input.kind === "remove-slide" ? true : input.deletedSlide.elements.length > 0;

  return {
    kind: input.kind,
    deletedSlide: structuredClone(input.deletedSlide),
    slideIndex: input.slideIndex,
    activeSlideIdBefore: input.activeSlideIdBefore,
    postDeleteFingerprint: fingerprintPresentation(input.presentationAfter),
    hadMutation,
  };
}

export function canRestoreSlideDeletion(
  currentPresentation: Presentation,
  operation: SlideDeletionOperation,
): boolean {
  return fingerprintPresentation(currentPresentation) === operation.postDeleteFingerprint;
}

export function restoreSlideDeletion(
  store: EditorStoreApi,
  operation: SlideDeletionOperation,
): { success: true } | { success: false; reason: "mutated" } {
  const currentPresentation = store.getState().presentation;

  if (!canRestoreSlideDeletion(currentPresentation, operation)) {
    return { success: false, reason: "mutated" };
  }

  const restoredPresentation: Presentation =
    operation.kind === "clear-contents"
      ? {
          ...currentPresentation,
          slides: currentPresentation.slides.map((slide, index) =>
            index === operation.slideIndex ? operation.deletedSlide : slide,
          ),
        }
      : {
          ...currentPresentation,
          slides: [
            ...currentPresentation.slides.slice(0, operation.slideIndex),
            operation.deletedSlide,
            ...currentPresentation.slides.slice(operation.slideIndex),
          ],
        };

  store.getState().setPresentation(restoredPresentation);
  store.getState().setActiveSlide(
    operation.deletedSlide.id === operation.activeSlideIdBefore
      ? operation.deletedSlide.id
      : operation.activeSlideIdBefore,
  );

  return { success: true };
}

export function createDeletionKind(
  slideCount: number,
): SlideDeletionKind {
  return slideCount === 1 ? "clear-contents" : "remove-slide";
}
