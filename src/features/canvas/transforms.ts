import type { ElementUpdate } from "../../store/editorStore";
import type { SlideElement } from "../../domain/presentation";

import { viewportDeltaToLogical } from "./coordinates";

export type ResizeDirection = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

export function directionFromMoveable(direction: unknown): ResizeDirection | undefined {
  if (typeof direction === "string") {
    return direction as ResizeDirection;
  }

  if (!Array.isArray(direction) || direction.length < 2) {
    return undefined;
  }

  const [horizontal, vertical] = direction;
  if (horizontal === 1 && vertical === 1) {
    return "se";
  }
  if (horizontal === 1 && vertical === -1) {
    return "ne";
  }
  if (horizontal === -1 && vertical === 1) {
    return "sw";
  }
  if (horizontal === -1 && vertical === -1) {
    return "nw";
  }
  if (horizontal === 1 && vertical === 0) {
    return "e";
  }
  if (horizontal === -1 && vertical === 0) {
    return "w";
  }
  if (horizontal === 0 && vertical === 1) {
    return "s";
  }
  if (horizontal === 0 && vertical === -1) {
    return "n";
  }

  return undefined;
}

export interface ElementTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface MoveableTranslateEvent {
  translate?: number[];
}

export interface MoveableResizeEvent extends MoveableTranslateEvent {
  width?: number;
  height?: number;
}

export interface MoveableRotateEvent extends MoveableTranslateEvent {
  rotate?: number;
}

export type TransformBase = Pick<SlideElement, "x" | "y" | "width" | "height" | "rotation">;

function applyTranslate(
  base: TransformBase,
  translate: number[] | undefined,
  effectiveScale: number,
): Pick<ElementTransform, "x" | "y"> {
  if (!translate) {
    return { x: base.x, y: base.y };
  }

  const [dx, dy] = translate;
  return {
    x: base.x + viewportDeltaToLogical(dx, effectiveScale),
    y: base.y + viewportDeltaToLogical(dy, effectiveScale),
  };
}

export function parseMoveableDrag(
  event: MoveableTranslateEvent,
  effectiveScale: number,
  base: TransformBase,
): Pick<ElementTransform, "x" | "y"> {
  return applyTranslate(base, event.translate, effectiveScale);
}

export function parseMoveableResize(
  event: MoveableResizeEvent,
  effectiveScale: number,
  base: TransformBase,
): Pick<ElementTransform, "x" | "y" | "width" | "height"> {
  const position = applyTranslate(base, event.translate, effectiveScale);

  return {
    ...position,
    width: event.width ?? base.width,
    height: event.height ?? base.height,
  };
}

export function parseMoveableRotate(
  event: MoveableRotateEvent,
  effectiveScale: number,
  base: TransformBase,
): Pick<ElementTransform, "x" | "y" | "rotation"> {
  const position = applyTranslate(base, event.translate, effectiveScale);

  return {
    ...position,
    rotation: base.rotation + (event.rotate ?? 0),
  };
}

/** @deprecated Use parseMoveableDrag/Resize/Rotate instead. */
export function parseMoveableTransform(
  event: MoveableResizeEvent & MoveableRotateEvent,
  effectiveScale: number,
  base?: TransformBase,
): Partial<ElementTransform> {
  if (!base) {
    return {};
  }

  const result: Partial<ElementTransform> = {
    ...parseMoveableDrag(event, effectiveScale, base),
  };

  if (event.width !== undefined || event.height !== undefined) {
    Object.assign(result, parseMoveableResize(event, effectiveScale, base));
  }

  if (event.rotate !== undefined) {
    Object.assign(result, parseMoveableRotate(event, effectiveScale, base));
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

export function applyGroupTranslateDelta(
  starts: Map<string, ElementTransform>,
  translate: number[],
  effectiveScale: number,
): Map<string, ElementTransform> {
  const previews = new Map<string, ElementTransform>();
  const [dx, dy] = translate;
  const logicalDx = viewportDeltaToLogical(dx, effectiveScale);
  const logicalDy = viewportDeltaToLogical(dy, effectiveScale);

  for (const [id, start] of starts.entries()) {
    previews.set(id, {
      ...start,
      x: start.x + logicalDx,
      y: start.y + logicalDy,
    });
  }

  return previews;
}
