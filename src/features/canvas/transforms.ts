import type { ElementUpdate } from "../../store/editorStore";
import type { SlideElement } from "../../domain/presentation";

import { viewportDeltaToLogical } from "./coordinates";
import type { ElementBounds, SnapGuide } from "./snapping";

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
  rotation?: number;
  dist?: number;
}

export interface RawMoveableEvent {
  translate?: number[];
  width?: number;
  height?: number;
  rotate?: number;
  rotation?: number;
  dist?: number | number[];
  drag?: { translate?: number[] };
}

export type NormalizedMoveableEvent = MoveableResizeEvent & MoveableRotateEvent;

export type TransformBase = Pick<SlideElement, "x" | "y" | "width" | "height" | "rotation">;

export function normalizeMoveableEvent(event: RawMoveableEvent): NormalizedMoveableEvent {
  return {
    translate: event.drag?.translate ?? event.translate,
    rotate: event.rotate ?? event.rotation,
    dist: typeof event.dist === "number" ? event.dist : undefined,
    width: event.width,
    height: event.height,
  };
}

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
  let rotation = base.rotation;

  if (event.rotate !== undefined) {
    rotation = event.rotate;
  } else if (event.dist !== undefined) {
    rotation = base.rotation + event.dist;
  }

  return {
    ...position,
    rotation,
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

  if (event.rotate !== undefined || event.dist !== undefined) {
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

export function boundsFromTransforms(transforms: Iterable<ElementTransform>): ElementBounds {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const transform of transforms) {
    minX = Math.min(minX, transform.x);
    minY = Math.min(minY, transform.y);
    maxX = Math.max(maxX, transform.x + transform.width);
    maxY = Math.max(maxY, transform.y + transform.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function applyGroupBoundsDelta(
  previews: Map<string, ElementTransform>,
  deltaX: number,
  deltaY: number,
): Map<string, ElementTransform> {
  const next = new Map<string, ElementTransform>();
  for (const [id, preview] of previews.entries()) {
    next.set(id, {
      ...preview,
      x: preview.x + deltaX,
      y: preview.y + deltaY,
    });
  }
  return next;
}

export interface GroupDragSnapResult {
  previews: Map<string, ElementTransform>;
  guides: SnapGuide[];
}

export function applyGroupDragSnap(
  starts: Map<string, ElementTransform>,
  translate: number[],
  effectiveScale: number,
  snapBounds: (bounds: ElementBounds) => ElementBounds & { guides: SnapGuide[] },
): GroupDragSnapResult {
  const translated = applyGroupTranslateDelta(starts, translate, effectiveScale);

  let deltaX = 0;
  let deltaY = 0;
  let bestDistanceX = Number.POSITIVE_INFINITY;
  let bestDistanceY = Number.POSITIVE_INFINITY;
  const guides: SnapGuide[] = [];

  for (const preview of translated.values()) {
    const bounds = {
      x: preview.x,
      y: preview.y,
      width: preview.width,
      height: preview.height,
    };
    const snapped = snapBounds(bounds);
    const snapDeltaX = snapped.x - bounds.x;
    const snapDeltaY = snapped.y - bounds.y;

    if (snapDeltaX !== 0 && Math.abs(snapDeltaX) < bestDistanceX) {
      bestDistanceX = Math.abs(snapDeltaX);
      deltaX = snapDeltaX;
      const guide = snapped.guides.find((item) => item.orientation === "vertical");
      if (guide) {
        guides.push(guide);
      }
    }

    if (snapDeltaY !== 0 && Math.abs(snapDeltaY) < bestDistanceY) {
      bestDistanceY = Math.abs(snapDeltaY);
      deltaY = snapDeltaY;
      const guide = snapped.guides.find((item) => item.orientation === "horizontal");
      if (guide) {
        guides.push(guide);
      }
    }
  }

  return {
    previews: applyGroupBoundsDelta(translated, deltaX, deltaY),
    guides,
  };
}
