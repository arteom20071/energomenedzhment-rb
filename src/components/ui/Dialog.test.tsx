import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef, useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Dialog } from "./Dialog";

describe("Dialog", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not move focus on initial closed mount", () => {
    const triggerRef = createRef<HTMLButtonElement>();
    const externalRef = createRef<HTMLButtonElement>();

    render(
      <>
        <button ref={externalRef} type="button">
          External
        </button>
        <button ref={triggerRef} type="button">
          Open
        </button>
        <Dialog title="Test dialog" open={false} onClose={() => undefined} triggerRef={triggerRef}>
          <button type="button">First action</button>
        </Dialog>
      </>,
    );

    act(() => {
      externalRef.current?.focus();
    });

    expect(document.activeElement).toBe(externalRef.current);
  });

  it("restores focus to the trigger after click-open close", () => {
    function Host() {
      const triggerRef = useRef<HTMLButtonElement>(null);
      const [open, setOpen] = useState(false);

      return (
        <>
          <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>
            Open
          </button>
          <Dialog title="Test dialog" open={open} onClose={() => setOpen(false)} triggerRef={triggerRef}>
            <button type="button">First action</button>
          </Dialog>
        </>
      );
    }

    render(<Host />);

    const trigger = screen.getByRole("button", { name: "Open" });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Test dialog" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.activeElement).toBe(trigger);
  });

  it("restores focus to the previously focused field after shortcut-open close", () => {
    function Host() {
      const triggerRef = useRef<HTMLButtonElement>(null);
      const [open, setOpen] = useState(false);

      return (
        <>
          <input
            aria-label="Title field"
            onKeyDown={(event) => {
              if (event.key === "?") {
                event.preventDefault();
                setOpen(true);
              }
            }}
          />
          <button ref={triggerRef} type="button" aria-label="Help">
            Help
          </button>
          <Dialog title="Test dialog" open={open} onClose={() => setOpen(false)} triggerRef={triggerRef}>
            <button type="button">First action</button>
          </Dialog>
        </>
      );
    }

    render(<Host />);

    const titleField = screen.getByRole("textbox", { name: "Title field" });
    act(() => {
      titleField.focus();
    });

    fireEvent.keyDown(titleField, { key: "?" });
    expect(screen.getByRole("dialog", { name: "Test dialog" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.activeElement).toBe(titleField);
  });

  it("traps Tab focus within the dialog", () => {
    const triggerRef = createRef<HTMLButtonElement>();
    render(
      <>
        <button ref={triggerRef} type="button">
          Open
        </button>
        <Dialog title="Test dialog" open onClose={() => undefined} triggerRef={triggerRef}>
          <button type="button">Action A</button>
          <button type="button">Action B</button>
        </Dialog>
      </>,
    );

    const actionA = screen.getByRole("button", { name: "Action A" });
    const actionB = screen.getByRole("button", { name: "Action B" });
    const closeButton = screen.getByRole("button", { name: "Закрыть" });

    actionA.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(actionB);

    closeButton.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(actionA);
  });
});
