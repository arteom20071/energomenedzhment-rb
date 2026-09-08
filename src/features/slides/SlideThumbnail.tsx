import type { DragEvent } from "react";

interface SlideThumbnailProps {
  index: number;
  slideId: string;
  background: string;
  isActive: boolean;
  onSelect: (slideId: string) => void;
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
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: SlideThumbnailProps) {
  const label = `Слайд ${index + 1}`;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-label={label}
      title={label}
      draggable
      data-slide-index={index}
      onClick={() => onSelect(slideId)}
      onDragStart={() => onDragStart(index)}
      onDragOver={onDragOver}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(index);
      }}
      onDragEnd={onDragEnd}
      className={`group relative shrink-0 rounded-lg border p-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${
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
  );
}
