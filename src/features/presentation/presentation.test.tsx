import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { createPresentation, createTextElement } from "../../domain/factories";
import { PresentationMode } from "./PresentationMode";
import { usePresentationMode } from "./usePresentationMode";
import { renderHook, act } from "@testing-library/react";

describe("usePresentationMode", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("enters on F5 and prevents default", () => {
    const { result } = renderHook(() =>
      usePresentationMode({ slideCount: 3, initialSlideIndex: 1 }),
    );

    const event = new KeyboardEvent("keydown", { key: "F5", cancelable: true });
    act(() => {
      result.current.handleKeyDown(event);
    });

    expect(event.defaultPrevented).toBe(true);
    expect(result.current.state.isActive).toBe(true);
    expect(result.current.state.currentSlideIndex).toBe(1);
  });

  it("exits on Escape and navigates with arrows and page keys", () => {
    const { result } = renderHook(() =>
      usePresentationMode({ slideCount: 5, initialSlideIndex: 0 }),
    );

    act(() => {
      result.current.enter();
    });

    act(() => {
      result.current.handleKeyDown(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    });
    expect(result.current.state.currentSlideIndex).toBe(1);

    act(() => {
      result.current.handleKeyDown(new KeyboardEvent("keydown", { key: "PageDown" }));
    });
    expect(result.current.state.currentSlideIndex).toBe(2);

    act(() => {
      result.current.handleKeyDown(new KeyboardEvent("keydown", { key: "Home" }));
    });
    expect(result.current.state.currentSlideIndex).toBe(0);

    act(() => {
      result.current.handleKeyDown(new KeyboardEvent("keydown", { key: "End" }));
    });
    expect(result.current.state.currentSlideIndex).toBe(4);

    act(() => {
      result.current.handleKeyDown(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(result.current.state.isActive).toBe(false);
  });

  it("calls onExit with current slide index", () => {
    const onExit = vi.fn();
    const { result } = renderHook(() =>
      usePresentationMode({ slideCount: 2, onExit, initialSlideIndex: 1 }),
    );

    act(() => {
      result.current.enter();
      result.current.exit();
    });

    expect(onExit).toHaveBeenCalledWith(1);
  });
});

describe("PresentationMode", () => {
  it("renders slide content without editor panels and provides accessible exit", () => {
    const presentation = createPresentation("Show");
    const slide = presentation.slides[0]!;
    slide.elements.push(createTextElement(slide.elements, { content: "Hello slide" }));

    const onExit = vi.fn();
    render(
      <PresentationMode
        presentation={presentation}
        currentSlideIndex={0}
        onExit={onExit}
        requestFullscreen={async () => undefined}
        exitFullscreen={async () => undefined}
      />,
    );

    expect(screen.getByTestId("presentation-mode")).toBeInTheDocument();
    expect(screen.getByText("Hello slide")).toBeInTheDocument();
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();

    const exitButton = screen.getByRole("button", { name: "Выйти из режима презентации" });
    fireEvent.click(exitButton);
    expect(onExit).toHaveBeenCalled();
  });
});
