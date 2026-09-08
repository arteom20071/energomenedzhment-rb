import { temporal } from "zundo";
import { create } from "zustand";
import { createStore, type Mutate, type StoreApi } from "zustand/vanilla";
import { useStore } from "zustand";
import type { TemporalState } from "zundo";

import {
  collectPresentationIds,
  createPresentation,
  createSlide,
  generateUniqueId,
} from "../domain/factories";
import {
  formatValidationErrors,
  MAX_ELEMENTS_PER_SLIDE,
  MAX_SLIDES,
  parsePresentation,
  slideElementSchema,
} from "../domain/presentation";
import type { Presentation, Slide, SlideElement } from "../domain/presentation";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";
export type ActiveTool = "select" | "text" | "shape" | "image";
export type ActivePanel = "properties" | "slides" | "background" | null;

export interface ElementUpdate {
  id: string;
  changes: Partial<
    Pick<
      SlideElement,
      | "x"
      | "y"
      | "width"
      | "height"
      | "rotation"
      | "zIndex"
      | "animation"
      | "content"
      | "styles"
      | "type"
    >
  >;
}

export interface EditorInitialState {
  presentation?: Presentation;
}

type PartializedEditorState = Pick<EditorState, "presentation">;

export type EditorStoreApi = Mutate<
  StoreApi<EditorState>,
  [["temporal", StoreApi<TemporalState<PartializedEditorState>>]]
>;

export type EditorStore = EditorStoreApi;

export interface EditorState {
  presentation: Presentation;
  activeSlideId: string;
  selectedElementIds: string[];
  zoom: number;
  activeTool: ActiveTool;
  activePanel: ActivePanel;
  editingTextId: string | null;
  cropElementId: string | null;
  saveStatus: SaveStatus;
  setPresentation: (presentation: Presentation) => void;
  renamePresentation: (title: string) => void;
  setActiveSlide: (slideId: string) => void;
  setSelection: (elementIds: string[]) => void;
  toggleSelection: (elementId: string) => void;
  clearSelection: () => void;
  addSlide: () => void;
  duplicateSlide: (slideId: string) => void;
  deleteSlide: (slideId: string) => void;
  reorderSlide: (fromIndex: number, toIndex: number) => void;
  addElement: (element: SlideElement) => void;
  updateElement: (elementId: string, changes: ElementUpdate["changes"]) => void;
  updateElements: (updates: ElementUpdate[]) => void;
  commitElementTransforms: (updates: ElementUpdate[]) => void;
  deleteSelectedElements: () => void;
  duplicateSelectedElements: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
  setZoom: (zoom: number) => void;
  setActiveTool: (tool: ActiveTool) => void;
  setActivePanel: (panel: ActivePanel) => void;
  setEditingTextId: (elementId: string | null) => void;
  setCropElementId: (elementId: string | null) => void;
  setSaveStatus: (status: SaveStatus) => void;
}

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2;
export const HISTORY_LIMIT = 100;

function clampZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  return Math.min(length - 1, Math.max(0, index));
}

function getActiveSlide(state: EditorState): Slide | undefined {
  return state.presentation.slides.find((slide) => slide.id === state.activeSlideId);
}

function normalizeSelection(state: EditorState, elementIds: string[]): string[] {
  const activeSlide = getActiveSlide(state);
  if (!activeSlide) {
    return [];
  }

  const validIds = new Set(activeSlide.elements.map((element) => element.id));
  return [...new Set(elementIds)].filter((id) => validIds.has(id));
}

function normalizeActiveSlideId(state: EditorState): string {
  if (state.presentation.slides.some((slide) => slide.id === state.activeSlideId)) {
    return state.activeSlideId;
  }

  return state.presentation.slides[0]?.id ?? "";
}

function normalizeAfterTemporalRestore(state: EditorState): Pick<EditorState, "activeSlideId" | "selectedElementIds"> {
  const activeSlideId = normalizeActiveSlideId(state);
  const normalizedState = { ...state, activeSlideId };
  return {
    activeSlideId,
    selectedElementIds: normalizeSelection(normalizedState, state.selectedElementIds),
  };
}

function validateElementUpdates(
  elements: SlideElement[],
  updates: ElementUpdate[],
): boolean {
  const elementsById = new Map(elements.map((element) => [element.id, element]));

  for (const update of updates) {
    const element = elementsById.get(update.id);
    if (!element) {
      continue;
    }

    const merged = { ...element, ...update.changes };
    const parsed = slideElementSchema.safeParse(merged);
    if (!parsed.success) {
      return false;
    }
  }

  return true;
}

