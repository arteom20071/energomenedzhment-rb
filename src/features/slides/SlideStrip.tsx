import { Copy, Plus, Trash2 } from "lucide-react";
import { type DragEvent, useCallback, useState } from "react";

import { useToast } from "../../components/Toast";
import { IconButton } from "../../components/ui/IconButton";
import {
  editorTemporalControls,
  useEditorStore,
} from "../../store/editorStore";
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

  const handleDelete = useCallback(() => {
    if (!activeSlideId) {
      return;
    }

    deleteSlide(activeSlideId);
    showToast("Слайд удалён", {
      label: "Отменить удаление",
      onClick: () => {
        editorTemporalControls.undo();
      },
    });
  }, [activeSlideId, deleteSlide, showToast]);

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

  return (
    <section
      aria-label="Лента слайдов"
      className="flex h-28 shrink-0 items-center gap-2 border-t border-slate-800 bg-slate-900 px-4"
    >
      <div role="tablist" aria-label="Миниатюры слайдов" className="flex min-w-0 flex-1 gap-2 overflow-x-auto py-2">
        {slides.map((slide, index) => (
          <SlideThumbnail
            key={slide.id}
            index={index}
            slideId={slide.id}
            background={slide.background}
            isActive={slide.id === activeSlideId}
            onSelect={setActiveSlide}
            onDragStart={setDraggedIndex}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={() => setDraggedIndex(null)}
          />
        ))}
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
          onClick={handleDelete}
          className="text-rose-400 hover:text-rose-300"
        >
          <Trash2 aria-hidden="true" size={18} />
        </IconButton>
      </div>
    </section>
  );
}
