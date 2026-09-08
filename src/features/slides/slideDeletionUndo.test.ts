import { beforeEach, describe, expect, it } from "vitest";

import { createPresentation, createTextElement, resetIdGenerator } from "../../domain/factories";
import { createEditorStore } from "../../store/editorStore";
import {
  buildSlideDeletionOperation,
  canRestoreSlideDeletion,
  createDeletionKind,
  fingerprintPresentation,
  restoreSlideDeletion,
} from "./slideDeletionUndo";

describe("slideDeletionUndo", () => {
  beforeEach(() => {
    resetIdGenerator();
  });

  it("builds a remove-slide operation with post-delete fingerprint", () => {
    const store = createEditorStore({ presentation: createPresentation("Test") });
    store.getState().addSlide();
    const before = structuredClone(store.getState().presentation);
    const deletedSlide = before.slides[1]!;
    store.getState().deleteSlide(deletedSlide.id);
    const after = structuredClone(store.getState().presentation);

    const operation = buildSlideDeletionOperation({
      presentationAfter: after,
      deletedSlide,
      slideIndex: 1,
      activeSlideIdBefore: before.slides[0]!.id,
      kind: "remove-slide",
    });

    expect(operation.kind).toBe("remove-slide");
    expect(operation.postDeleteFingerprint).toBe(fingerprintPresentation(after));
  });

  it("restores a removed slide at the original index when state is unchanged", () => {
    const store = createEditorStore({ presentation: createPresentation("Test") });
    store.getState().addSlide();
    const before = structuredClone(store.getState().presentation);
    const deletedSlide = before.slides[1]!;
    store.getState().deleteSlide(deletedSlide.id);
    const after = structuredClone(store.getState().presentation);

    const operation = buildSlideDeletionOperation({
      presentationAfter: after,
      deletedSlide,
      slideIndex: 1,
      activeSlideIdBefore: before.slides[0]!.id,
      kind: createDeletionKind(before.slides.length),
    });

    const result = restoreSlideDeletion(store, operation);
    expect(result).toEqual({ success: true });
    expect(store.getState().presentation.slides).toHaveLength(2);
    expect(store.getState().presentation.slides[1]?.id).toBe(deletedSlide.id);
  });

  it("refuses restore after unrelated subsequent edit", () => {
    const store = createEditorStore({ presentation: createPresentation("Test") });
    store.getState().addSlide();
    const before = structuredClone(store.getState().presentation);
    const deletedSlide = before.slides[1]!;
    store.getState().deleteSlide(deletedSlide.id);
    const after = structuredClone(store.getState().presentation);
    store.getState().addSlide();

    const operation = buildSlideDeletionOperation({
      presentationAfter: after,
      deletedSlide,
      slideIndex: 1,
      activeSlideIdBefore: before.slides[0]!.id,
      kind: "remove-slide",
    });

    expect(canRestoreSlideDeletion(store.getState().presentation, operation)).toBe(false);
    expect(restoreSlideDeletion(store, operation)).toEqual({
      success: false,
      reason: "mutated",
    });
  });

  it("refuses restore after prior manual temporal undo changed the document", () => {
    const store = createEditorStore({ presentation: createPresentation("Test") });
    store.getState().addSlide();
    const before = structuredClone(store.getState().presentation);
    const deletedSlide = before.slides[1]!;
    store.getState().deleteSlide(deletedSlide.id);
    const after = structuredClone(store.getState().presentation);
    store.temporal.getState().undo();

    const operation = buildSlideDeletionOperation({
      presentationAfter: after,
      deletedSlide,
      slideIndex: 1,
      activeSlideIdBefore: before.slides[0]!.id,
      kind: "remove-slide",
    });

    expect(restoreSlideDeletion(store, operation)).toEqual({
      success: false,
      reason: "mutated",
    });
  });

  it("restores cleared contents on the last remaining slide", () => {
    const store = createEditorStore({ presentation: createPresentation("One") });
    const before = structuredClone(store.getState().presentation);
    const slide = before.slides[0]!;
    slide.elements = [
      createTextElement(slide.elements, { content: "Keep me" }),
    ];
    store.getState().setPresentation(before);

    const slideBeforeDelete = structuredClone(store.getState().presentation.slides[0]!);
    store.getState().deleteSlide(slideBeforeDelete.id);
    const after = structuredClone(store.getState().presentation);

    const operation = buildSlideDeletionOperation({
      presentationAfter: after,
      deletedSlide: slideBeforeDelete,
      slideIndex: 0,
      activeSlideIdBefore: slideBeforeDelete.id,
      kind: "clear-contents",
    });

    expect(restoreSlideDeletion(store, operation)).toEqual({ success: true });
    expect(store.getState().presentation.slides[0]?.elements[0]?.content).toBe("Keep me");
  });

  it("marks clear-contents without elements as a non-mutating operation", () => {
    const presentation = createPresentation("Empty");
    const slide = presentation.slides[0]!;

    const operation = buildSlideDeletionOperation({
      presentationAfter: presentation,
      deletedSlide: slide,
      slideIndex: 0,
      activeSlideIdBefore: slide.id,
      kind: "clear-contents",
    });

    expect(operation.hadMutation).toBe(false);
  });
});