function stableSortByZIndex(elements: SlideElement[]): SlideElement[] {
  return elements
    .map((element, index) => ({ element, index }))
    .sort(
      (left, right) =>
        left.element.zIndex - right.element.zIndex || left.index - right.index,
    )
    .map(({ element }) => element);
}

function normalizeZIndices(elements: SlideElement[]): SlideElement[] {
  return stableSortByZIndex(elements).map((element, index) => ({
    ...element,
    zIndex: index,
  }));
}

function applyZOrderChange(
  elements: SlideElement[],
  selectedIds: string[],
  mode: "forward" | "backward" | "front" | "back",
): SlideElement[] {
  const existingSelectedIds = selectedIds.filter((id) =>
    elements.some((element) => element.id === id),
  );

  if (existingSelectedIds.length === 0) {
    return elements;
  }

  const selectedSet = new Set(existingSelectedIds);
  const isSelected = (element: SlideElement) => selectedSet.has(element.id);
  let ordered = stableSortByZIndex(elements);
  const selectedInOrder = ordered.filter(isSelected);
  const unselectedInOrder = ordered.filter((element) => !isSelected(element));

  if (mode === "front") {
    ordered = [...unselectedInOrder, ...selectedInOrder];
  } else if (mode === "back") {
    ordered = [...selectedInOrder, ...unselectedInOrder];
  } else if (mode === "forward") {
    ordered = [...ordered];
    for (let index = ordered.length - 1; index >= 0; index -= 1) {
      if (!isSelected(ordered[index]!)) {
        continue;
      }

      let nextIndex = index + 1;
      while (nextIndex < ordered.length && isSelected(ordered[nextIndex]!)) {
        nextIndex += 1;
      }

      if (nextIndex < ordered.length) {
        const current = ordered[index]!;
        ordered[index] = ordered[nextIndex]!;
        ordered[nextIndex] = current;
      }
    }
  } else if (mode === "backward") {
    ordered = [...ordered];
    for (let index = 0; index < ordered.length; index += 1) {
      if (!isSelected(ordered[index]!)) {
        continue;
      }

      let previousIndex = index - 1;
      while (previousIndex >= 0 && isSelected(ordered[previousIndex]!)) {
        previousIndex -= 1;
      }

      if (previousIndex >= 0) {
        const current = ordered[index]!;
        ordered[index] = ordered[previousIndex]!;
        ordered[previousIndex] = current;
      }
    }
  }

  return ordered.map((element, index) => ({ ...element, zIndex: index }));
}

function duplicateElementsForSlide(
  allElements: SlideElement[],
  selectedElements: SlideElement[],
  usedIds: Set<string>,
): SlideElement[] {
  const maxZIndex = allElements.reduce((max, element) => Math.max(max, element.zIndex), -1);
  const selectedOrdered = stableSortByZIndex(selectedElements);

  return selectedOrdered.map((element, index) => {
    const id = generateUniqueId(usedIds);
    usedIds.add(id);
    return {
      ...element,
      id,
      x: element.x + 20,
      y: element.y + 20,
      zIndex: maxZIndex + 1 + index,
    };
  });
}

