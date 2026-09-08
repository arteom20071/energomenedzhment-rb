import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { createPresentation, createTextElement } from "../../domain/factories";
import { PresentationMode } from "./PresentationMode";
import { isTypingTarget, usePresentationMode } from "./usePresentationMode";
import { renderHook, act } from "@testing-library/react";

describe("isTypingTarget", () => {
  it("detects input textarea select and contenteditable", () => {
    const input = document.createElement("input");
    expect(isTypingTarget(input)).toBe(true);

    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    expect(isTypingTarget(editable)).toBe(true);

    const div = document.createElement("div");
    expect(isTypingTarget(div)).toBe(false);
  });
});

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
  });

  it("ignores navigation keys while typing in input", () => {
    const { result } = renderHook(() =>
      usePresentationMode({ slideCount: 3, initialSlideIndex: 0 }),
    );

    act(() => {
      result.current.enter();
    });

    const input = document.createElement("input");
    document.body.appendChild(input);
    const event = new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true });
    Object.defineProperty(event, "target", { value: input });

    act(() => {
      result.current.handleKeyDown(event);
    });

    expect(result.current.state.currentSlideIndex).toBe(0);
    input.remove();
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
      result.current.handleKeyDown(new KeyboardEvent("keydown", { key: "End" }));
    });
    expect(result.current.state.currentSlideIndex).toBe(4);

    act(() => {
      result.current.handleKeyDown(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(result.current.state.isActive).toBe(false);
  });

  it("updates isFullscreen from fullscreenchange", () => {
    const { result } = renderHook(() =>
      usePresentationMode({ slideCount: 2 }),
    );

    act(() => {
      result.current.enter();
      document.dispatchEvent(new Event("fullscreenchange"));
    });

    expect(result.current.state.isFullscreen).toBe(false);
  });
});

describe("tryEnterFullscreen", () => {
  it("handles sync throws and rejected promises", async () => {
    const { tryEnterFullscreen } = await import("./usePresentationMode");
    const element = document.createElement("div");

    await expect(
      tryEnterFullscreen(element, () => {
        throw new Error("sync");
      }),
    ).resolves.toBe(false);

    await expect(
      tryEnterFullscreen(element, () => Promise.reject(new Error("async"))),
    ).resolves.toBe(false);
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
    expect(screen.getByText("Hello slide").closest(".element-outer")).toBeTruthy();
    expect(screen.getByText("Hello slide").closest(".element-inner")).toBeTruthy();

    const exitButton = screen.getByRole("button", { name: "Выйти из режима презентации" });
    fireEvent.click(exitButton);
    expect(onExit).toHaveBeenCalled();
  });

  it("stages slide transition classes across animation frames", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 1;
    });

    const presentation = createPresentation("Stage");
    presentation.slides[0]!.transition = "slide";

    const { rerender } = render(
      <PresentationMode
        presentation={presentation}
        currentSlideIndex={0}
        onExit={() => undefined}
        requestFullscreen={async () => undefined}
        exitFullscreen={async () => undefined}
      />,
    );

    presentation.slides.push({ ...presentation.slides[0]!, id: "slide-2" });
    rerender(
      <PresentationMode
        presentation={presentation}
        currentSlideIndex={1}
        onExit={() => undefined}
        requestFullscreen={async () => undefined}
        exitFullscreen={async () => undefined}
      />,
    );

    expect(document.querySelector(".presentation-slide.stage-enter")).toBeTruthy();
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });
});
