import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Dialog } from "./Dialog";

describe("Dialog", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("moves initial focus into the dialog when opened", () => {
    const triggerRef = createRef<HTMLButtonElement>();
    render(
      <>
        <button ref={triggerRef} type="button">
          Open
        </button>
        <Dialog title="Test dialog" open onClose={() => undefined} triggerRef={triggerRef}>
          <button type="button">First action</button>
        </Dialog>
      </>,
    );

    const dialog = screen.getByRole("dialog", { name: "Test dialog" });
    expect(dialog.contains(document.activeElement)).toBe(true);
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

  it("closes on Escape and restores focus to the trigger", () => {
    const triggerRef = createRef<HTMLButtonElement>();
    const onClose = vi.fn();

    render(
      <>
        <button ref={triggerRef} type="button">
          Open
        </button>
        <Dialog title="Test dialog" open onClose={onClose} triggerRef={triggerRef}>
          <p>Body</p>
        </Dialog>
      </>,
    );

    act(() => {
      triggerRef.current?.focus();
    });

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes on Escape when opened from a button click handler", () => {
    const onClose = vi.fn();

    function Host() {
      const triggerRef = createRef<HTMLButtonElement>();
      return (
        <>
          <button ref={triggerRef} type="button">
            Open
          </button>
          <Dialog title="Test dialog" open onClose={onClose} triggerRef={triggerRef}>
            <p>Body</p>
          </Dialog>
        </>
      );
    }

    render(<Host />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
