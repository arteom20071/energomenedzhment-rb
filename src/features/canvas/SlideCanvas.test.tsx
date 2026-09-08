import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";

import {
  createPresentation,
  createTextElement,
  createImageElement,
  resetIdGenerator,
  setIdGenerator,
} from "../../domain/factories";
import { createEditorStore, type EditorStoreApi } from "../../store/editorStore";
import { SlideCanvas } from "./SlideCanvas";

vi.mock("react-moveable", () => ({
  default: ({
    onDragStart,
    onDrag,
    onDragEnd,
    onResize,
    onResizeEnd,
    onRotate,
    onRotateEnd,
  }: {
    onDragStart?: () => void;
    onDrag?: (event: { target: HTMLElement; translate: number[] }) => void;
    onDragEnd?: (event: { target: HTMLElement; lastEvent?: { translate: number[] } }) => void;
    onResize?: (event: { target: HTMLElement; width: number; height: number; drag: { translate: number[] } }) => void;
    onResizeEnd?: (event: { target: HTMLElement; lastEvent?: { width: number; height: number; drag: { translate: number[] } } }) => void;
    onRotate?: (event: { target: HTMLElement; rotate: number; drag: { translate: number[] } }) => void;
    onRotateEnd?: (event: { target: HTMLElement; lastEvent?: { rotate: number; drag: { translate: number[] } } }) => void;
  }) => (
    <div data-testid="moveable-mock">
      <button
        type="button"
        data-testid="moveable-drag"
        onClick={() => {
          const target = document.querySelector('[data-element-id="el-a"]') as HTMLElement;
          onDragStart?.();
          onDrag?.({ target, translate: [20, 10] });
          onDragEnd?.({ target, lastEvent: { translate: [20, 10] } });
        }}
      >
        drag
      </button>
      <button
        type="button"
        data-testid="moveable-resize"
        onClick={() => {
          const target = document.querySelector('[data-element-id="el-a"]') as HTMLElement;
          onResize?.({ target, width: 200, height: 100, drag: { translate: [0, 0] } });
          onResizeEnd?.({
            target,
            lastEvent: { width: 200, height: 100, drag: { translate: [0, 0] } },
          });
        }}
      >
        resize
      </button>
      <button
        type="button"
        data-testid="moveable-rotate"
        onClick={() => {
          const target = document.querySelector('[data-element-id="el-a"]') as HTMLElement;
          onRotate?.({ target, rotate: 10, drag: { translate: [0, 0] } });
          onRotateEnd?.({ target, lastEvent: { rotate: 10, drag: { translate: [0, 0] } } });
        }}
      >
        rotate
      </button>
    </div>
  ),
}));

vi.mock("react-selecto", () => ({
  default: ({
    onSelect,
    onSelectEnd,
  }: {
    onSelect?: (event: { selected: HTMLElement[]; added: HTMLElement[]; removed: HTMLElement[]; inputEvent?: MouseEvent }) => void;
    onSelectEnd?: (event: { selected: HTMLElement[]; isDragStartEnd?: boolean; inputEvent?: MouseEvent }) => void;
  }) => (
    <div data-testid="selecto-mock">
      <button
        type="button"
        data-testid="selecto-select"
        onClick={() => {
          const selected = [
            document.querySelector('[data-element-id="el-a"]'),
            document.querySelector('[data-element-id="el-b"]'),
          ].filter(Boolean) as HTMLElement[];
          onSelect?.({ selected, added: selected, removed: [] });
          onSelectEnd?.({ selected, isDragStartEnd: true });
        }}
      >
        marquee
      </button>
      <button
        type="button"
        data-testid="selecto-clear"
        onClick={() => {
          onSelectEnd?.({ selected: [], isDragStartEnd: false });
        }}
      >
        clear
      </button>
    </div>
  ),
}));

