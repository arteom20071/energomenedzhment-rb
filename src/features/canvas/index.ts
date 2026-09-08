export { SlideCanvas } from "./SlideCanvas";
export type { SlideCanvasProps } from "./SlideCanvas";
export { SlideRenderer } from "./SlideRenderer";
export type { SlideRendererProps } from "./SlideRenderer";
export { SlideElementView } from "./SlideElementView";
export type { SlideElementViewProps } from "./SlideElementView";
export { TextInlineEditor } from "./TextInlineEditor";
export { ImageCropOverlay } from "./ImageCropOverlay";
export { SnapGuides } from "./SnapGuides";
export {
  computeEffectiveScale,
  logicalToViewport,
  viewportDeltaToLogical,
  viewportToLogical,
} from "./coordinates";
export {
  computeSnap,
  snapElementBounds,
} from "./snapping";
export type { ElementBounds, SnapGuide, SnapResult } from "./snapping";
export {
  sanitizeElementStyles,
  toCssProperties,
  getImageAlt,
} from "./styles";
export {
  applyTransformPreview as applyElementTransformPreview,
  buildTransformCommitUpdates,
  parseMoveableTransform,
} from "./transforms";
export type { ElementTransform, MoveableTransformEvent } from "./transforms";
export {
  createCanvasKeyboardHandler,
  isEditableTarget,
  NUDGE_LARGE,
  NUDGE_SMALL,
} from "./keyboard";
