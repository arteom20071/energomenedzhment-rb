import { describe, expect, it, vi } from "vitest";

import {
  createCanvasKeyboardHandler,
  isEditableTarget,
  NUDGE_LARGE,
  NUDGE_SMALL,
  ROTATE_SMALL,
} from "./keyboard";

describe("keyboard helpers", () => {
  it("detects editable focus targets", () => {
    expect(isEditableTarget(document.createElement("input"))).toBe(true);
    expect(isEditableTarget(document.createElement("textarea"))).toBe(true);
    expect(isEditableTarget(document.createElement("select"))).toBe(true);

    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    expect(isEditableTarget(editable)).toBe(true);

    expect(isEditableTarget(document.createElement("button"))).toBe(false);
  });

  it("nudges selection with arrow keys", () => {
    const commit = vi.fn();
    const handler = createCanvasKeyboardHandler({
      selectedIds: ["a"],
      isEditing: false,
      commitNudge: commit,
      deleteSelected: vi.fn(),
      duplicateSelected: vi.fn(),
    });

    handler(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(commit).toHaveBeenCalledWith(NUDGE_SMALL, 0);

    commit.mockClear();
    handler(
      new KeyboardEvent("keydown", { key: "ArrowUp", shiftKey: true, bubbles: true }),
    );
    expect(commit).toHaveBeenCalledWith(0, -NUDGE_LARGE);
  });

  it("supports rotate and resize keyboard transforms", () => {
    const commitRotate = vi.fn();
    const commitResize = vi.fn();
    const handler = createCanvasKeyboardHandler({
      selectedIds: ["a"],
      isEditing: false,
      commitNudge: vi.fn(),
      commitRotate,
      commitResize,
      deleteSelected: vi.fn(),
      duplicateSelected: vi.fn(),
    });

    handler(new KeyboardEvent("keydown", { key: "]", bubbles: true }));
    expect(commitRotate).toHaveBeenCalledWith(ROTATE_SMALL);

    handler(
      new KeyboardEvent("keydown", { key: "ArrowRight", altKey: true, bubbles: true }),
    );
    expect(commitResize).toHaveBeenCalledWith(NUDGE_SMALL, 0);
  });

  it("handles delete and duplicate shortcuts", () => {
    const deleteSelected = vi.fn();
    const duplicateSelected = vi.fn();
    const handler = createCanvasKeyboardHandler({
      selectedIds: ["a"],
      isEditing: false,
      commitNudge: vi.fn(),
      deleteSelected,
      duplicateSelected,
    });

    handler(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }));
    expect(deleteSelected).toHaveBeenCalledOnce();

    handler(new KeyboardEvent("keydown", { key: "d", ctrlKey: true, bubbles: true }));
    expect(duplicateSelected).toHaveBeenCalledOnce();
  });

  it("ignores shortcuts while editing or focused in inputs", () => {
    const deleteSelected = vi.fn();
    const handler = createCanvasKeyboardHandler({
      selectedIds: ["a"],
      isEditing: true,
      commitNudge: vi.fn(),
      deleteSelected,
      duplicateSelected: vi.fn(),
    });

    handler(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }));
    expect(deleteSelected).not.toHaveBeenCalled();
  });
});