function createEditorStateCreator(initial?: EditorInitialState) {
  const initialPresentation = initial?.presentation ?? createPresentation();

  return temporal<EditorState, [], [], PartializedEditorState>(
    (set, get) => ({
      presentation: initialPresentation,
      activeSlideId: initialPresentation.slides[0]?.id ?? "",
      selectedElementIds: [],
      zoom: 1,
      activeTool: "select",
      activePanel: "properties",
      editingTextId: null,
      cropElementId: null,
      saveStatus: "idle",
      setPresentation: (presentation) => {
        const validated = parsePresentation(presentation);
        if (!validated.success) {
          throw new Error(formatValidationErrors(validated.errors));
        }

        set({
          presentation: validated.data,
          activeSlideId: validated.data.slides[0]?.id ?? "",
          selectedElementIds: [],
          editingTextId: null,
          cropElementId: null,
          saveStatus: "idle",
        });
      },
      renamePresentation: (title) => {
        set((state) => ({
          presentation: { ...state.presentation, title },
          saveStatus: "dirty",
        }));
      },
      setActiveSlide: (slideId) => {
        const exists = get().presentation.slides.some((slide) => slide.id === slideId);
        if (!exists) {
          return;
        }
        set({
          activeSlideId: slideId,
          selectedElementIds: [],
          editingTextId: null,
          cropElementId: null,
        });
      },
      setSelection: (elementIds) => {
        set((state) => ({
          selectedElementIds: normalizeSelection(state, elementIds),
        }));
      },
      toggleSelection: (elementId) => {
        set((state) => {
          const activeSlide = getActiveSlide(state);
          if (!activeSlide?.elements.some((element) => element.id === elementId)) {
            return {
              selectedElementIds: normalizeSelection(state, state.selectedElementIds),
            };
          }

          const selected = new Set(normalizeSelection(state, state.selectedElementIds));
          if (selected.has(elementId)) {
            selected.delete(elementId);
          } else {
            selected.add(elementId);
          }
          return { selectedElementIds: [...selected] };
        });
      },
      clearSelection: () => {
        set({ selectedElementIds: [] });
      },
      addSlide: () => {
        set((state) => {
          if (state.presentation.slides.length >= MAX_SLIDES) {
            return state;
          }

          const usedIds = collectPresentationIds(state.presentation);
          const slide = createSlide([], usedIds);
          return {
            presentation: {
              ...state.presentation,
              slides: [...state.presentation.slides, slide],
            },
            activeSlideId: slide.id,
            selectedElementIds: [],
            editingTextId: null,
            cropElementId: null,
            saveStatus: "dirty" as const,
          };
        });
      },
      duplicateSlide: (slideId) => {
        set((state) => {
          if (state.presentation.slides.length >= MAX_SLIDES) {
            return state;
          }

          const slideIndex = state.presentation.slides.findIndex((slide) => slide.id === slideId);
          if (slideIndex === -1) {
            return state;
          }

          const source = state.presentation.slides[slideIndex]!;
          const usedIds = collectPresentationIds(state.presentation);
          const duplicateId = generateUniqueId(usedIds);
          usedIds.add(duplicateId);

          const duplicate: Slide = {
            ...source,
            id: duplicateId,
            elements: source.elements.map((element) => {
              const elementId = generateUniqueId(usedIds);
              usedIds.add(elementId);
              return { ...element, id: elementId };
            }),
          };

          const slides = [...state.presentation.slides];
          slides.splice(slideIndex + 1, 0, duplicate);

          return {
            presentation: { ...state.presentation, slides },
            activeSlideId: duplicate.id,
            selectedElementIds: [],
            editingTextId: null,
            cropElementId: null,
            saveStatus: "dirty" as const,
          };
        });
      },
      deleteSlide: (slideId) => {
        set((state) => {
          const slideIndex = state.presentation.slides.findIndex((slide) => slide.id === slideId);
          if (slideIndex === -1) {
            return state;
          }

          if (state.presentation.slides.length === 1) {
            const onlySlide = state.presentation.slides[0]!;
            return {
              presentation: {
                ...state.presentation,
                slides: [{ ...onlySlide, elements: [] }],
              },
              selectedElementIds: [],
              editingTextId: null,
              cropElementId: null,
              saveStatus: "dirty" as const,
            };
          }

          const slides = state.presentation.slides.filter((slide) => slide.id !== slideId);
          const deletingActiveSlide = state.activeSlideId === slideId;
          const nextActiveSlide = deletingActiveSlide
            ? slides[Math.min(slideIndex, slides.length - 1)] ?? slides[0]
            : undefined;

          return {
            presentation: { ...state.presentation, slides },
            ...(deletingActiveSlide
              ? {
                  activeSlideId: nextActiveSlide?.id ?? "",
                  selectedElementIds: [],
                  editingTextId: null,
                  cropElementId: null,
                }
              : {}),
            saveStatus: "dirty" as const,
          };
        });
      },
      reorderSlide: (fromIndex, toIndex) => {
        set((state) => {
          const slides = [...state.presentation.slides];
          const from = clampIndex(fromIndex, slides.length);
          const to = clampIndex(toIndex, slides.length);
          if (from === to) {
            return state;
          }

          const [moved] = slides.splice(from, 1);
          slides.splice(to, 0, moved!);

          return {
            presentation: { ...state.presentation, slides },
            saveStatus: "dirty" as const,
          };
        });
      },
      addElement: (element) => {
        set((state) => {
          const activeSlide = getActiveSlide(state);
          if (!activeSlide) {
            return state;
          }

          if (activeSlide.elements.length >= MAX_ELEMENTS_PER_SLIDE) {
            return state;
          }

          const usedIds = collectPresentationIds(state.presentation);
          let elementToAdd = element;
          if (usedIds.has(element.id)) {
            const nextId = generateUniqueId(usedIds);
            usedIds.add(nextId);
            elementToAdd = { ...element, id: nextId };
          }

          const parsed = slideElementSchema.safeParse(elementToAdd);
          if (!parsed.success) {
            return state;
          }

          return {
            presentation: {
              ...state.presentation,
              slides: state.presentation.slides.map((slide) =>
                slide.id === activeSlide.id
                  ? {
                      ...slide,
                      elements: normalizeZIndices([...slide.elements, parsed.data]),
                    }
                  : slide,
              ),
            },
            selectedElementIds: [parsed.data.id],
            saveStatus: "dirty" as const,
          };
        });
      },
      updateElement: (elementId, changes) => {
        get().updateElements([{ id: elementId, changes }]);
      },
      updateElements: (updates) => {
        if (updates.length === 0) {
          return;
        }

        set((state) => {
          const activeSlide = getActiveSlide(state);
          if (!activeSlide) {
            return state;
          }

          if (!validateElementUpdates(activeSlide.elements, updates)) {
            return state;
          }

          const updatesById = new Map(updates.map((update) => [update.id, update.changes]));

          return {
            presentation: {
              ...state.presentation,
              slides: state.presentation.slides.map((slide) =>
                slide.id === activeSlide.id
                  ? {
                      ...slide,
                      elements: slide.elements.map((element) => {
                        const changes = updatesById.get(element.id);
                        return changes ? { ...element, ...changes } : element;
                      }),
                    }
                  : slide,
              ),
            },
            saveStatus: "dirty" as const,
          };
        });
      },
      commitElementTransforms: (updates) => {
        get().updateElements(updates);
      },
      deleteSelectedElements: () => {
        set((state) => {
          const activeSlide = getActiveSlide(state);
          if (!activeSlide || state.selectedElementIds.length === 0) {
            return state;
          }

          const selected = new Set(state.selectedElementIds);

          return {
            presentation: {
              ...state.presentation,
              slides: state.presentation.slides.map((slide) =>
                slide.id === activeSlide.id
                  ? {
                      ...slide,
                      elements: normalizeZIndices(
                        slide.elements.filter((element) => !selected.has(element.id)),
                      ),
                    }
                  : slide,
              ),
            },
            selectedElementIds: [],
            editingTextId: null,
            cropElementId: null,
            saveStatus: "dirty" as const,
          };
        });
      },
      duplicateSelectedElements: () => {
        set((state) => {
          const activeSlide = getActiveSlide(state);
          if (!activeSlide || state.selectedElementIds.length === 0) {
            return state;
          }

          const selected = new Set(state.selectedElementIds);
          const selectedElements = activeSlide.elements.filter((element) =>
            selected.has(element.id),
          );

          if (activeSlide.elements.length + selectedElements.length > MAX_ELEMENTS_PER_SLIDE) {
            return state;
          }

          const usedIds = collectPresentationIds(state.presentation);
          const duplicates = duplicateElementsForSlide(
            activeSlide.elements,
            selectedElements,
            usedIds,
          );

          return {
            presentation: {
              ...state.presentation,
              slides: state.presentation.slides.map((slide) =>
                slide.id === activeSlide.id
                  ? {
                      ...slide,
                      elements: normalizeZIndices([...slide.elements, ...duplicates]),
                    }
                  : slide,
              ),
            },
            selectedElementIds: duplicates.map((element) => element.id),
            saveStatus: "dirty" as const,
          };
        });
      },
      bringForward: () => {
        set((state) => {
          const activeSlide = getActiveSlide(state);
          if (!activeSlide) {
            return state;
          }

          return {
            presentation: {
              ...state.presentation,
              slides: state.presentation.slides.map((slide) =>
                slide.id === activeSlide.id
                  ? {
                      ...slide,
                      elements: applyZOrderChange(
                        slide.elements,
                        state.selectedElementIds,
                        "forward",
                      ),
                    }
                  : slide,
              ),
            },
            selectedElementIds: normalizeSelection(state, state.selectedElementIds),
            saveStatus: "dirty" as const,
          };
        });
      },
      sendBackward: () => {
        set((state) => {
          const activeSlide = getActiveSlide(state);
          if (!activeSlide) {
            return state;
          }

          return {
            presentation: {
              ...state.presentation,
              slides: state.presentation.slides.map((slide) =>
                slide.id === activeSlide.id
                  ? {
                      ...slide,
                      elements: applyZOrderChange(
                        slide.elements,
                        state.selectedElementIds,
                        "backward",
                      ),
                    }
                  : slide,
              ),
            },
            selectedElementIds: normalizeSelection(state, state.selectedElementIds),
            saveStatus: "dirty" as const,
          };
        });
      },
      bringToFront: () => {
        set((state) => {
          const activeSlide = getActiveSlide(state);
          if (!activeSlide) {
            return state;
          }

          return {
            presentation: {
              ...state.presentation,
              slides: state.presentation.slides.map((slide) =>
                slide.id === activeSlide.id
                  ? {
                      ...slide,
                      elements: applyZOrderChange(
                        slide.elements,
                        state.selectedElementIds,
                        "front",
                      ),
                    }
                  : slide,
              ),
            },
            selectedElementIds: normalizeSelection(state, state.selectedElementIds),
            saveStatus: "dirty" as const,
          };
        });
      },
      sendToBack: () => {
        set((state) => {
          const activeSlide = getActiveSlide(state);
          if (!activeSlide) {
            return state;
          }

          return {
            presentation: {
              ...state.presentation,
              slides: state.presentation.slides.map((slide) =>
                slide.id === activeSlide.id
                  ? {
                      ...slide,
                      elements: applyZOrderChange(
                        slide.elements,
                        state.selectedElementIds,
                        "back",
                      ),
                    }
                  : slide,
              ),
            },
            selectedElementIds: normalizeSelection(state, state.selectedElementIds),
            saveStatus: "dirty" as const,
          };
        });
      },
      setZoom: (zoom) => {
        if (!Number.isFinite(zoom)) {
          return;
        }
        set({ zoom: clampZoom(zoom) });
      },
      setActiveTool: (tool) => {
        set({ activeTool: tool });
      },
      setActivePanel: (panel) => {
        set({ activePanel: panel });
      },
      setEditingTextId: (elementId) => {
        set({ editingTextId: elementId });
      },
      setCropElementId: (elementId) => {
        set({ cropElementId: elementId });
      },
      setSaveStatus: (status) => {
        set({ saveStatus: status });
      },
    }),
    {
      partialize: (state) => ({ presentation: state.presentation }),
      limit: HISTORY_LIMIT,
      equality: (pastState, currentState) =>
        JSON.stringify(pastState.presentation) === JSON.stringify(currentState.presentation),
    },
  );
}

