import type { ElementUpdate } from "../../store/editorStore";
import type { SlideElement } from "../../domain/presentation";

import { viewportDeltaToLogical } from "./coordinates";

export interface ElementTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface MoveableTransformEvent {
  translate?: number[];
  rotate?: number;
  width?: number;
  height?: number;
}

export function parseMoveableTransform(
  event: MoveableTransformEvent,
  effectiveScale: number,
  base?: Pick<SlideElement, "x" | "y" | "width" | "height" | "rotation">,
): Partial<ElementTransform> {
  const result: Partial<ElementTransform> = {};

  if (event.translate) {
    const [dx, dy] = event.translate;
    const logicalDx = viewportDeltaToLogical(dx, effectiveScale);
    const logicalDy = viewportDeltaToLogical(dy, effectiveScale);
    if (base) {
      result.x = base.x + logicalDx;
      result.y = base.y + logicalDy;
    } else {
      result.x = logicalDx;
      result.y = logicalDy;
    }
  }

  if (event.width !== undefined) {
    result.width = viewportDeltaToLogical(event.width, effectiveScale);
  }

  if (event.height !== undefined) {
    result.height = viewportDeltaToLogical(event.height, effectiveScale);
  }

  if (event.rotate !== undefined) {
    result.rotation = base ? base.rotation + event.rotate : event.rotate;
  }

  return result;
}

export function applyTransformPreview(
  element: SlideElement,
  changes: Partial<ElementTransform>,
): SlideElement {
  return {
    ...element,
    ...changes,
  };
}

function transformChanged(
  element: SlideElement,
  preview: ElementTransform,
): Partial<ElementTransform> {
  const changes: Partial<ElementTransform> = {};

  if (preview.x !== element.x) {
    changes.x = preview.x;
  }
  if (preview.y !== element.y) {
    changes.y = preview.y;
  }
  if (preview.width !== element.width) {
    changes.width = preview.width;
  }
  if (preview.height !== element.height) {
    changes.height = preview.height;
  }
  if (preview.rotation !== element.rotation) {
    changes.rotation = preview.rotation;
  }

  return changes;
}

export function buildTransformCommitUpdates(
  elements: SlideElement[],
  previews: Map<string, ElementTransform>,
): ElementUpdate[] {
  const updates: ElementUpdate[] = [];

  for (const element of elements) {
    const preview = previews.get(element.id);
    if (!preview) {
      continue;
    }

    const changes = transformChanged(element, preview);
    if (Object.keys(changes).length > 0) {
      updates.push({ id: element.id, changes });
    }
  }

  return updates;
}
