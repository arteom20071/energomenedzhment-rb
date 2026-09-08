import { useCallback, useEffect, useState } from "react";

import type { SlideElement } from "../../domain/presentation";

export interface ImageCropOverlayProps {
  element: SlideElement;
  scale: number;
  onCommit: (styles: { objectPosition: string; cropScale: number }) => void;
  onCancel: () => void;
}

function parseObjectPosition(value: unknown): { x: number; y: number } {
  if (typeof value !== "string") {
    return { x: 50, y: 50 };
  }

  const parts = value.trim().split(/\s+/);
  const parsePart = (part: string | undefined, fallback: number) => {
    if (!part) {
      return fallback;
    }
    if (part.endsWith("%")) {
      return Number.parseFloat(part);
    }
    return fallback;
  };

  return {
    x: parsePart(parts[0], 50),
    y: parsePart(parts[1] ?? parts[0], 50),
  };
}

function formatObjectPosition(x: number, y: number): string {
  return `${x}% ${y}%`;
}

export function ImageCropOverlay({
  element,
  scale,
  onCommit,
  onCancel,
}: ImageCropOverlayProps) {
  const initialPosition = parseObjectPosition(element.styles.objectPosition);
  const initialScale =
    typeof element.styles.cropScale === "number" ? element.styles.cropScale : 1;

  const [focal, setFocal] = useState(initialPosition);
  const [cropScale, setCropScale] = useState(initialScale);

  const commit = useCallback(() => {
    onCommit({
      objectPosition: formatObjectPosition(focal.x, focal.y),
      cropScale,
    });
  }, [cropScale, focal.x, focal.y, onCommit]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
      if (event.key === "Enter") {
        event.preventDefault();
        commit();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commit, onCancel]);

  const frameStyle = {
    position: "absolute" as const,
    left: `${element.x * scale}px`,
    top: `${element.y * scale}px`,
    width: `${element.width * scale}px`,
    height: `${element.height * scale}px`,
    transform: `rotate(${element.rotation}deg)`,
    transformOrigin: "center center",
    zIndex: element.zIndex + 1000,
    outline: "2px solid rgb(99 102 241)",
  };

  return (
    <div
      role="dialog"
      aria-label="Crop image"
      data-testid={`crop-overlay-${element.id}`}
      style={frameStyle}
      className="pointer-events-auto bg-black/20"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Drag focal point"
        data-testid="crop-focal-handle"
        className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-indigo-500"
        style={{ left: `${focal.x}%`, top: `${focal.y}%` }}
        onPointerDown={(event) => {
          event.preventDefault();
          const frame = event.currentTarget.parentElement;
          if (!frame) {
            return;
          }

          const onMove = (moveEvent: PointerEvent) => {
            const rect = frame.getBoundingClientRect();
            const x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
            const y = ((moveEvent.clientY - rect.top) / rect.height) * 100;
            setFocal({
              x: Math.min(100, Math.max(0, x)),
              y: Math.min(100, Math.max(0, y)),
            });
          };

          const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
          };

          window.addEventListener("pointermove", onMove);
          window.addEventListener("pointerup", onUp);
        }}
      />

      <label className="absolute bottom-2 left-2 rounded bg-slate-900/80 px-2 py-1 text-xs text-white">
        Scale
        <input
          aria-label="Crop scale"
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={cropScale}
          onChange={(event) => setCropScale(Number.parseFloat(event.target.value))}
          className="ml-2 align-middle"
        />
      </label>

      <div className="absolute right-2 top-2 flex gap-2">
        <button
          type="button"
          className="rounded bg-indigo-500 px-2 py-1 text-xs text-white"
          onClick={commit}
        >
          Apply
        </button>
        <button
          type="button"
          className="rounded bg-slate-700 px-2 py-1 text-xs text-white"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
