import type { CSSProperties, MouseEvent } from "react";
import { useCallback } from "react";

import type { SlideElement } from "../../domain/presentation";
import { getImageAlt, toCssProperties, toImageInnerStyles } from "./styles";
import type { ElementTransform } from "./transforms";

export interface CropPreviewStyles {
  objectPosition: string;
  cropScale: number;
}

export interface SlideElementViewProps {
  element: SlideElement;
  preview?: Partial<ElementTransform>;
  cropPreview?: CropPreviewStyles;
  isSelected?: boolean;
  isEditing?: boolean;
  interactive?: boolean;
  onDoubleClick?: (element: SlideElement) => void;
  onRegisterRef?: (elementId: string, node: HTMLElement | null) => void;
}

function mergeElement(
  element: SlideElement,
  preview?: Partial<ElementTransform>,
): SlideElement {
  if (!preview) {
    return element;
  }
  return { ...element, ...preview };
}

function wrapperStyle(element: SlideElement): CSSProperties {
  return {
    position: "absolute",
    left: `${element.x}px`,
    top: `${element.y}px`,
    width: `${element.width}px`,
    height: `${element.height}px`,
    transform: `rotate(${element.rotation}deg)`,
    transformOrigin: "center center",
    zIndex: element.zIndex,
    boxSizing: "border-box",
  };
}

function selectionLabel(element: SlideElement): string {
  if (element.type === "text") {
    return `Text element${element.content ? `: ${element.content}` : ""}`;
  }
  if (element.type === "image") {
    return "Image element";
  }
  return "Shape element";
}

export function SlideElementView({
  element,
  preview,
  cropPreview,
  isSelected = false,
  isEditing = false,
  interactive = false,
  onDoubleClick,
  onRegisterRef,
}: SlideElementViewProps) {
  const resolved = mergeElement(element, preview);
  const frameStyle = wrapperStyle(resolved);
  const typeStyles = toCssProperties(resolved.type, resolved.styles);
  const handleRef = useCallback(
    (node: HTMLElement | null) => {
      onRegisterRef?.(resolved.id, node);
    },
    [onRegisterRef, resolved.id],
  );

  const sharedProps = {
    "data-testid": `element-${resolved.id}`,
    "data-element-id": resolved.id,
    tabIndex: interactive ? 0 : undefined,
    role: interactive ? "button" : undefined,
    "aria-label": selectionLabel(resolved),
    "aria-selected": interactive ? isSelected : undefined,
    onDoubleClick: interactive
      ? (event: MouseEvent) => {
          event.stopPropagation();
          onDoubleClick?.(resolved);
        }
      : undefined,
    className: interactive && isSelected ? "ring-2 ring-indigo-500 ring-offset-0 outline-none" : undefined,
    ref: handleRef,
  };

  if (resolved.type === "text") {
    if (isEditing) {
      return null;
    }

    return (
      <div {...sharedProps} style={{ ...frameStyle, ...typeStyles }}>
        {resolved.content ?? ""}
      </div>
    );
  }

  if (resolved.type === "image") {
    const imageStyles = {
      ...resolved.styles,
      ...(cropPreview ?? {}),
    };
    const innerStyles = toImageInnerStyles(imageStyles);

    return (
      <div
        {...sharedProps}
        style={{
          ...frameStyle,
          overflow: "hidden",
          padding: 0,
          border: "none",
          background: "transparent",
        }}
      >
        <img
          data-testid={`element-image-${resolved.id}`}
          src={resolved.content ?? ""}
          alt={getImageAlt(resolved.styles)}
          draggable={false}
          style={innerStyles}
        />
      </div>
    );
  }

  return (
    <div {...sharedProps} style={{ ...frameStyle, ...typeStyles }} />
  );
}
