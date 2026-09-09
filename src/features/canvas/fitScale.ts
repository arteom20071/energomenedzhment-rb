import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../domain/presentation";

export function computeFitScale(
  availableWidth: number,
  availableHeight: number,
  logicalWidth = CANVAS_WIDTH,
  logicalHeight = CANVAS_HEIGHT,
  padding = 0,
): number {
  const innerWidth = availableWidth - padding * 2;
  const innerHeight = availableHeight - padding * 2;

  if (innerWidth <= 0 || innerHeight <= 0 || logicalWidth <= 0 || logicalHeight <= 0) {
    return 0;
  }

  return Math.min(innerWidth / logicalWidth, innerHeight / logicalHeight);
}

export function resolveFitScale(fitScale: number, fallback = 1): number {
  return fitScale > 0 ? fitScale : fallback;
}
