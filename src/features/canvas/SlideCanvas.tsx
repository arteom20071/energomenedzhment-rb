import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Moveable from "react-moveable";
import Selecto from "react-selecto";

import { CANVAS_HEIGHT, CANVAS_WIDTH, type Slide, type SlideElement } from "../../domain/presentation";
import type { ElementUpdate } from "../../store/editorStore";
import { computeEffectiveScale } from "./coordinates";
import { createCanvasKeyboardHandler } from "./keyboard";
import type { CropPreviewStyles } from "./SlideRenderer";
import { SlideRenderer } from "./SlideRenderer";
import {
  computeResizeSnap,
  computeSnap,
  toLogicalSnapThreshold,
  type ResizeDirection,
  type SnapGuide,
} from "./snapping";
import {
  applyGroupDragSnap,
  buildTransformCommitUpdates,
  directionFromMoveable,
  normalizeMoveableEvent,
  parseMoveableDrag,
  parseMoveableResize,
  parseMoveableRotate,
  type ElementTransform,
  type RawMoveableEvent,
} from "./transforms";

type GestureKind = "drag" | "resize" | "rotate" | null;

interface GestureStart {
  kind: GestureKind;
  direction?: ResizeDirection;
  elements: Map<string, ElementTransform>;
}

function toTransform(element: SlideElement): ElementTransform {
  return {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    rotation: element.rotation,
  };
}

function readElementId(target: HTMLElement | SVGElement): string | undefined {
  return target instanceof HTMLElement ? target.dataset.elementId : undefined;
}

export interface SlideCanvasProps {
  slide: Slide;
  selectedIds: string[];
  zoom: number;
  fitScale?: number;
  editingTextId: string | null;
  cropElementId: string | null;
  onSelectionChange: (elementIds: string[]) => void;
  onToggleSelection: (elementId: string) => void;
  onClearSelection: () => void;
  onCommitTransforms: (updates: ElementUpdate[]) => void;
  onUpdateElement: (elementId: string, changes: ElementUpdate["changes"]) => void;
  onSetEditingTextId: (elementId: string | null) => void;
  onSetCropElementId: (elementId: string | null) => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
}

