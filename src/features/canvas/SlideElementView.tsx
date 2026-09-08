import type { CSSProperties, MouseEvent } from "react";

import type { SlideElement } from "../../domain/presentation";
import { getImageAlt, toCssProperties } from "./styles";
import type { ElementTransform } from "./transforms";

export interface SlideElementViewProps {
  element: SlideElement;
  preview?: Partial<ElementTransform>;
  isSelected?: boolean;
  isEditing?: boolean;
  interactive?: boolean;
  onDoubleClick?: (element: SlideElement) => void;
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

function elementStyle(element: SlideElement): CSSProperties {
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

export function SlideElementView({
  element,
  preview,
  isSelected = false,
  isEditing = false,
  interactive = false,
  onDoubleClick,
}: SlideElementViewProps) {
  const resolved = mergeElement(element, preview);
  const baseStyle = elementStyle(resolved);
  const typeStyles = toCssProperties(resolved.type, resolved.styles);

  const commonProps = {
    "data-testid": `element-${resolved.id}`,
    "data-element-id": resolved.id,
    style: { ...baseStyle, ...typeStyles },
    onDoubleClick: interactive
      ? (event: MouseEvent) => {
          event.stopPropagation();
          onDoubleClick?.(resolved);
        }
      : undefined,
    className: interactive && isSelected ? "ring-2 ring-indigo-500 ring-offset-0" : undefined,
  };

  if (resolved.type === "text") {
    if (isEditing) {
      return null;
    }

    return (
      <div {...commonProps} aria-label={resolved.content ?? "Text element"}>
        {resolved.content ?? ""}
      </div>
    );
  }

  if (resolved.type === "image") {
    const src = resolved.content ?? "";
    return (
      <img
        {...commonProps}
        src={src}
        alt={getImageAlt(resolved.styles)}
        draggable={false}
      />
    );
  }

  return <div {...commonProps} aria-label="Shape element" />;
}
