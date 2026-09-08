import { Trash2 } from "lucide-react";
import type { DragEvent, Ref } from "react";

interface SlideThumbnailProps {
  index: number;
  slideId: string;
  background: string;
  isActive: boolean;
  tabIndex: number;
  tabRef?: Ref<HTMLButtonElement>;
  onFocus: () => void;
  onSelect: (slideId: string) => void;
  onDelete: (slideId: string) => void;
  onDragStart: (index: number) => void;
  onDragOver: (event: DragEvent<HTMLButtonElement>) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
}

export function SlideThumbnail({
  index,
  slideId,
  background,
  isActive,
  tabIndex,
  tabRef,
  onFocus,
  onSelect,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: SlideThumbnailProps) {
  const label = `Слайд ${index + 1}`;

  return (
    <div className="group relative shrink-0">
      <button
        ref={tabRef}
        type="button"
        role="tab"
        aria-selected={isActive}
        aria-label={label}
        title={label}
        tabIndex={tabIndex}
        draggable
        data-slide-index={index}
        onFocus={onFocus}
        onClick={() => onSelect(slideId)}
        onDragStart={() => onDragStart(index)}
        onDragOver={onDragOver}
        onDrop={(event) => {
          event.preventDefault();
          onDrop(index);
        }}
        onDragEnd={onDragEnd}
        className={`rounded-lg border p-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${
          isActive
            ? "border-indigo-500 bg-slate-800"
            : "border-slate-700 bg-slate-900 hover:border-slate-600"
        }`}
      >
        <div
          aria-hidden="true"
          className="h-14 w-24 overflow-hidden rounded"
          style={{ backgroundColor: background }}
        />
        <span className="mt-1 block text-center text-[10px] text-slate-400">{index + 1}</span>
      </button>
      <button
        type="button"
        aria-label={`Удалить ${label.toLowerCase()}`}
        title={`Удалить ${label.toLowerCase()}`}
        onClick={() => onDelete(slideId)}
        className="absolute right-0 top-0 rounded-md bg-slate-900/90 p-1 text-rose-400 opacity-100 transition hover:text-rose-300 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
      >
        <Trash2 aria-hidden="true" size={14} />
      </button>
    </div>
  );
}
