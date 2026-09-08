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

type MoveableHandlerProps = Record<string, unknown>;

let capturedMoveableHandlers: MoveableHandlerProps = {};

function target(id: string): HTMLElement {
  const node = document.querySelector(`[data-element-id="${id}"]`) as HTMLElement;
  if (!node) {
    throw new Error(`Missing target ${id}`);
  }
  return node;
}

vi.mock("react-moveable", () => ({
  default: (props: MoveableHandlerProps) => {
    capturedMoveableHandlers = props;
    return <div data-testid="moveable-mock" />;
  },
}));

vi.mock("react-selecto", () => ({
  default: ({
    onSelect,
    onSelectEnd,
  }: {
    onSelect?: (event: {
      selected: HTMLElement[];
      added: HTMLElement[];
      removed: HTMLElement[];
      inputEvent?: MouseEvent;
    }) => void;
    onSelectEnd?: (event: {
      selected: HTMLElement[];
      isDragStartEnd?: boolean;
      inputEvent?: MouseEvent;
    }) => void;
  }) => (
    <div data-testid="selecto-mock">
      <button
        type="button"
        data-testid="selecto-select"
        onClick={() => {
          const selected = [target("el-a"), target("el-b")];
          onSelect?.({ selected, added: selected, removed: [] });
          onSelectEnd?.({ selected, isDragStartEnd: true });
        }}
      >
        marquee
      </button>
      <button
        type="button"
        data-testid="selecto-shift-add"
        onClick={() => {
          const added = [target("el-b")];
          onSelect?.({
            selected: [target("el-a"), target("el-b")],
            added,
            removed: [],
            inputEvent: { shiftKey: true } as MouseEvent,
          });
        }}
      >
        shift-add
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

function emitSingleDrag(zoom = 1) {
  const handlers = capturedMoveableHandlers as {
    onDragStart?: () => void;
    onDrag?: (event: { target: HTMLElement; translate: number[] }) => void;
    onDragEnd?: () => void;
  };
  handlers.onDragStart?.();
  handlers.onDrag?.({ target: target("el-a"), translate: [20 * zoom, 10 * zoom] });
  handlers.onDragEnd?.();
}

function emitSingleResize() {
  const handlers = capturedMoveableHandlers as {
    onResizeStart?: (event: { direction: string }) => void;
    onResize?: (event: {
      target: HTMLElement;
      width: number;
      height: number;
      drag: { translate: number[] };
    }) => void;
    onResizeEnd?: () => void;
  };
  handlers.onResizeStart?.({ direction: "e" });
  handlers.onResize?.({
    target: target("el-a"),
    width: 240,
    height: 80,
    drag: { translate: [0, 0] },
  });
  handlers.onResizeEnd?.();
}

function emitSingleRotate() {
  const handlers = capturedMoveableHandlers as {
    onRotateStart?: () => void;
    onRotate?: (event: {
      target: HTMLElement;
      rotate: number;
      drag: { translate: number[] };
    }) => void;
    onRotateEnd?: () => void;
  };
  handlers.onRotateStart?.();
  handlers.onRotate?.({
    target: target("el-a"),
    rotate: 10,
    drag: { translate: [0, 0] },
  });
  handlers.onRotateEnd?.();
}

function emitGroupDrag() {
  const handlers = capturedMoveableHandlers as {
    onDragGroupStart?: () => void;
    onDragGroup?: (event: {
      events: Array<{ target: HTMLElement; translate: number[] }>;
    }) => void;
    onDragGroupEnd?: () => void;
  };
  handlers.onDragGroupStart?.();
  handlers.onDragGroup?.({
    events: [
      { target: target("el-a"), translate: [20, 10] },
      { target: target("el-b"), translate: [20, 10] },
    ],
  });
  handlers.onDragGroupEnd?.();
}

function emitGroupResize() {
  const handlers = capturedMoveableHandlers as {
    onResizeGroupStart?: (event: { direction: string }) => void;
    onResizeGroup?: (event: {
      events: Array<{
        target: HTMLElement;
        width: number;
        height: number;
        drag: { translate: number[] };
      }>;
    }) => void;
    onResizeGroupEnd?: () => void;
  };
  handlers.onResizeGroupStart?.({ direction: "se" });
  handlers.onResizeGroup?.({
    events: [
      {
        target: target("el-a"),
        width: 220,
        height: 90,
        drag: { translate: [0, 0] },
      },
      {
        target: target("el-b"),
        width: 220,
        height: 90,
        drag: { translate: [0, 0] },
      },
    ],
  });
  handlers.onResizeGroupEnd?.();
}

function emitGroupRotate() {
  const handlers = capturedMoveableHandlers as {
    onRotateGroupStart?: () => void;
    onRotateGroup?: (event: {
      events: Array<{
        target: HTMLElement;
        rotate: number;
        drag: { translate: number[] };
      }>;
    }) => void;
    onRotateGroupEnd?: () => void;
  };
  handlers.onRotateGroupStart?.();
  handlers.onRotateGroup?.({
    events: [
      { target: target("el-a"), rotate: 12, drag: { translate: [0, 0] } },
      { target: target("el-b"), rotate: 12, drag: { translate: [0, 0] } },
    ],
  });
  handlers.onRotateGroupEnd?.();
}

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
      rotation: 0,
      content: "Alpha",
    }),
    createTextElement(slide.elements, {
      id: "el-b",
      x: 400,
      y: 200,
      width: 200,
      height: 80,
      rotation: 0,
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
  capturedMoveableHandlers = {};
});

describe("SlideCanvas", () => {
  it("commits one transform update after drag gesture ends", async () => {
    const store = buildStore();
    store.getState().setSelection(["el-a"]);
    const commitSpy = vi.spyOn(store.getState(), "commitElementTransforms");

    render(<CanvasHarness store={store} />);
    emitSingleDrag();

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

  it("commits resize using logical width/height at zoom 2", async () => {
    const store = buildStore();
    store.getState().setSelection(["el-a"]);
    store.getState().setZoom(2);
    const commitSpy = vi.spyOn(store.getState(), "commitElementTransforms");

    render(<CanvasHarness store={store} />);
    emitSingleResize();

    await waitFor(() => expect(commitSpy).toHaveBeenCalledTimes(1));
    const element = store
      .getState()
      .presentation.slides[0]!
      .elements.find((el) => el.id === "el-a");
    expect(element?.width).toBe(240);
    expect(element?.height).toBe(80);
  });

  it("commits rotation without positional snap side effects", async () => {
    const store = buildStore();
    store.getState().setSelection(["el-a"]);
    const commitSpy = vi.spyOn(store.getState(), "commitElementTransforms");

    render(<CanvasHarness store={store} />);
    emitSingleRotate();

    await waitFor(() => expect(commitSpy).toHaveBeenCalledTimes(1));
    const element = store
      .getState()
      .presentation.slides[0]!
      .elements.find((el) => el.id === "el-a");
    expect(element?.rotation).toBe(10);
    expect(element?.x).toBe(100);
    expect(element?.y).toBe(100);
  });

  it("group drag updates all selected previews and commits once", async () => {
    const store = buildStore();
    store.getState().setSelection(["el-a", "el-b"]);
    const commitSpy = vi.spyOn(store.getState(), "commitElementTransforms");
    const pastBefore = store.temporal.getState().pastStates.length;

    render(<CanvasHarness store={store} />);
    emitGroupDrag();

    await waitFor(() => expect(commitSpy).toHaveBeenCalledTimes(1));
    expect(commitSpy.mock.calls[0]?.[0]).toHaveLength(2);

    const elements = store.getState().presentation.slides[0]!.elements;
    expect(elements.find((el) => el.id === "el-a")).toMatchObject({ x: 120, y: 110 });
    expect(elements.find((el) => el.id === "el-b")).toMatchObject({ x: 420, y: 210 });
    expect(store.temporal.getState().pastStates.length).toBe(pastBefore + 1);
  });

  it("group resize and rotate each commit all changed elements once", async () => {
    const store = buildStore();
    store.getState().setSelection(["el-a", "el-b"]);
    const commitSpy = vi.spyOn(store.getState(), "commitElementTransforms");

    render(<CanvasHarness store={store} />);

    emitGroupResize();
    await waitFor(() => expect(commitSpy).toHaveBeenCalledTimes(1));
    expect(commitSpy.mock.calls[0]?.[0]).toHaveLength(2);

    emitGroupRotate();
    await waitFor(() => expect(commitSpy).toHaveBeenCalledTimes(2));
    expect(commitSpy.mock.calls[1]?.[0]).toHaveLength(2);

    const elements = store.getState().presentation.slides[0]!.elements;
    expect(elements.find((el) => el.id === "el-a")).toMatchObject({
      width: 220,
      height: 90,
      rotation: 12,
    });
    expect(elements.find((el) => el.id === "el-b")).toMatchObject({
      width: 220,
      height: 90,
      rotation: 12,
    });
  });

  it("supports shift-toggle multi-selection", () => {
    const store = buildStore();
    store.getState().setSelection(["el-a"]);
    render(<CanvasHarness store={store} />);

    fireEvent.click(screen.getByTestId("selecto-shift-add"));
    expect(store.getState().selectedElementIds.sort()).toEqual(["el-a", "el-b"]);
  });

  it("clears selection on empty canvas click", () => {
    const store = buildStore();
    store.getState().setSelection(["el-a"]);
    render(<CanvasHarness store={store} />);

    fireEvent.click(screen.getByTestId("selecto-clear"));
    expect(store.getState().selectedElementIds).toEqual([]);
  });

  it("text editing commits on blur and cancels on escape", () => {
    const store = buildStore();
    render(<CanvasHarness store={store} />);

    fireEvent.doubleClick(screen.getByTestId("element-el-a"));
    const editor = screen.getByRole("textbox");
    editor.textContent = "Updated";
    fireEvent.blur(editor);

    expect(
      store.getState().presentation.slides[0]!.elements.find((el) => el.id === "el-a")?.content,
    ).toBe("Updated");
    expect(store.getState().editingTextId).toBeNull();

    fireEvent.doubleClick(screen.getByTestId("element-el-a"));
    const editorAgain = screen.getByRole("textbox");
    editorAgain.textContent = "Discarded";
    fireEvent.keyDown(editorAgain, { key: "Escape" });
    expect(
      store.getState().presentation.slides[0]!.elements.find((el) => el.id === "el-a")?.content,
    ).toBe("Updated");
  });

  it("crop mode previews live, commits on enter, cancels on escape", () => {
    const store = buildStore();
    const slide = store.getState().presentation.slides[0]!;
    slide.elements.push(
      createImageElement(slide.elements, {
        id: "img-1",
        x: 50,
        y: 50,
        width: 300,
        height: 200,
        rotation: 30,
        content: "https://example.com/photo.jpg",
      }),
    );

    render(<CanvasHarness store={store} />);
    fireEvent.doubleClick(screen.getByTestId("element-img-1"));

    const dialog = screen.getByRole("dialog", { name: /crop image/i });
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    fireEvent.keyDown(dialog, { key: "=" });

    const image = screen.getByTestId("element-image-img-1");
    expect(image).toHaveStyle({ objectPosition: "51% 50%" });

    fireEvent.keyDown(dialog, { key: "Enter" });
    const committed = store
      .getState()
      .presentation.slides[0]!
      .elements.find((el) => el.id === "img-1");
    expect(committed?.styles.objectPosition).toBe("51% 50%");
    expect(committed?.styles.cropScale).toBeGreaterThan(1);
    expect(store.getState().cropElementId).toBeNull();

    fireEvent.doubleClick(screen.getByTestId("element-img-1"));
    fireEvent.keyDown(screen.getByRole("dialog", { name: /crop image/i }), { key: "Escape" });
    expect(store.getState().cropElementId).toBeNull();
    expect(committed?.styles.objectPosition).toBe("51% 50%");
  });

  it("resolves special-character ids without unsafe selectors", () => {
    const store = buildStore();
    const slide = store.getState().presentation.slides[0]!;
    slide.elements.push(
      createTextElement(slide.elements, {
        id: 'weird["id"]',
        x: 10,
        y: 10,
        width: 100,
        height: 40,
        content: "Odd",
      }),
    );

    store.getState().setSelection(['weird["id"]']);
    render(<CanvasHarness store={store} />);

    expect(screen.getByTestId('element-weird["id"]')).toBeInTheDocument();
    expect(capturedMoveableHandlers.target).toBeTruthy();
  });
});
