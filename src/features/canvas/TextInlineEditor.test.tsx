import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createTextElement } from "../../domain/factories";
import type { SlideElement } from "../../domain/presentation";
import { TextInlineEditor } from "./TextInlineEditor";

function textElement(overrides: Partial<SlideElement> = {}): SlideElement {
  return createTextElement([], {
    id: "text-1",
    x: 100,
    y: 100,
    width: 200,
    height: 80,
    content: "Original",
    ...overrides,
  });
}

describe("TextInlineEditor", () => {
  it("does not commit when Escape unmount is followed by blur", () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();

    render(
      <TextInlineEditor
        element={textElement()}
        scale={1}
        onCommit={onCommit}
        onCancel={onCancel}
      />,
    );

    const editor = screen.getByRole("textbox");
    editor.textContent = "Discarded";
    fireEvent.keyDown(editor, { key: "Escape" });
    fireEvent.blur(editor);

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("inherits text styles from the element", () => {
    render(
      <TextInlineEditor
        element={textElement({
          styles: { fontSize: 28, color: "#0f172a", fontFamily: "Inter, sans-serif" },
        })}
        scale={1}
        onCommit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("textbox")).toHaveStyle({
      fontSize: "28px",
      color: "rgb(15, 23, 42)",
      whiteSpace: "pre-wrap",
    });
  });
});
