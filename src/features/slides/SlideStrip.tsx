import { Copy, Plus, Trash2 } from "lucide-react";
import { type DragEvent, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

import { useRovingTabIndex } from "../../components/useRovingTabIndex";
import { useToast } from "../../components/Toast";
import { IconButton } from "../../components/ui/IconButton";
import { useEditorStore } from "../../store/editorStore";
import {
  buildSlideDeletionToken,
  createDeletionKind,
  isToolbarFocusTransitionWithinStrip,
  shouldRestoreStripFocusAfterDelete,
  undoSlideDeletion,
} from "./slideDeletionUndo";
import { SlideThumbnail } from "./SlideThumbnail";

export function SlideStrip() {
  const slides = useEditorStore((state) => state.presentation.slides);
  const activeSlideId = useEditorStore((state) => state.activeSlideId);
  const setActiveSlide = useEditorStore((state) => state.setActiveSlide);
  const addSlide = useEditorStore((state) => state.addSlide);
  const duplicateSlide = useEditorStore((state) => state.duplicateSlide);
  const deleteSlide = useEditorStore((state) => state.deleteSlide);
  const reorderSlide = useEditorStore((state) => state.reorderSlide);
  const { showToast } = useToast();

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const tablistRef = useRef<HTMLDivElement>(null);
  const stripSectionRef = useRef<HTMLElement>(null);
  const pendingToolbarDeleteFocusRestoreRef = useRef(false);
  const pendingFocusSlideIdRef = useRef<string | null>(null);

  const slideIds = useMemo(() => slides.map((slide) => slide.id), [slides]);
  const { handleKeyDown, getTabProps, focusItem, setFocusedId } = useRovingTabIndex(
    slideIds,
    activeSlideId,
    "horizontal",
  );

  useLayoutEffect(() => {
    if (!pendingFocusSlideIdRef.current) {
      return;
    }

    const slideIdToFocus = pendingFocusSlideIdRef.current;
    pendingFocusSlideIdRef.current = null;
    setFocusedId(slideIdToFocus);
    focusItem(slideIdToFocus);
  }, [slides, activeSlideId, focusItem, setFocusedId]);

  const performDelete = useCallback(
    (slideId: string) => {
      const store = useEditorStore;
      const stateBefore = store.getState();
      const presentationBefore = structuredClone(stateBefore.presentation);
      const slideIndex = presentationBefore.slides.findIndex((slide) => slide.id === slideId);

      if (slideIndex === -1) {
        return;
      }

      const deletedSlide = structuredClone(presentationBefore.slides[slideIndex]!);
      const kind = createDeletionKind(presentationBefore.slides.length);

      if (kind === "clear-contents" && deletedSlide.elements.length === 0) {
        return;
      }

      const restoreStripFocus = shouldRestoreStripFocusAfterDelete(
        tablistRef.current,
        pendingToolbarDeleteFocusRestoreRef.current,
      );
      pendingToolbarDeleteFocusRestoreRef.current = false;

      deleteSlide(slideId);
      const presentationAfter = structuredClone(store.getState().presentation);

      const token = buildSlideDeletionToken({
        store,
        presentationAfter,
        kind,
        hadMutation: kind === "remove-slide" || deletedSlide.elements.length > 0,
      });

      if (restoreStripFocus) {
        pendingFocusSlideIdRef.current = store.getState().activeSlideId;
      }

      if (!token.hadMutation) {
        return;
      }

      const message =
        kind === "clear-contents" ? "Содержимое слайда очищено" : "Слайд удалён";

      showToast(message, {
        label: "Отменить удаление",
        onClick: () => {
          const result = undoSlideDeletion(store, token);
          if (!result.success) {
            showToast("Отмена недоступна: документ изменён");
          }
        },
      });
    },
    [deleteSlide, showToast],
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (targetIndex: number) => {
      if (draggedIndex === null || draggedIndex === targetIndex) {
        setDraggedIndex(null);
        return;
      }

      reorderSlide(draggedIndex, targetIndex);
      setDraggedIndex(null);
    },
    [draggedIndex, reorderSlide],
  );

  const onTablistKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const nextSlideId = handleKeyDown(event);
    if (nextSlideId) {
      setActiveSlide(nextSlideId);
    }
  };

  return (
    <section
      ref={stripSectionRef}
      aria-label="Лента слайдов"
      className="flex h-28 shrink-0 items-center gap-2 border-t border-slate-800 bg-slate-900 px-4"
    >
      <div
        ref={tablistRef}
        role="tablist"
        aria-label="Миниатюры слайдов"
        aria-orientation="horizontal"
        className="flex min-w-0 flex-1 gap-2 overflow-x-auto py-2"
        onKeyDown={onTablistKeyDown}
        onBlur={(event: React.FocusEvent<HTMLDivElement>) => {
          if (
            isToolbarFocusTransitionWithinStrip(
              tablistRef.current,
              stripSectionRef.current,
              event.relatedTarget,
            )
          ) {
            pendingToolbarDeleteFocusRestoreRef.current = true;
          }
        }}
      >
        {slides.map((slide, index) => {
          const tabProps = getTabProps(slide.id);
          return (
            <SlideThumbnail
              key={slide.id}
              index={index}
              slideId={slide.id}
              background={slide.background}
              isActive={slide.id === activeSlideId}
              tabIndex={tabProps.tabIndex}
              tabRef={tabProps.ref}
              onFocus={tabProps.onFocus}
              onSelect={setActiveSlide}
              onDelete={performDelete}
              onDragStart={setDraggedIndex}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={() => setDraggedIndex(null)}
            />
          );
        })}
      </div>

      <div className="flex shrink-0 items-center gap-1 border-l border-slate-800 pl-3">
        <IconButton label="Добавить слайд" onClick={() => addSlide()}>
          <Plus aria-hidden="true" size={18} />
        </IconButton>
        <IconButton
          label="Дублировать слайд"
          onClick={() => {
            if (activeSlideId) {
              duplicateSlide(activeSlideId);
            }
          }}
        >
          <Copy aria-hidden="true" size={18} />
        </IconButton>
        <IconButton
          label="Удалить слайд"
          onClick={() => {
            if (activeSlideId) {
              performDelete(activeSlideId);
            }
          }}
          className="text-rose-400 hover:text-rose-300"
        >
          <Trash2 aria-hidden="true" size={18} />
        </IconButton>
      </div>
    </section>
  );
}
