import { temporal } from "zundo";
import { create } from "zustand";
import { createStore, type Mutate, type StoreApi } from "zustand/vanilla";
import { useStore } from "zustand";
import type { TemporalState } from "zundo";

import {
  createPresentation,
  createSlide,
  generateId,
} from "../domain/factories";
import { parsePresentation } from "../domain/presentation";
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

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;
const HISTORY_LIMIT = 100;

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

function normalizeZIndices(elements: SlideElement[]): SlideElement[] {
  return [...elements]
    .sort((left, right) => left.zIndex - right.zIndex || left.id.localeCompare(right.id))
    .map((element, index) => ({ ...element, zIndex: index }));
}

function applyZOrderChange(
  elements: SlideElement[],
  selectedIds: string[],
  mode: "forward" | "backward" | "front" | "back",
): SlideElement[] {
  if (selectedIds.length === 0) {
    return elements;
  }

  const selectedSet = new Set(selectedIds);
  let updated = normalizeZIndices(elements);

  const moveOneStep = (direction: "forward" | "backward") => {
    const ordered =
      direction === "forward"
        ? [...selectedIds].sort(
            (leftId, rightId) =>
              updated.find((element) => element.id === rightId)!.zIndex -
              updated.find((element) => element.id === leftId)!.zIndex,
          )
        : [...selectedIds].sort(
            (leftId, rightId) =>
              updated.find((element) => element.id === leftId)!.zIndex -
              updated.find((element) => element.id === rightId)!.zIndex,
          );

    for (const elementId of ordered) {
      const currentIndex = updated.findIndex((element) => element.id === elementId);
      if (currentIndex === -1) {
        continue;
      }

      const swapIndex = direction === "forward" ? currentIndex + 1 : currentIndex - 1;
      if (swapIndex < 0 || swapIndex >= updated.length) {
        continue;
      }

      updated = updated.map((element, index) => {
        if (index === currentIndex) {
          return { ...element, zIndex: updated[swapIndex]!.zIndex };
        }
        if (index === swapIndex) {
          return { ...element, zIndex: updated[currentIndex]!.zIndex };
        }
        return element;
      });
      updated = normalizeZIndices(updated);
    }
  };

  if (mode === "forward") {
    moveOneStep("forward");
  } else if (mode === "backward") {
    moveOneStep("backward");
  } else if (mode === "front") {
    const maxZIndex = Math.max(...updated.map((element) => element.zIndex));
    let nextZIndex = maxZIndex;
    updated = updated.map((element) => {
      if (!selectedSet.has(element.id)) {
        return element;
      }
      nextZIndex += 1;
      return { ...element, zIndex: nextZIndex };
    });
  } else {
    updated = updated.map((element) =>
      selectedSet.has(element.id) ? { ...element, zIndex: -1_000_000 } : element,
    );
  }

  return normalizeZIndices(updated);
}

function duplicateElements(elements: SlideElement[]): SlideElement[] {
  return elements.map((element) => ({
    ...element,
    id: generateId(),
    x: element.x + 20,
    y: element.y + 20,
  }));
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
          throw new Error(validated.errors.map((error) => error.message).join("; "));
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
        set({ selectedElementIds: [...new Set(elementIds)] });
      },
      toggleSelection: (elementId) => {
        set((state) => {
          const selected = new Set(state.selectedElementIds);
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
        const slide = createSlide();
        set((state) => ({
          presentation: {
            ...state.presentation,
            slides: [...state.presentation.slides, slide],
          },
          activeSlideId: slide.id,
          selectedElementIds: [],
          editingTextId: null,
          cropElementId: null,
          saveStatus: "dirty",
        }));
      },
      duplicateSlide: (slideId) => {
        set((state) => {
          const slideIndex = state.presentation.slides.findIndex((slide) => slide.id === slideId);
          if (slideIndex === -1) {
            return state;
          }

          const source = state.presentation.slides[slideIndex]!;
          const duplicate: Slide = {
            ...source,
            id: generateId(),
            elements: source.elements.map((element) => ({
              ...element,
              id: generateId(),
            })),
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

          const slideIndex = state.presentation.slides.findIndex((slide) => slide.id === slideId);
          if (slideIndex === -1) {
            return state;
          }

          const slides = state.presentation.slides.filter((slide) => slide.id !== slideId);
          const nextActiveSlide =
            slides[Math.min(slideIndex, slides.length - 1)] ?? slides[0];

          return {
            presentation: { ...state.presentation, slides },
            activeSlideId: nextActiveSlide?.id ?? "",
            selectedElementIds: [],
            editingTextId: null,
            cropElementId: null,
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

          return {
            presentation: {
              ...state.presentation,
              slides: state.presentation.slides.map((slide) =>
                slide.id === activeSlide.id
                  ? {
                      ...slide,
                      elements: normalizeZIndices([...slide.elements, element]),
                    }
                  : slide,
              ),
            },
            selectedElementIds: [element.id],
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
          const duplicates = duplicateElements(selectedElements);

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
            saveStatus: "dirty" as const,
          };
        });
      },
      setZoom: (zoom) => {
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

export function createEditorStore(initial?: EditorInitialState): EditorStoreApi {
  const store = createStore<EditorState>()(createEditorStateCreator(initial)) as EditorStoreApi;
  return attachPresentationHistoryClear(store);
}

export const useEditorStore = create<EditorState>()(
  createEditorStateCreator(),
) as EditorStoreApi & {
  (): EditorState;
  <T>(selector: (state: EditorState) => T): T;
};

attachPresentationHistoryClear(useEditorStore);

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
