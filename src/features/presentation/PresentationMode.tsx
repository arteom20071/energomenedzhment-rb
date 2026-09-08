import { useEffect, useRef, useState, type ReactElement } from "react";

import type { Presentation, Slide, SlideElement } from "../../domain/presentation";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../domain/presentation";
import {
  serializeBorder,
  serializeColor,
  serializeFontFamily,
  serializeFontWeight,
  serializeLineHeight,
  serializeObjectFit,
  serializePlainText,
  serializeTextAlign,
} from "../../services/export/cssSafety";
import { tryEnterFullscreen, tryExitFullscreen } from "./usePresentationMode";

export interface PresentationModeProps {
  presentation: Presentation;
  currentSlideIndex: number;
  onExit: () => void;
  requestFullscreen?: (element: HTMLElement) => Promise<void>;
  exitFullscreen?: () => Promise<void>;
}

function renderTextInner(element: SlideElement): ReactElement {
  const styles = element.styles as Record<string, unknown>;
  return (
    <div
      className="element-inner text-content"
      style={{
        fontSize: typeof styles.fontSize === "number" ? styles.fontSize : 32,
        color: serializeColor(styles.color, "#111827"),
        fontFamily: serializeFontFamily(styles.fontFamily, "Inter, sans-serif"),
        fontWeight: serializeFontWeight(styles.fontWeight, "normal"),
        textAlign: serializeTextAlign(styles.textAlign, "left") as "left" | "center" | "right",
        lineHeight: Number(serializeLineHeight(styles.lineHeight, 1.2)),
        whiteSpace: "pre-wrap",
        width: "100%",
        height: "100%",
      }}
    >
      {serializePlainText(element.content)}
    </div>
  );
}

function renderImageInner(element: SlideElement): ReactElement {
  const styles = element.styles as Record<string, unknown>;
  return (
    <img
      className="element-inner"
      src={serializePlainText(element.content)}
      alt={serializePlainText(styles.alt)}
      style={{
        width: "100%",
        height: "100%",
        objectFit: serializeObjectFit(styles.objectFit, "cover") as "cover" | "contain" | "fill",
      }}
    />
  );
}

function renderShapeInner(element: SlideElement): ReactElement {
  const styles = element.styles as Record<string, unknown>;
  return (
    <div
      className="element-inner shape-content"
      style={{
        width: "100%",
        height: "100%",
        background: serializeColor(styles.fill, "#6366f1"),
        borderRadius: typeof styles.borderRadius === "number" ? styles.borderRadius : 0,
        border: serializeBorder(styles.border, "none"),
      }}
    />
  );
}

function renderElement(element: SlideElement): ReactElement | null {
  const outerStyle = {
    position: "absolute" as const,
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    transform: `rotate(${element.rotation}deg)`,
    zIndex: element.zIndex,
  };

  switch (element.type) {
    case "text":
      return (
        <div
          key={element.id}
          className={`element-outer ${element.type}`}
          data-animation={element.animation ?? ""}
          style={outerStyle}
        >
          {renderTextInner(element)}
        </div>
      );
    case "image":
      return (
        <div
          key={element.id}
          className={`element-outer ${element.type}`}
          data-animation={element.animation ?? ""}
          style={outerStyle}
        >
          {renderImageInner(element)}
        </div>
      );
    case "shape":
      return (
        <div
          key={element.id}
          className={`element-outer ${element.type}`}
          data-animation={element.animation ?? ""}
          style={outerStyle}
        >
          {renderShapeInner(element)}
        </div>
      );
    default:
      return null;
  }
}

function renderSlide(slide: Slide, slideIndex: number): ReactElement {
  const elements = [...slide.elements].sort((a, b) => a.zIndex - b.zIndex);
  const isNone = slide.transition === "none";
  const transitionClass = isNone ? "transition-none" : `transition-${slide.transition}`;

  const activateSlide = (node: HTMLDivElement | null) => {
    if (!node || isNone) {
      return;
    }
    node.classList.add("stage-enter");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        node.classList.add("stage-active");
      });
    });
  };

  return (
    <div
      key={slideIndex}
      ref={activateSlide}
      className={`presentation-slide ${transitionClass}${isNone ? "" : " stage-enter"}`}
      style={{
        position: "relative",
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        background: serializeColor(slide.background, "#ffffff"),
      }}
    >
      {elements.map(renderElement)}
    </div>
  );
}

export function PresentationMode({
  presentation,
  currentSlideIndex,
  onExit,
  requestFullscreen,
  exitFullscreen,
}: PresentationModeProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const slide = presentation.slides[currentSlideIndex];
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const updateScale = () => {
      setScale(Math.min(window.innerWidth / CANVAS_WIDTH, window.innerHeight / CANVAS_HEIGHT));
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    void tryEnterFullscreen(container, requestFullscreen);
    return () => {
      void tryExitFullscreen(exitFullscreen);
    };
  }, [requestFullscreen, exitFullscreen]);

  useEffect(() => {
    const syncFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  if (!slide) {
    return (
      <div className="presentation-mode" data-testid="presentation-mode">
        <button type="button" aria-label="Выйти из режима презентации" onClick={onExit}>
          Выйти
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="presentation-mode"
      data-testid="presentation-mode"
      data-fullscreen={isFullscreen ? "true" : "false"}
      role="region"
      aria-label="Режим презентации"
      style={{
        position: "fixed",
        inset: 0,
        background: "#0f172a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        className="presentation-viewport"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {renderSlide(slide, currentSlideIndex)}
      </div>
      <button
        type="button"
        aria-label="Выйти из режима презентации"
        onClick={onExit}
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          padding: "8px 16px",
          background: "#6366f1",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        Выйти (Esc)
      </button>
      <style>{`
        .presentation-slide { transition: opacity 0.4s ease, transform 0.4s ease; opacity: 1; }
        .presentation-slide.transition-none { transition: none; opacity: 1; }
        .presentation-slide.stage-enter.transition-fade { opacity: 0; transform: translateX(0) scale(1); }
        .presentation-slide.stage-enter.transition-fade.stage-active { opacity: 1; transform: translateX(0) scale(1); }
        .presentation-slide.stage-enter.transition-slide { opacity: 0; transform: translateX(100%); }
        .presentation-slide.stage-enter.transition-slide.stage-active { opacity: 1; transform: translateX(0); }
        .presentation-slide.stage-enter.transition-zoom { opacity: 0; transform: scale(0.85); }
        .presentation-slide.stage-enter.transition-zoom.stage-active { opacity: 1; transform: scale(1); }
        .element-outer { position: absolute; }
        .element-inner { width: 100%; height: 100%; }
        .element-outer[data-animation="fade-up"] .element-inner { animation: presFadeUp 0.6s ease both; }
        .element-outer[data-animation="scale"] .element-inner { animation: presScale 0.5s ease both; }
        .element-outer[data-animation="bounce"] .element-inner { animation: presBounce 0.7s ease both; }
        @keyframes presFadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes presScale { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        @keyframes presBounce { 0% { opacity: 0; transform: scale(0.3); } 50% { transform: scale(1.05); } 70% { transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
