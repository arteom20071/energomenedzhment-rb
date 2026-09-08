export function computeEffectiveScale(zoom: number, fitScale = 1): number {
  return zoom * fitScale;
}

export function viewportDeltaToLogical(delta: number, effectiveScale: number): number {
  if (effectiveScale === 0) {
    return delta;
  }
  return delta / effectiveScale;
}

export function logicalToViewport(
  point: { x: number; y: number },
  effectiveScale: number,
): { x: number; y: number } {
  return {
    x: point.x * effectiveScale,
    y: point.y * effectiveScale,
  };
}

export function viewportToLogical(
  point: { x: number; y: number },
  effectiveScale: number,
): { x: number; y: number } {
  return {
    x: viewportDeltaToLogical(point.x, effectiveScale),
    y: viewportDeltaToLogical(point.y, effectiveScale),
  };
}
