import { beforeEach, describe, expect, it } from "vitest";

import {
  createPresentation,
  createTextElement,
  resetIdGenerator,
  setIdGenerator,
} from "../domain/factories";
import type { Presentation } from "../domain/presentation";
import { createEditorStore, type EditorStoreApi } from "./editorStore";

let idCounter = 0;

function buildPresentation(): Presentation {
  idCounter = 0;
  setIdGenerator(() => `id-${++idCounter}`);
  const presentation = createPresentation("Seed");
  const slide = presentation.slides[0]!;
  slide.elements = [
    createTextElement(slide.elements, {
      x: 10,
      y: 10,
      width: 100,
      height: 40,
      content: "A",
    }),
    createTextElement(slide.elements, {
      x: 20,
      y: 60,
      width: 100,
      height: 40,
      content: "B",
    }),
  ];
  resetIdGenerator();
  return presentation;
}

beforeEach(() => {
  resetIdGenerator();
});

describe("createEditorStore", () => {
  it("initializes with presentation and first slide active", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    const state = store.getState();
    expect(state.presentation.slides).toHaveLength(1);
    expect(state.activeSlideId).toBe(state.presentation.slides[0]?.id);
    expect(state.selectedElementIds).toEqual([]);
    expect(state.zoom).toBe(1);
  });

  it("adds, duplicates, deletes, and reorders slides", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    store.getState().addSlide();
    expect(store.getState().presentation.slides).toHaveLength(2);

    const firstId = store.getState().presentation.slides[0]?.id;
    store.getState().duplicateSlide(firstId!);
    expect(store.getState().presentation.slides).toHaveLength(3);

    const duplicateId = store.getState().presentation.slides[1]?.id;
    expect(store.getState().activeSlideId).toBe(duplicateId);

    store.getState().deleteSlide(duplicateId!);
    expect(store.getState().presentation.slides).toHaveLength(2);

    store.getState().reorderSlide(1, 0);
    expect(store.getState().presentation.slides[0]?.id).not.toBe(firstId);
  });

  it("clears elements instead of removing the last slide", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    const slideId = store.getState().presentation.slides[0]?.id;
    store.getState().deleteSlide(slideId!);
    expect(store.getState().presentation.slides).toHaveLength(1);
    expect(store.getState().presentation.slides[0]?.elements).toEqual([]);
  });

  it("manages element CRUD and selection", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    const slideId = store.getState().activeSlideId;
    store.getState().addElement(
      createTextElement([], {
        x: 0,
        y: 0,
        width: 50,
        height: 20,
        content: "New",
      }),
    );
    const state = store.getState();
    const newId = state.selectedElementIds[0];
    expect(state.presentation.slides.find((s) => s.id === slideId)?.elements).toHaveLength(3);
    expect(newId).toBeDefined();
    expect(state.selectedElementIds).toEqual([newId]);

    store.getState().setSelection([newId!]);
    store.getState().toggleSelection(newId!);
    expect(store.getState().selectedElementIds).toEqual([]);

    store.getState().toggleSelection(newId!);
    store.getState().duplicateSelectedElements();
    expect(store.getState().selectedElementIds).toHaveLength(1);
    expect(store.getState().selectedElementIds[0]).not.toBe(newId);

    store.getState().deleteSelectedElements();
    expect(
      store.getState().presentation.slides.find((s) => s.id === slideId)?.elements,
    ).toHaveLength(3);
  });

  it("normalizes z-order deterministically", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    const slide = store.getState().presentation.slides[0]!;
    const [a, b] = slide.elements;
    store.getState().setSelection([a!.id]);
    store.getState().bringToFront();
    const afterFront = store.getState().presentation.slides[0]?.elements;
    expect(afterFront?.find((el) => el.id === a!.id)?.zIndex).toBe(1);

    store.getState().setSelection([b!.id]);
    store.getState().sendToBack();
    const normalized = store
      .getState()
      .presentation.slides[0]?.elements.map((el) => el.zIndex);
    expect(normalized).toEqual([0, 1]);
  });

  it("excludes selection and zoom from undo history", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    store.getState().renamePresentation("Changed");
    store.getState().setSelection(["missing"]);
    store.getState().setZoom(1.5);
    store.temporal.getState().undo();
    expect(store.getState().presentation.title).toBe("Seed");
    expect(store.getState().selectedElementIds).toEqual(["missing"]);
    expect(store.getState().zoom).toBe(1.5);
  });

  it("supports undo and redo for document mutations", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    store.getState().renamePresentation("Draft");
    store.getState().renamePresentation("Final");
    store.temporal.getState().undo();
    expect(store.getState().presentation.title).toBe("Draft");
    store.temporal.getState().redo();
    expect(store.getState().presentation.title).toBe("Final");
  });

  it("clears history when replacing presentation", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    store.getState().renamePresentation("Dirty");
    store.getState().setPresentation(buildPresentation());
    expect(store.temporal.getState().pastStates).toHaveLength(0);
    expect(store.temporal.getState().futureStates).toHaveLength(0);
  });

  it("clamps zoom between 0.5 and 2", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    store.getState().setZoom(0.1);
    expect(store.getState().zoom).toBe(0.5);
    store.getState().setZoom(3);
    expect(store.getState().zoom).toBe(2);
  });

  it("records one undo entry for batch element updates", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    const slide = store.getState().presentation.slides[0]!;
    const ids = slide.elements.map((el) => el.id);
    store.getState().updateElements(
      ids.map((id) => ({ id, changes: { x: 999 } })),
    );
    store.temporal.getState().undo();
    expect(
      store.getState().presentation.slides[0]?.elements.every((el) => el.x !== 999),
    ).toBe(true);
  });

  it("clamps reorder indexes", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    const originalId = store.getState().presentation.slides[0]?.id;
    store.getState().reorderSlide(0, 99);
    expect(store.getState().presentation.slides.at(-1)?.id).toBe(originalId);
  });
});
