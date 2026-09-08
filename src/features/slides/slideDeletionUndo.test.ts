import { beforeEach, describe, expect, it } from "vitest";

import { createPresentation, createTextElement, resetIdGenerator } from "../../domain/factories";
import { createEditorStore } from "../../store/editorStore";
import {
  buildSlideDeletionToken,
  canUndoSlideDeletion,
  createDeletionKind,
  fingerprintPresentation,
  undoSlideDeletion,
} from "./slideDeletionUndo";

describe("slideDeletionUndo", () => {
  beforeEach(() => {
    resetIdGenerator();
  });

  it("builds a token with post-delete fingerprint and temporal position", () => {
    const store = createEditorStore({ presentation: createPresentation("Test") });
    store.getState().addSlide();
    const deletedSlide = store.getState().presentation.slides[1]!;
    store.getState().deleteSlide(deletedSlide.id);
    const after = structuredClone(store.getState().presentation);

    const token = buildSlideDeletionToken({
      store,
      presentationAfter: after,
      kind: "remove-slide",
      hadMutation: true,
    });

    expect(token.postDeleteFingerprint).toBe(fingerprintPresentation(after));
    expect(token.pastStatesLength).toBe(store.temporal.getState().pastStates.length);
    expect(token.futureStatesLength).toBe(store.temporal.getState().futureStates.length);
  });

  it("restores deletion via temporal undo while preserving earlier history", () => {
    const store = createEditorStore({ presentation: createPresentation("Original") });
    store.getState().renamePresentation("Renamed");
    store.getState().addSlide();
    const deletedSlide = store.getState().presentation.slides[1]!;
    store.getState().deleteSlide(deletedSlide.id);
    const after = structuredClone(store.getState().presentation);

    const token = buildSlideDeletionToken({
      store,
      presentationAfter: after,
      kind: "remove-slide",
      hadMutation: true,
    });

    expect(undoSlideDeletion(store, token)).toEqual({ success: true });
    expect(store.getState().presentation.slides).toHaveLength(2);
    expect(store.getState().presentation.slides[1]?.id).toBe(deletedSlide.id);
    expect(store.getState().presentation.title).toBe("Renamed");
    expect(store.temporal.getState().pastStates.length).toBeGreaterThan(0);

    store.temporal.getState().undo();
    expect(store.getState().presentation.slides).toHaveLength(1);
    expect(store.getState().presentation.title).toBe("Renamed");

    store.temporal.getState().undo();
    expect(store.getState().presentation.title).toBe("Original");
  });

  it("refuses undo after unrelated subsequent edit", () => {
    const store = createEditorStore({ presentation: createPresentation("Test") });
    store.getState().addSlide();
    const deletedSlide = store.getState().presentation.slides[1]!;
    store.getState().deleteSlide(deletedSlide.id);
    const after = structuredClone(store.getState().presentation);
    store.getState().addSlide();

    const token = buildSlideDeletionToken({
      store,
      presentationAfter: after,
      kind: "remove-slide",
      hadMutation: true,
    });

    expect(canUndoSlideDeletion(store, token)).toBe(false);
    expect(undoSlideDeletion(store, token)).toEqual({ success: false, reason: "mutated" });
  });

  it("refuses undo after manual temporal undo changed history position", () => {
    const store = createEditorStore({ presentation: createPresentation("Test") });
    store.getState().addSlide();
    store.getState().deleteSlide(store.getState().presentation.slides[1]!.id);
    const after = structuredClone(store.getState().presentation);

    const token = buildSlideDeletionToken({
      store,
      presentationAfter: after,
      kind: "remove-slide",
      hadMutation: true,
    });

    store.temporal.getState().undo();

    expect(undoSlideDeletion(store, token)).toEqual({ success: false, reason: "mutated" });
  });

  it("restores cleared last-slide contents via temporal undo", () => {
    const store = createEditorStore({ presentation: createPresentation("One") });
    const slide = store.getState().presentation.slides[0]!;
    slide.elements = [createTextElement(slide.elements, { content: "Keep me" })];
    store.getState().setPresentation(store.getState().presentation);

    store.getState().deleteSlide(slide.id);
    const after = structuredClone(store.getState().presentation);

    const token = buildSlideDeletionToken({
      store,
      presentationAfter: after,
      kind: "clear-contents",
      hadMutation: true,
    });

    expect(undoSlideDeletion(store, token)).toEqual({ success: true });
    expect(store.getState().presentation.slides[0]?.elements[0]?.content).toBe("Keep me");
  });

  it("marks clear-contents without elements as non-mutating", () => {
    const store = createEditorStore({ presentation: createPresentation("Empty") });
    const presentation = store.getState().presentation;

    const token = buildSlideDeletionToken({
      store,
      presentationAfter: presentation,
      kind: createDeletionKind(1),
      hadMutation: false,
    });

    expect(token.hadMutation).toBe(false);
  });
});
