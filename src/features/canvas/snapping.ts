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

function collectSlideTargets(
  canvas: { width: number; height: number },
): SnapTarget[] {
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

export function computeSnap(
  bounds: ElementBounds,
  others: SlideElement[],
  canvas: { width: number; height: number },
  threshold: number,
  ignoreIds: string[] = [],
): SnapResult {
  const ignored = new Set(ignoreIds);
  const peerTargets = others
    .filter((element) => !ignored.has(element.id))
    .flatMap((element) => collectElementTargets(element));
  const targets = [...collectSlideTargets(canvas), ...peerTargets];

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

export function snapElementBounds(
  element: SlideElement,
  others: SlideElement[],
  canvas: { width: number; height: number },
  threshold: number,
  ignoreIds: string[] = [],
): SnapResult {
  return computeSnap(elementBounds(element), others, canvas, threshold, ignoreIds);
}
