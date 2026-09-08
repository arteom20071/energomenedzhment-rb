import { useEffect, useRef, useState, type ReactElement } from "react";

import type { Presentation, Slide, SlideElement } from "../../domain/presentation";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../domain/presentation";
import { tryEnterFullscreen, tryExitFullscreen } from "./usePresentationMode";

export interface PresentationModeProps {
  presentation: Presentation;
  currentSlideIndex: number;
  onExit: () => void;
  requestFullscreen?: (element: HTMLElement) => Promise<void>;
  exitFullscreen?: () => Promise<void>;
}

function renderTextElement(element: SlideElement): ReactElement {
  const styles = element.styles as Record<string, unknown>;
  return (
    <div
      key={element.id}
      className={`presentation-element animation-${element.animation ?? "none"}`}
      style={{
        position: "absolute",
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        transform: `rotate(${element.rotation}deg)`,
        zIndex: element.zIndex,
        fontSize: typeof styles.fontSize === "number" ? styles.fontSize : 32,
        color: typeof styles.color === "string" ? styles.color : "#111827",
        fontFamily: typeof styles.fontFamily === "string" ? styles.fontFamily : "Inter, sans-serif",
        fontWeight: typeof styles.fontWeight === "string" ? styles.fontWeight : "normal",
        textAlign: (typeof styles.textAlign === "string" ? styles.textAlign : "left") as
          | "left"
          | "center"
          | "right",
        lineHeight: typeof styles.lineHeight === "number" ? styles.lineHeight : 1.2,
        whiteSpace: "pre-wrap",
      }}
    >
      {element.content ?? ""}
    </div>
  );
}

function renderImageElement(element: SlideElement): ReactElement {
  const styles = element.styles as Record<string, unknown>;
  return (
    <div
      key={element.id}
      className={`presentation-element animation-${element.animation ?? "none"}`}
      style={{
        position: "absolute",
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        transform: `rotate(${element.rotation}deg)`,
        zIndex: element.zIndex,
        overflow: "hidden",
      }}
    >
      <img
        src={element.content ?? ""}
        alt={typeof styles.alt === "string" ? styles.alt : ""}
        style={{
          width: "100%",
          height: "100%",
          objectFit: (typeof styles.objectFit === "string" ? styles.objectFit : "cover") as
            | "cover"
            | "contain"
            | "fill",
        }}
      />
    </div>
  );
}

function renderShapeElement(element: SlideElement): ReactElement {
  const styles = element.styles as Record<string, unknown>;
  return (
    <div
      key={element.id}
      className={`presentation-element animation-${element.animation ?? "none"}`}
      style={{
        position: "absolute",
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        transform: `rotate(${element.rotation}deg)`,
        zIndex: element.zIndex,
        background: typeof styles.fill === "string" ? styles.fill : "#6366f1",
        borderRadius: typeof styles.borderRadius === "number" ? styles.borderRadius : 0,
        border: typeof styles.border === "string" ? styles.border : "none",
      }}
    />
  );
}

function renderElement(element: SlideElement): ReactElement | null {
  switch (element.type) {
    case "text":
      return renderTextElement(element);
    case "image":
      return renderImageElement(element);
    case "shape":
      return renderShapeElement(element);
    default:
      return null;
  }
}

function renderSlide(slide: Slide, transitionClass: string): ReactElement {
  const elements = [...slide.elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div
      className={`presentation-slide ${transitionClass}`}
      style={{
        position: "relative",
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        background: slide.background,
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

  if (!slide) {
    return (
      <div className="presentation-mode" data-testid="presentation-mode">
        <button type="button" aria-label="Выйти из режима презентации" onClick={onExit}>
          Выйти
        </button>
      </div>
    );
  }

  const transitionClass = `transition-${slide.transition}`;

  return (
    <div
      ref={containerRef}
      className="presentation-mode"
      data-testid="presentation-mode"
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
        {renderSlide(slide, transitionClass)}
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
        .presentation-element.animation-fade-up { animation: presFadeUp 0.6s ease both; }
        .presentation-element.animation-scale { animation: presScale 0.5s ease both; }
        .presentation-element.animation-bounce { animation: presBounce 0.7s ease both; }
        @keyframes presFadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes presScale { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        @keyframes presBounce { 0% { opacity: 0; transform: scale(0.3); } 50% { transform: scale(1.05); } 70% { transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