function attachPresentationHistoryClear(store: EditorStoreApi): EditorStoreApi {
  const originalSetPresentation = store.getState().setPresentation;

  store.setState({
    setPresentation: (presentation) => {
      originalSetPresentation(presentation);
      store.temporal.getState().clear();
    },
  });

  return store;
}

function attachTemporalSelectionNormalization(store: EditorStoreApi): EditorStoreApi {
  const { undo, redo } = store.temporal.getState();

  store.temporal.setState({
    undo: () => {
      undo();
      store.setState(normalizeAfterTemporalRestore(store.getState()));
    },
    redo: () => {
      redo();
      store.setState(normalizeAfterTemporalRestore(store.getState()));
    },
  });

  return store;
}

export function createEditorStore(initial?: EditorInitialState): EditorStoreApi {
  const store = createStore<EditorState>()(createEditorStateCreator(initial)) as EditorStoreApi;
  attachPresentationHistoryClear(store);
  attachTemporalSelectionNormalization(store);
  return store;
}

export const useEditorStore = create<EditorState>()(
  createEditorStateCreator(),
) as EditorStoreApi & {
  (): EditorState;
  <T>(selector: (state: EditorState) => T): T;
};

attachPresentationHistoryClear(useEditorStore);
attachTemporalSelectionNormalization(useEditorStore);

export function useEditorTemporalStore<T>(
  selector: (state: TemporalState<PartializedEditorState>) => T,
): T {
  return useStore(useEditorStore.temporal, selector);
}

export const editorTemporalControls = {
  undo: () => {
    useEditorStore.temporal.getState().undo();
  },
  redo: () => {
    useEditorStore.temporal.getState().redo();
  },
  clear: () => {
    useEditorStore.temporal.getState().clear();
  },
  canUndo: () => useEditorStore.temporal.getState().pastStates.length > 0,
  canRedo: () => useEditorStore.temporal.getState().futureStates.length > 0,
};
