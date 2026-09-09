import type { SlideElement } from "../../domain/presentation";

export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SnapGuide {
  orientation: "horizontal" | "vertical";
  position: number;
}

export interface SnapResult extends ElementBounds {
  guides: SnapGuide[];
}

export const SNAP_THRESHOLD_SCREEN_PX = 8;

export function toLogicalSnapThreshold(effectiveScale: number): number {
  if (effectiveScale <= 0) {
    return SNAP_THRESHOLD_SCREEN_PX;
  }
  return SNAP_THRESHOLD_SCREEN_PX / effectiveScale;
}

export type ResizeDirection = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

interface SnapTarget {
  orientation: "horizontal" | "vertical";
  position: number;
}

function elementBounds(element: SlideElement): ElementBounds {
  return {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  };
}

function collectSlideTargets(canvas: { width: number; height: number }): SnapTarget[] {
  const { width, height } = canvas;
  return [
    { orientation: "vertical", position: 0 },
    { orientation: "vertical", position: width / 2 },
    { orientation: "vertical", position: width },
    { orientation: "horizontal", position: 0 },
    { orientation: "horizontal", position: height / 2 },
    { orientation: "horizontal", position: height },
  ];
}

function collectElementTargets(element: SlideElement): SnapTarget[] {
  const { x, y, width, height } = element;
  return [
    { orientation: "vertical", position: x },
    { orientation: "vertical", position: x + width / 2 },
    { orientation: "vertical", position: x + width },
    { orientation: "horizontal", position: y },
    { orientation: "horizontal", position: y + height / 2 },
    { orientation: "horizontal", position: y + height },
  ];
}

function movingTargets(bounds: ElementBounds): SnapTarget[] {
  const { x, y, width, height } = bounds;
  return [
    { orientation: "vertical", position: x },
    { orientation: "vertical", position: x + width / 2 },
    { orientation: "vertical", position: x + width },
    { orientation: "horizontal", position: y },
    { orientation: "horizontal", position: y + height / 2 },
    { orientation: "horizontal", position: y + height },
  ];
}

function findBestSnapDelta(
  moving: SnapTarget[],
  targets: SnapTarget[],
  threshold: number,
): { delta: number; guide?: SnapGuide } | null {
  let best: { delta: number; guide: SnapGuide; distance: number } | null = null;

  for (const move of moving) {
    for (const target of targets) {
      if (move.orientation !== target.orientation) {
        continue;
      }

      const delta = target.position - move.position;
      const distance = Math.abs(delta);
      if (distance > threshold) {
        continue;
      }

      if (!best || distance < best.distance) {
        best = {
          delta,
          guide: { orientation: move.orientation, position: target.position },
          distance,
        };
      }
    }
  }

  if (!best) {
    return null;
  }

  return { delta: best.delta, guide: best.guide };
}

function collectPeerTargets(
  others: SlideElement[],
  ignoreIds: string[],
): SnapTarget[] {
  const ignored = new Set(ignoreIds);
  return others
    .filter((element) => !ignored.has(element.id))
    .flatMap((element) => collectElementTargets(element));
}

export function computeSnap(
  bounds: ElementBounds,
  others: SlideElement[],
  canvas: { width: number; height: number },
  threshold: number,
  ignoreIds: string[] = [],
): SnapResult {
  const targets = [...collectSlideTargets(canvas), ...collectPeerTargets(others, ignoreIds)];

  const moveX = movingTargets(bounds).filter((target) => target.orientation === "vertical");
  const moveY = movingTargets(bounds).filter((target) => target.orientation === "horizontal");
  const targetX = targets.filter((target) => target.orientation === "vertical");
  const targetY = targets.filter((target) => target.orientation === "horizontal");

  const snapX = findBestSnapDelta(moveX, targetX, threshold);
  const snapY = findBestSnapDelta(moveY, targetY, threshold);

  const guides: SnapGuide[] = [];
  let x = bounds.x;
  let y = bounds.y;

  if (snapX) {
    x += snapX.delta;
    if (snapX.guide) {
      guides.push(snapX.guide);
    }
  }

  if (snapY) {
    y += snapY.delta;
    if (snapY.guide) {
      guides.push(snapY.guide);
    }
  }

  return { x, y, width: bounds.width, height: bounds.height, guides };
}

function affectsHorizontal(direction: ResizeDirection): boolean {
  return direction.includes("e") || direction.includes("w");
}

function affectsVertical(direction: ResizeDirection): boolean {
  return direction.includes("n") || direction.includes("s");
}

function resizeMovingTargets(
  bounds: ElementBounds,
  direction: ResizeDirection,
): { vertical: SnapTarget[]; horizontal: SnapTarget[] } {
  const { x, y, width, height } = bounds;
  const vertical: SnapTarget[] = [];
  const horizontal: SnapTarget[] = [];

  if (direction.includes("w")) {
    vertical.push({ orientation: "vertical", position: x });
  }
  if (direction.includes("e")) {
    vertical.push({ orientation: "vertical", position: x + width });
  }
  if (direction.includes("n")) {
    horizontal.push({ orientation: "horizontal", position: y });
  }
  if (direction.includes("s")) {
    horizontal.push({ orientation: "horizontal", position: y + height });
  }

  return { vertical, horizontal };
}

export function computeResizeSnap(
  bounds: ElementBounds,
  direction: ResizeDirection,
  others: SlideElement[],
  canvas: { width: number; height: number },
  threshold: number,
  ignoreIds: string[] = [],
): SnapResult {
  const targets = [...collectSlideTargets(canvas), ...collectPeerTargets(others, ignoreIds)];
  const moving = resizeMovingTargets(bounds, direction);

  let x = bounds.x;
  let y = bounds.y;
  let width = bounds.width;
  let height = bounds.height;
  const guides: SnapGuide[] = [];

  if (affectsHorizontal(direction)) {
    const targetX = targets.filter((target) => target.orientation === "vertical");
    const snapX = findBestSnapDelta(moving.vertical, targetX, threshold);
    if (snapX) {
      if (direction.includes("w") && !direction.includes("e")) {
        const right = x + width;
        x += snapX.delta;
        width = right - x;
      } else if (direction.includes("e") && !direction.includes("w")) {
        width += snapX.delta;
      } else {
        if (direction.includes("w")) {
          const right = x + width;
          x += snapX.delta;
          width = right - x;
        }
        if (direction.includes("e")) {
          width += snapX.delta;
        }
      }

      if (snapX.guide) {
        guides.push(snapX.guide);
      }
    }
  }

  if (affectsVertical(direction)) {
    const targetY = targets.filter((target) => target.orientation === "horizontal");
    const snapY = findBestSnapDelta(moving.horizontal, targetY, threshold);
    if (snapY) {
      if (direction.includes("n") && !direction.includes("s")) {
        const bottom = y + height;
        y += snapY.delta;
        height = bottom - y;
      } else if (direction.includes("s") && !direction.includes("n")) {
        height += snapY.delta;
      } else {
        if (direction.includes("n")) {
          const bottom = y + height;
          y += snapY.delta;
          height = bottom - y;
        }
        if (direction.includes("s")) {
          height += snapY.delta;
        }
      }

      if (snapY.guide) {
        guides.push(snapY.guide);
      }
    }
  }

  return { x, y, width, height, guides };
}

export function snapElementBounds(
  element: SlideElement,
  others: SlideElement[],
  canvas: { width: number; height: number },
  threshold: number,
  ignoreIds: string[] = [],
): SnapResult {
  return computeSnap(elementBounds(element), others, canvas, threshold, ignoreIds);
}