export function SlideCanvas({
  slide,
  selectedIds,
  zoom,
  fitScale = 1,
  editingTextId,
  cropElementId,
  onSelectionChange,
  onToggleSelection,
  onClearSelection,
  onCommitTransforms,
  onUpdateElement,
  onSetEditingTextId,
  onSetCropElementId,
  onDeleteSelected,
  onDuplicateSelected,
}: SlideCanvasProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const moveableRef = useRef<Moveable>(null);
  const [elementTargets, setElementTargets] = useState<Map<string, HTMLElement>>(new Map());
  const gestureStartRef = useRef<GestureStart | null>(null);
  const previewRef = useRef<Map<string, ElementTransform>>(new Map());
  const [previewElements, setPreviewElements] = useState<Map<string, Partial<ElementTransform>>>(
    new Map(),
  );
  const [guides, setGuides] = useState<SnapGuide[]>([]);
  const [cropPreview, setCropPreview] = useState<CropPreviewStyles | null>(null);

  const effectiveScale = computeEffectiveScale(zoom, fitScale);
  const snapThreshold = toLogicalSnapThreshold(effectiveScale);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedElements = useMemo(
    () => slide.elements.filter((element) => selectedSet.has(element.id)),
    [selectedSet, slide.elements],
  );

  const moveableTargets = useMemo(
    () =>
      selectedIds
        .map((id) => elementTargets.get(id))
        .filter((node): node is HTMLElement => node instanceof HTMLElement),
    [elementTargets, selectedIds],
  );

  const registerElementRef = useCallback((elementId: string, node: HTMLElement | null) => {
    setElementTargets((previous) => {
      const current = previous.get(elementId) ?? null;
      if (current === node) {
        return previous;
      }

      const next = new Map(previous);
      if (node) {
        next.set(elementId, node);
      } else {
        next.delete(elementId);
      }
      return next;
    });
  }, []);

  const setPreviewSnapshot = useCallback((snapshot: Map<string, ElementTransform>) => {
    previewRef.current = new Map(snapshot);
    setPreviewElements(new Map(snapshot));
  }, [setPreviewElements]);

  const clearPreview = useCallback(() => {
    previewRef.current = new Map();
    setPreviewElements(new Map());
    setGuides([]);
  }, [setPreviewElements, setGuides]);

  const beginGesture = useCallback((kind: GestureKind, direction?: ResizeDirection) => {
    const starts = new Map<string, ElementTransform>();
    previewRef.current = new Map();
    for (const element of selectedElements) {
      starts.set(element.id, toTransform(element));
    }
    gestureStartRef.current = { kind, direction, elements: starts };
  }, [selectedElements]);

  const applyDragSnap = useCallback(
    (next: ElementTransform): ElementTransform => {
      const snapped = computeSnap(
        next,
        slide.elements,
        { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
        snapThreshold,
        selectedIds,
      );
      setGuides(snapped.guides);
      return { ...next, x: snapped.x, y: snapped.y };
    },
    [selectedIds, setGuides, slide.elements, snapThreshold],
  );

  const applyResizeSnap = useCallback(
    (next: ElementTransform, direction: ResizeDirection): ElementTransform => {
      const snapped = computeResizeSnap(
        next,
        direction,
        slide.elements,
        { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
        snapThreshold,
        selectedIds,
      );
      setGuides(snapped.guides);
      return {
        ...next,
        x: snapped.x,
        y: snapped.y,
        width: snapped.width,
        height: snapped.height,
      };
    },
    [selectedIds, setGuides, slide.elements, snapThreshold],
  );

  const updatePreviewForTarget = useCallback(
    (
      elementId: string,
      event: {
        translate?: number[];
        rotate?: number;
        width?: number;
        height?: number;
      },
    ) => {
      const gesture = gestureStartRef.current;
      const start = gesture?.elements.get(elementId);
      if (!gesture || !start) {
        return;
      }

      let next: ElementTransform = { ...start };

      if (gesture.kind === "drag") {
        next = {
          ...next,
          ...parseMoveableDrag(event, effectiveScale, start),
        };
        next = applyDragSnap(next);
      } else if (gesture.kind === "resize") {
        next = {
          ...next,
          ...parseMoveableResize(event, effectiveScale, start),
        };
        if (gesture.direction) {
          next = applyResizeSnap(next, gesture.direction);
        }
      } else if (gesture.kind === "rotate") {
        next = {
          ...next,
          ...parseMoveableRotate(event, effectiveScale, start),
        };
      }

      previewRef.current.set(elementId, next);
      setPreviewElements((previous) => {
        const map = new Map(previous);
        map.set(elementId, next);
        return map;
      });
    },
    [applyDragSnap, applyResizeSnap, effectiveScale, setPreviewElements],
  );

  const updateGroupPreview = useCallback(
    (
      events: Array<
        {
          target: HTMLElement | SVGElement;
        } & RawMoveableEvent
      >,
    ) => {
      const gesture = gestureStartRef.current;
      if (!gesture) {
        return;
      }

      if (gesture.kind === "drag") {
        const firstEvent = events[0];
        if (!firstEvent) {
          return;
        }

        const normalized = normalizeMoveableEvent(firstEvent);
        const { previews, guides } = applyGroupDragSnap(
          gesture.elements,
          normalized.translate ?? [0, 0],
          effectiveScale,
          (bounds) =>
            computeSnap(
              bounds,
              slide.elements,
              { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
              snapThreshold,
              selectedIds,
            ),
        );
        setGuides(guides);
        setPreviewSnapshot(previews);
        return;
      }

      const snapshot = new Map(previewRef.current);
      for (const event of events) {
        const elementId = readElementId(event.target);
        if (!elementId) {
          continue;
        }

        const start = gesture.elements.get(elementId);
        if (!start) {
          continue;
        }

        const normalized = normalizeMoveableEvent(event);
        let next: ElementTransform = { ...start };

        if (gesture.kind === "resize") {
          next = {
            ...next,
            ...parseMoveableResize(normalized, effectiveScale, start),
          };
          if (gesture.direction) {
            next = applyResizeSnap(next, gesture.direction);
          }
        } else if (gesture.kind === "rotate") {
          next = {
            ...next,
            ...parseMoveableRotate(normalized, effectiveScale, start),
          };
        }

        snapshot.set(elementId, next);
      }

      setPreviewSnapshot(snapshot);
    },
    [applyResizeSnap, effectiveScale, selectedIds, setPreviewSnapshot, slide.elements, snapThreshold],
  );

  const commitGesture = useCallback(() => {
    const starts = gestureStartRef.current;
    if (!starts) {
      return;
    }

    const previews = new Map<string, ElementTransform>();
    for (const element of selectedElements) {
      const preview = previewRef.current.get(element.id);
      const start = starts.elements.get(element.id);
      if (!start) {
        continue;
      }
      previews.set(element.id, preview ?? start);
    }

    const updates = buildTransformCommitUpdates(selectedElements, previews);
    if (updates.length > 0) {
      onCommitTransforms(updates);
    }

    gestureStartRef.current = null;
    clearPreview();
  }, [clearPreview, onCommitTransforms, selectedElements]);

  const handleElementDoubleClick = useCallback(
    (element: SlideElement) => {
      if (element.type === "text") {
        onSetEditingTextId(element.id);
        return;
      }
      if (element.type === "image") {
        const objectPosition =
          typeof element.styles.objectPosition === "string"
            ? element.styles.objectPosition
            : "50% 50%";
        const cropScale =
          typeof element.styles.cropScale === "number" ? element.styles.cropScale : 1;
        setCropPreview({ objectPosition, cropScale });
        onSetCropElementId(element.id);
      }
    },
    [onSetCropElementId, onSetEditingTextId, setCropPreview],
  );

  const commitNudge = useCallback(
    (dx: number, dy: number) => {
      onCommitTransforms(
        selectedElements.map((element) => ({
          id: element.id,
          changes: { x: element.x + dx, y: element.y + dy },
        })),
      );
    },
    [onCommitTransforms, selectedElements],
  );

  const commitRotate = useCallback(
    (delta: number) => {
      onCommitTransforms(
        selectedElements.map((element) => ({
          id: element.id,
          changes: { rotation: element.rotation + delta },
        })),
      );
    },
    [onCommitTransforms, selectedElements],
  );

  const commitResize = useCallback(
    (dw: number, dh: number) => {
      onCommitTransforms(
        selectedElements.map((element) => ({
          id: element.id,
          changes: {
            width: Math.max(1, element.width + dw),
            height: Math.max(1, element.height + dh),
          },
        })),
      );
    },
    [onCommitTransforms, selectedElements],
  );

  useEffect(() => {
    const handler = createCanvasKeyboardHandler({
      selectedIds,
      isEditing: editingTextId !== null || cropElementId !== null,
      commitNudge,
      commitRotate,
      commitResize,
      deleteSelected: onDeleteSelected,
      duplicateSelected: onDuplicateSelected,
    });

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    commitNudge,
    commitResize,
    commitRotate,
    cropElementId,
    editingTextId,
    onDeleteSelected,
    onDuplicateSelected,
    selectedIds,
  ]);

  useEffect(() => {
    moveableRef.current?.updateRect();
  }, [previewElements, selectedIds, slide.elements, zoom, fitScale]);

  const isTransformDisabled = editingTextId !== null || cropElementId !== null;
  const isGroupSelection = selectedElements.length > 1;

  return (
    <div
      ref={setContainer}
      data-testid="slide-canvas-root"
      className="relative touch-none select-none"
      onPointerDown={(event) => {
        if (event.target === container || event.target === event.currentTarget) {
          onClearSelection();
        }
      }}
    >
      <SlideRenderer
        slide={slide}
        interactive
        scale={zoom}
        fitScale={fitScale}
        selectedIds={selectedIds}
        editingTextId={editingTextId}
        cropElementId={cropElementId}
        cropPreview={cropPreview}
        previewElements={previewElements}
        guides={guides}
        onElementDoubleClick={handleElementDoubleClick}
        onRegisterElementRef={registerElementRef}
        onTextCommit={(elementId, content) => {
          onUpdateElement(elementId, { content });
          onSetEditingTextId(null);
        }}
        onTextCancel={() => onSetEditingTextId(null)}
        onCropPreviewChange={setCropPreview}
        onCropCommit={(elementId, styles) => {
          onUpdateElement(elementId, {
            styles: {
              ...slide.elements.find((element) => element.id === elementId)?.styles,
              ...styles,
            },
          });
          setCropPreview(null);
          onSetCropElementId(null);
        }}
        onCropCancel={() => {
          setCropPreview(null);
          onSetCropElementId(null);
        }}
      />

      {!isTransformDisabled && selectedElements.length > 0 && container ? (
        <>
          <Moveable
            ref={moveableRef}
            target={moveableTargets}
            container={container}
            rootContainer={container}
            origin={false}
            draggable
            resizable
            rotatable
            snappable={false}
            useResizeObserver
            zoom={effectiveScale}
            rotationPosition="top"
            renderDirections={["nw", "n", "ne", "w", "e", "sw", "s", "se"]}
            onDragStart={() => beginGesture("drag")}
            onDrag={(event) => {
              if (isGroupSelection) {
                return;
              }
              updatePreviewForTarget(readElementId(event.target) ?? "", {
                translate: event.translate,
              });
            }}
            onDragEnd={() => {
              if (!isGroupSelection) {
                commitGesture();
              }
            }}
            onDragGroupStart={() => beginGesture("drag")}
            onDragGroup={({ events }) => updateGroupPreview(events)}
            onDragGroupEnd={() => commitGesture()}
            onResizeStart={(event) =>
              beginGesture("resize", directionFromMoveable(event.direction))
            }
            onResize={(event) => {
              if (isGroupSelection) {
                return;
              }
              updatePreviewForTarget(readElementId(event.target) ?? "", {
                translate: event.drag.translate,
                width: event.width,
                height: event.height,
              });
            }}
            onResizeEnd={() => {
              if (!isGroupSelection) {
                commitGesture();
              }
            }}
            onResizeGroupStart={(event) =>
              beginGesture("resize", directionFromMoveable(event.direction))
            }
            onResizeGroup={({ events }) => updateGroupPreview(events)}
            onResizeGroupEnd={() => commitGesture()}
            onRotateStart={() => beginGesture("rotate")}
            onRotate={(event) => {
              if (isGroupSelection) {
                return;
              }
              updatePreviewForTarget(readElementId(event.target) ?? "", {
                translate: event.drag.translate,
                rotate: event.rotate,
              });
            }}
            onRotateEnd={() => {
              if (!isGroupSelection) {
                commitGesture();
              }
            }}
            onRotateGroupStart={() => beginGesture("rotate")}
            onRotateGroup={({ events }) => updateGroupPreview(events)}
            onRotateGroupEnd={() => commitGesture()}
          />

          <div
            data-testid="selection-frame"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          />
        </>
      ) : null}

      {container ? (
        <Selecto
          container={container}
          dragContainer={container}
          selectableTargets={["[data-element-id]"]}
          selectByClick
          selectFromInside={false}
          continueSelect={false}
          toggleContinueSelect={["shift"]}
          hitRate={0}
          onDragStart={(event) => {
            const target = event.inputEvent.target as HTMLElement;
            if (moveableRef.current?.isMoveableElement(target)) {
              event.stop();
            }
          }}
          onSelect={(event) => {
            const ids = event.selected
              .map((node) => node.dataset.elementId)
              .filter((id): id is string => Boolean(id));

            if (event.inputEvent instanceof MouseEvent && event.inputEvent.shiftKey) {
              for (const id of event.added.map((node) => node.dataset.elementId).filter(Boolean)) {
                onToggleSelection(id as string);
              }
              for (const id of event.removed.map((node) => node.dataset.elementId).filter(Boolean)) {
                onToggleSelection(id as string);
              }
              return;
            }

            onSelectionChange(ids);
          }}
          onSelectEnd={(event) => {
            if (event.selected.length === 0 && !event.isDragStartEnd) {
              onClearSelection();
            }
          }}
        />
      ) : null}
    </div>
  );
}