function buildStore(): EditorStoreApi {
  let counter = 0;
  setIdGenerator(() => `gen-${++counter}`);
  const presentation = createPresentation("Canvas");
  const slide = presentation.slides[0]!;
  slide.elements = [
    createTextElement(slide.elements, {
      id: "el-a",
      x: 100,
      y: 100,
      width: 200,
      height: 80,
      content: "Alpha",
    }),
    createTextElement(slide.elements, {
      id: "el-b",
      x: 400,
      y: 200,
      width: 200,
      height: 80,
      content: "Beta",
    }),
  ];
  resetIdGenerator();
  return createEditorStore({ presentation });
}

function CanvasHarness({ store }: { store: EditorStoreApi }) {
  const slide = useStore(store, (state) =>
    state.presentation.slides.find((item) => item.id === state.activeSlideId),
  )!;
  const selectedIds = useStore(store, (state) => state.selectedElementIds);
  const zoom = useStore(store, (state) => state.zoom);
  const editingTextId = useStore(store, (state) => state.editingTextId);
  const cropElementId = useStore(store, (state) => state.cropElementId);

  return (
    <SlideCanvas
      slide={slide}
      selectedIds={selectedIds}
      zoom={zoom}
      editingTextId={editingTextId}
      cropElementId={cropElementId}
      onSelectionChange={(ids) => store.getState().setSelection(ids)}
      onToggleSelection={(id) => store.getState().toggleSelection(id)}
      onClearSelection={() => store.getState().clearSelection()}
      onCommitTransforms={(updates) => store.getState().commitElementTransforms(updates)}
      onUpdateElement={(id, changes) => store.getState().updateElement(id, changes)}
      onSetEditingTextId={(id) => store.getState().setEditingTextId(id)}
      onSetCropElementId={(id) => store.getState().setCropElementId(id)}
      onDeleteSelected={() => store.getState().deleteSelectedElements()}
      onDuplicateSelected={() => store.getState().duplicateSelectedElements()}
    />
  );
}

beforeEach(() => {
  resetIdGenerator();
});

describe("SlideCanvas", () => {
  it("commits one transform update after drag gesture ends", async () => {
    const store = buildStore();
    store.getState().setSelection(["el-a"]);
    const commitSpy = vi.spyOn(store.getState(), "commitElementTransforms");

    render(<CanvasHarness store={store} />);
    fireEvent.click(screen.getByTestId("moveable-drag"));

    await waitFor(() => {
      expect(commitSpy).toHaveBeenCalledTimes(1);
    });

    const element = store
      .getState()
      .presentation.slides[0]!
      .elements.find((el) => el.id === "el-a");
    expect(element?.x).toBe(120);
    expect(element?.y).toBe(110);
  });

  it("supports marquee multi-selection through selecto adapter", () => {
    const store = buildStore();
    render(<CanvasHarness store={store} />);

    fireEvent.click(screen.getByTestId("selecto-select"));
    expect(store.getState().selectedElementIds.sort()).toEqual(["el-a", "el-b"]);
  });

  it("clears selection on empty canvas click", () => {
    const store = buildStore();
    store.getState().setSelection(["el-a"]);
    render(<CanvasHarness store={store} />);

    fireEvent.click(screen.getByTestId("selecto-clear"));
    expect(store.getState().selectedElementIds).toEqual([]);
  });

  it("enters inline text editing on double-click", () => {
    const store = buildStore();
    render(<CanvasHarness store={store} />);

    fireEvent.doubleClick(screen.getByTestId("element-el-a"));
    expect(store.getState().editingTextId).toBe("el-a");
    expect(screen.getByRole("textbox")).toHaveTextContent("Alpha");
  });

  it("enters image crop mode on image double-click", () => {
    const store = buildStore();
    const slide = store.getState().presentation.slides[0]!;
    slide.elements.push(
      createImageElement(slide.elements, {
        id: "img-1",
        x: 50,
        y: 50,
        width: 300,
        height: 200,
        content: "https://example.com/photo.jpg",
      }),
    );

    render(<CanvasHarness store={store} />);
    fireEvent.doubleClick(screen.getByTestId("element-img-1"));
    expect(store.getState().cropElementId).toBe("img-1");
    expect(screen.getByRole("dialog", { name: /crop image/i })).toBeInTheDocument();
  });
});
