import { useCallback, useEffect, useState } from "react";

export interface PresentationModeState {
  isActive: boolean;
  currentSlideIndex: number;
  isFullscreen: boolean;
}

export interface UsePresentationModeOptions {
  slideCount: number;
  initialSlideIndex?: number;
  onExit?: (slideIndex: number) => void;
  onEnter?: (slideIndex: number) => void;
  requestFullscreen?: (element: HTMLElement) => Promise<void>;
  exitFullscreen?: () => Promise<void>;
}

export interface PresentationModeController {
  state: PresentationModeState;
  enter: () => void;
  exit: () => void;
  goTo: (index: number) => void;
  next: () => void;
  previous: () => void;
  first: () => void;
  last: () => void;
  handleKeyDown: (event: KeyboardEvent) => void;
}

function clampIndex(index: number, count: number): number {
  if (count <= 0) {
    return 0;
  }
  return Math.min(count - 1, Math.max(0, index));
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }

  if (target.isContentEditable) {
    return true;
  }

  const contentEditable = target.getAttribute("contenteditable");
  return contentEditable === "" || contentEditable === "true";
}

export function usePresentationMode(
  options: UsePresentationModeOptions,
): PresentationModeController {
  const slideCount = options.slideCount;
  const [state, setState] = useState<PresentationModeState>({
    isActive: false,
    currentSlideIndex: clampIndex(options.initialSlideIndex ?? 0, slideCount),
    isFullscreen: false,
  });

  const goTo = useCallback(
    (index: number) => {
      setState((prev) => ({
        ...prev,
        currentSlideIndex: clampIndex(index, slideCount),
      }));
    },
    [slideCount],
  );

  const next = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentSlideIndex: clampIndex(prev.currentSlideIndex + 1, slideCount),
    }));
  }, [slideCount]);

  const previous = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentSlideIndex: clampIndex(prev.currentSlideIndex - 1, slideCount),
    }));
  }, [slideCount]);

  const first = useCallback(() => {
    goTo(0);
  }, [goTo]);

  const last = useCallback(() => {
    goTo(slideCount - 1);
  }, [goTo, slideCount]);

  const enter = useCallback(() => {
    const index = clampIndex(options.initialSlideIndex ?? state.currentSlideIndex, slideCount);
    setState({
      isActive: true,
      currentSlideIndex: index,
      isFullscreen: false,
    });
    options.onEnter?.(index);
  }, [options, slideCount, state.currentSlideIndex]);

  const exit = useCallback(() => {
    const index = state.currentSlideIndex;
    setState((prev) => ({
      ...prev,
      isActive: false,
      isFullscreen: false,
    }));
    options.onExit?.(index);
  }, [options, state.currentSlideIndex]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        return;
      }

      if (!state.isActive) {
        if (event.key === "F5") {
          event.preventDefault();
          enter();
        }
        return;
      }

      switch (event.key) {
        case "Escape":
          event.preventDefault();
          exit();
          break;
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
        case " ":
          event.preventDefault();
          next();
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          event.preventDefault();
          previous();
          break;
        case "Home":
          event.preventDefault();
          first();
          break;
        case "End":
          event.preventDefault();
          last();
          break;
        default:
          break;
      }
    },
    [enter, exit, first, last, next, previous, state.isActive],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    const syncFullscreen = () => {
      setState((prev) => ({
        ...prev,
        isFullscreen: Boolean(document.fullscreenElement),
      }));
    };

    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
    };
  }, []);

  return {
    state,
    enter,
    exit,
    goTo,
    next,
    previous,
    first,
    last,
    handleKeyDown,
  };
}

export function tryEnterFullscreen(
  element: HTMLElement,
  requestFullscreen?: (target: HTMLElement) => Promise<void>,
): Promise<boolean> {
  try {
    const request = requestFullscreen ?? ((target) => target.requestFullscreen());
    return request(element)
      .then(() => true)
      .catch(() => false);
  } catch {
    return Promise.resolve(false);
  }
}

export function tryExitFullscreen(
  exitFullscreen?: () => Promise<void>,
): Promise<boolean> {
  if (!document.fullscreenElement) {
    return Promise.resolve(false);
  }

  try {
    const exit = exitFullscreen ?? (() => document.exitFullscreen());
    return exit()
      .then(() => true)
      .catch(() => false);
  } catch {
    return Promise.resolve(false);
  }
}
