import type { ReactNode } from "react";

import { CANVAS_HEIGHT, CANVAS_WIDTH, type Slide, type SlideElement } from "../../domain/presentation";
import { computeEffectiveScale } from "./coordinates";
import { SlideElementView, type CropPreviewStyles } from "./SlideElementView";
import type { SnapGuide } from "./snapping";
import { SnapGuides } from "./SnapGuides";
import { TextInlineEditor } from "./TextInlineEditor";
import { ImageCropOverlay } from "./ImageCropOverlay";
import type { ElementTransform } from "./transforms";

export interface SlideRendererProps {
  slide: Slide;
  interactive?: boolean;
  scale?: number;
  fitScale?: number;
  selectedIds?: string[];
  editingTextId?: string | null;
  cropElementId?: string | null;
  cropPreview?: CropPreviewStyles | null;
  previewElements?: Map<string, Partial<ElementTransform>>;
  guides?: SnapGuide[];
  onElementDoubleClick?: (element: SlideElement) => void;
  onRegisterElementRef?: (elementId: string, node: HTMLElement | null) => void;
  onTextCommit?: (elementId: string, content: string) => void;
  onTextCancel?: () => void;
  onCropPreviewChange?: (styles: CropPreviewStyles) => void;
  onCropCommit?: (
    elementId: string,
    styles: CropPreviewStyles,
  ) => void;
  onCropCancel?: () => void;
  children?: ReactNode;
}

export function SlideRenderer({
  slide,
  interactive = false,
  scale = 1,
  fitScale = 1,
  selectedIds = [],
  editingTextId = null,
  cropElementId = null,
  cropPreview = null,
  previewElements,
  guides = [],
  onElementDoubleClick,
  onRegisterElementRef,
  onTextCommit,
  onTextCancel,
  onCropPreviewChange,
  onCropCommit,
  onCropCancel,
  children,
}: SlideRendererProps) {
  const effectiveScale = computeEffectiveScale(scale, fitScale);
  const viewportWidth = CANVAS_WIDTH * effectiveScale;
  const viewportHeight = CANVAS_HEIGHT * effectiveScale;
  const selectedSet = new Set(selectedIds);

  const sortedElements = [...slide.elements].sort(
    (left, right) => left.zIndex - right.zIndex,
  );

  const editingElement = editingTextId
    ? slide.elements.find((element) => element.id === editingTextId)
    : undefined;
  const cropElement = cropElementId
    ? slide.elements.find((element) => element.id === cropElementId)
    : undefined;

  return (
    <div
      className="relative origin-top-left"
      style={{ width: `${viewportWidth}px`, height: `${viewportHeight}px` }}
    >
      <div
        data-testid="slide-canvas"
        className="relative overflow-hidden"
        style={{
          width: `${viewportWidth}px`,
          height: `${viewportHeight}px`,
          background: slide.background,
          overflow: "hidden",
        }}
      >
        <div
          className="relative"
          style={{
            width: `${CANVAS_WIDTH}px`,
            height: `${CANVAS_HEIGHT}px`,
            transform: `scale(${effectiveScale})`,
            transformOrigin: "top left",
          }}
        >
          {sortedElements.map((element) => (
            <SlideElementView
              key={element.id}
              element={element}
              preview={previewElements?.get(element.id)}
              cropPreview={
                cropElementId === element.id && cropPreview ? cropPreview : undefined
              }
              isSelected={selectedSet.has(element.id)}
              isEditing={editingTextId === element.id}
              interactive={interactive}
              onDoubleClick={onElementDoubleClick}
              onRegisterRef={onRegisterElementRef}
            />
          ))}

          {interactive && guides.length > 0 ? (
            <SnapGuides guides={guides} scale={1} />
          ) : null}

          {interactive && editingElement ? (
            <TextInlineEditor
              element={editingElement}
              scale={1}
              onCommit={(content) => onTextCommit?.(editingElement.id, content)}
              onCancel={() => onTextCancel?.()}
            />
          ) : null}

          {interactive && cropElement ? (
            <ImageCropOverlay
              element={cropElement}
              scale={1}
              onPreviewChange={(styles) => onCropPreviewChange?.(styles)}
              onCommit={(styles) => onCropCommit?.(cropElement.id, styles)}
              onCancel={() => onCropCancel?.()}
            />
          ) : null}

          {children}
        </div>
      </div>
    </div>
  );
}

export type { CropPreviewStyles };
