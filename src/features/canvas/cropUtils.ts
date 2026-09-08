export interface PointerToLocalFocalInput {
  clientX: number;
  clientY: number;
  centerX: number;
  centerY: number;
  /** Unrotated screen-space width of the element (logical size * viewport scale). */
  width: number;
  /** Unrotated screen-space height of the element (logical size * viewport scale). */
  height: number;
  rotationDegrees: number;
}

export function pointerToLocalFocalPercent(input: PointerToLocalFocalInput): {
  x: number;
  y: number;
} {
  const { clientX, clientY, centerX, centerY, width, height, rotationDegrees } = input;
  const dx = clientX - centerX;
  const dy = clientY - centerY;
  const radians = (-rotationDegrees * Math.PI) / 180;
  const localX = dx * Math.cos(radians) - dy * Math.sin(radians);
  const localY = dx * Math.sin(radians) + dy * Math.cos(radians);

  return {
    x: Math.min(100, Math.max(0, (localX / width + 0.5) * 100)),
    y: Math.min(100, Math.max(0, (localY / height + 0.5) * 100)),
  };
}
