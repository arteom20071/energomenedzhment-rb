import { beforeEach, describe, expect, it } from "vitest";

import {
  createPresentation,
  createTextElement,
  resetIdGenerator,
  setIdGenerator,
} from "../domain/factories";
import type { Presentation, SlideElement } from "../domain/presentation";
import { createEditorStore, HISTORY_LIMIT, type EditorStoreApi } from "./editorStore";

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

function getActiveElements(store: EditorStoreApi): SlideElement[] {
  const state = store.getState();
  return state.presentation.slides.find((slide) => slide.id === state.activeSlideId)?.elements ?? [];
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

  it("deleteSlide with missing id is a no-op", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    const before = store.getState().presentation;
    store.getState().deleteSlide("missing-slide");
    expect(store.getState().presentation).toEqual(before);
  });

  it("deleteSlide on non-active slide keeps active slide", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    store.getState().addSlide();
    const activeId = store.getState().activeSlideId;
    const otherId = store.getState().presentation.slides.find((s) => s.id !== activeId)!.id;
    store.getState().deleteSlide(otherId);
    expect(store.getState().activeSlideId).toBe(activeId);
    expect(store.getState().presentation.slides).toHaveLength(1);
  });

  it("last-slide clear applies only when that slide is requested", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    const slideId = store.getState().presentation.slides[0]?.id;
    store.getState().deleteSlide("missing-slide");
    expect(getActiveElements(store)).toHaveLength(2);
    store.getState().deleteSlide(slideId!);
    expect(store.getState().presentation.slides).toHaveLength(1);
    expect(getActiveElements(store)).toHaveLength(0);
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

  it("normalizes selection to existing element ids", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    store.getState().setSelection(["missing", getActiveElements(store)[0]!.id]);
    expect(store.getState().selectedElementIds).toEqual([getActiveElements(store)[0]!.id]);

    store.getState().toggleSelection("missing");
    expect(store.getState().selectedElementIds).toEqual([getActiveElements(store)[0]!.id]);
  });

  it("clears stale selection after duplicate then undo", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    const originalId = getActiveElements(store)[0]!.id;
    store.getState().setSelection([originalId]);
    store.getState().duplicateSelectedElements();
    const duplicateId = store.getState().selectedElementIds[0]!;
    expect(duplicateId).not.toBe(originalId);
    store.temporal.getState().undo();
    expect(getActiveElements(store).some((el) => el.id === duplicateId)).toBe(false);
    expect(store.getState().selectedElementIds).toEqual([originalId]);
  });

  it("clears stale selection after redo", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    const originalId = getActiveElements(store)[0]!.id;
    store.getState().setSelection([originalId]);
    store.getState().duplicateSelectedElements();
    const duplicateId = store.getState().selectedElementIds[0]!;
    store.temporal.getState().undo();
    store.temporal.getState().redo();
    expect(getActiveElements(store).some((el) => el.id === duplicateId)).toBe(true);
    expect(store.getState().selectedElementIds).toEqual([duplicateId]);
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

  it("z-order actions ignore missing selected ids without throwing", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    const [a] = getActiveElements(store);
    store.getState().setSelection([a!.id, "ghost-id"]);
    expect(() => store.getState().bringForward()).not.toThrow();
    expect(() => store.getState().sendBackward()).not.toThrow();
    expect(() => store.getState().bringToFront()).not.toThrow();
    expect(() => store.getState().sendToBack()).not.toThrow();
    expect(store.getState().selectedElementIds).toEqual([a!.id]);
  });

  it("duplicate places copies above originals preserving relative order", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    const [a, b] = getActiveElements(store);
    store.getState().setSelection([a!.id, b!.id]);
    store.getState().duplicateSelectedElements();
    const elements = getActiveElements(store);
    const dupA = elements.find((el) => el.content === a!.content && el.id !== a!.id);
    const dupB = elements.find((el) => el.content === b!.content && el.id !== b!.id);
    expect(dupA).toBeDefined();
    expect(dupB).toBeDefined();
    expect(dupA!.zIndex).toBeGreaterThan(a!.zIndex);
    expect(dupB!.zIndex).toBeGreaterThan(b!.zIndex);
    expect(dupA!.zIndex).toBeLessThan(dupB!.zIndex);
  });

  it("multi-selection z-order preserves relative order", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    const [a, b] = getActiveElements(store);
    store.getState().setSelection([a!.id, b!.id]);
    store.getState().bringToFront();
    const elements = getActiveElements(store);
    const zA = elements.find((el) => el.id === a!.id)!.zIndex;
    const zB = elements.find((el) => el.id === b!.id)!.zIndex;
    expect(zA).toBeLessThan(zB);
    expect(elements.map((el) => el.zIndex)).toEqual([0, 1]);
  });

  it("excludes selection and zoom from undo history", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    store.getState().renamePresentation("Changed");
    store.getState().setSelection(["missing"]);
    store.getState().setZoom(1.5);
    store.temporal.getState().undo();
    expect(store.getState().presentation.title).toBe("Seed");
    expect(store.getState().selectedElementIds).toEqual([]);
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

  it("caps undo history at 100 steps", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    expect(HISTORY_LIMIT).toBe(100);
    for (let step = 0; step < HISTORY_LIMIT + 5; step += 1) {
      store.getState().renamePresentation(`Title ${step}`);
    }
    expect(store.temporal.getState().pastStates.length).toBeLessThanOrEqual(HISTORY_LIMIT);
  });

  it("clears history when replacing presentation", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    store.getState().renamePresentation("Dirty");
    store.getState().setPresentation(buildPresentation());
    expect(store.temporal.getState().pastStates).toHaveLength(0);
    expect(store.temporal.getState().futureStates).toHaveLength(0);
  });

  it("setPresentation rejects invalid payload atomically with path-specific error", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    const original = store.getState().presentation;
    const invalid = {
      ...original,
      slides: [
        {
          ...original.slides[0]!,
          elements: [{ ...original.slides[0]!.elements[0]!, height: -1 }],
        },
      ],
    };
    expect(() => store.getState().setPresentation(invalid)).toThrow(/slides\[0\]\.elements\[0\]\.height/);
    expect(store.getState().presentation).toEqual(original);
  });

  it("addElement re-ids duplicate element ids", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    const existingId = getActiveElements(store)[0]!.id;
    const duplicate = createTextElement([], { content: "Dup" });
    duplicate.id = existingId;
    store.getState().addElement(duplicate);
    const ids = getActiveElements(store).map((el) => el.id);
    expect(ids.filter((id) => id === existingId)).toHaveLength(1);
    expect(store.getState().selectedElementIds[0]).not.toBe(existingId);
  });

  it("updateElements rejects invalid geometry atomically", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    const [a, b] = getActiveElements(store);
    const before = store.getState().presentation;
    store.getState().updateElements([
      { id: a!.id, changes: { width: -10 } },
      { id: b!.id, changes: { x: 500 } },
    ]);
    expect(store.getState().presentation).toEqual(before);
  });

  it("updateElement rejects unsafe styles atomically", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    const [a] = getActiveElements(store);
    const before = a!.styles;
    store.getState().updateElement(a!.id, {
      styles: { bad: () => undefined } as unknown as Record<string, unknown>,
    });
    expect(getActiveElements(store)[0]!.styles).toEqual(before);
  });

  it("commitElementTransforms rejects invalid payloads like updateElements", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    const [a] = getActiveElements(store);
    const originalX = a!.x;
    store.getState().commitElementTransforms([{ id: a!.id, changes: { x: Number.NaN } }]);
    expect(getActiveElements(store)[0]!.x).toBe(originalX);
  });

  it("clamps zoom between 0.5 and 2", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    store.getState().setZoom(0.1);
    expect(store.getState().zoom).toBe(0.5);
    store.getState().setZoom(3);
    expect(store.getState().zoom).toBe(2);
  });

  it("setZoom ignores non-finite values", () => {
    const store: EditorStoreApi = createEditorStore({ presentation: buildPresentation() });
    store.getState().setZoom(1.25);
    store.getState().setZoom(Number.NaN);
    expect(store.getState().zoom).toBe(1.25);
    store.getState().setZoom(Number.POSITIVE_INFINITY);
    expect(store.getState().zoom).toBe(1.25);
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

  it("duplicateSlide assigns unique ids when generator collides", () => {
    setIdGenerator(() => "dup");
    const presentation = createPresentation("Dup");
    const store = createEditorStore({ presentation });
    store.getState().duplicateSlide(presentation.slides[0]!.id);
    const ids = new Set<string>();
    for (const slide of store.getState().presentation.slides) {
      expect(ids.has(slide.id)).toBe(false);
      ids.add(slide.id);
      for (const element of slide.elements) {
        expect(ids.has(element.id)).toBe(false);
        ids.add(element.id);
      }
    }
    resetIdGenerator();
  });
});
