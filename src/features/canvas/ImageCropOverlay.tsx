import { useCallback, useEffect, useRef, useState } from "react";

import type { SlideElement } from "../../domain/presentation";

export interface CropPreviewStyles {
  objectPosition: string;
  cropScale: number;
}

export interface ImageCropOverlayProps {
  element: SlideElement;
  scale: number;
  onPreviewChange: (styles: CropPreviewStyles) => void;
  onCommit: (styles: CropPreviewStyles) => void;
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
  return `${Math.round(x * 10) / 10}% ${Math.round(y * 10) / 10}%`;
}

function toPreview(focal: { x: number; y: number }, cropScale: number): CropPreviewStyles {
  return {
    objectPosition: formatObjectPosition(focal.x, focal.y),
    cropScale,
  };
}

export function ImageCropOverlay({
  element,
  scale,
  onPreviewChange,
  onCommit,
  onCancel,
}: ImageCropOverlayProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const initialPosition = parseObjectPosition(element.styles.objectPosition);
  const initialScale =
    typeof element.styles.cropScale === "number" ? element.styles.cropScale : 1;

  const [focal, setFocal] = useState(initialPosition);
  const [cropScale, setCropScale] = useState(initialScale);
  const previewRef = useRef(toPreview(initialPosition, initialScale));

  const publishPreview = useCallback(
    (nextFocal: { x: number; y: number }, nextScale: number) => {
      const preview = toPreview(nextFocal, nextScale);
      previewRef.current = preview;
      onPreviewChange(preview);
    },
    [onPreviewChange],
  );

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const commit = useCallback(() => {
    onCommit(previewRef.current);
  }, [onCommit]);

  const moveFocal = useCallback(
    (dx: number, dy: number) => {
      setFocal((current) => {
        const next = {
          x: Math.min(100, Math.max(0, current.x + dx)),
          y: Math.min(100, Math.max(0, current.y + dy)),
        };
        publishPreview(next, cropScale);
        return next;
      });
    },
    [cropScale, publishPreview],
  );

  const adjustScale = useCallback(
    (delta: number) => {
      setCropScale((current) => {
        const next = Math.min(3, Math.max(1, Number((current + delta).toFixed(2))));
        publishPreview(focal, next);
        return next;
      });
    },
    [focal, publishPreview],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      switch (event.key) {
        case "Escape":
          event.preventDefault();
          onCancel();
          break;
        case "Enter":
          event.preventDefault();
          commit();
          break;
        case "ArrowLeft":
          event.preventDefault();
          moveFocal(event.shiftKey ? -10 : -1, 0);
          break;
        case "ArrowRight":
          event.preventDefault();
          moveFocal(event.shiftKey ? 10 : 1, 0);
          break;
        case "ArrowUp":
          event.preventDefault();
          moveFocal(0, event.shiftKey ? -10 : -1);
          break;
        case "ArrowDown":
          event.preventDefault();
          moveFocal(0, event.shiftKey ? 10 : 1);
          break;
        case "+":
        case "=":
          event.preventDefault();
          adjustScale(0.05);
          break;
        case "-":
        case "_":
          event.preventDefault();
          adjustScale(-0.05);
          break;
        default:
          break;
      }
    },
    [adjustScale, commit, moveFocal, onCancel],
  );

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
      ref={dialogRef}
      role="dialog"
      aria-label="Crop image"
      tabIndex={-1}
      data-testid={`crop-overlay-${element.id}`}
      style={frameStyle}
      className="pointer-events-auto bg-black/20 outline-none"
      onKeyDown={onKeyDown}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Drag focal point"
        data-testid="crop-focal-handle"
        tabIndex={0}
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
            const next = {
              x: Math.min(100, Math.max(0, x)),
              y: Math.min(100, Math.max(0, y)),
            };
            setFocal(next);
            publishPreview(next, cropScale);
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
          onChange={(event) => {
            const next = Number.parseFloat(event.target.value);
            setCropScale(next);
            publishPreview(focal, next);
          }}
          className="ml-2 align-middle"
        />
      </label>

      <div className="absolute right-2 top-2 flex gap-2">
        <button
          type="button"
          aria-label="Apply crop"
          className="rounded bg-indigo-500 px-2 py-1 text-xs text-white"
          onClick={commit}
        >
          Apply
        </button>
        <button
          type="button"
          aria-label="Cancel crop"
          className="rounded bg-slate-700 px-2 py-1 text-xs text-white"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
