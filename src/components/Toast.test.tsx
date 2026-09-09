import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider, useToast } from "./Toast";

function ToastHarness() {
  const { showToast } = useToast();
  return (
    <button
      type="button"
      onClick={() =>
        showToast("Test toast", {
          label: "Action",
          onClick: () => undefined,
        })
      }
    >
      Show toast
    </button>
  );
}

describe("ToastProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("clears pending dismiss timers on unmount", () => {
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");

    const { unmount } = render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );

    act(() => {
      screen.getByRole("button", { name: "Show toast" }).click();
    });

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
