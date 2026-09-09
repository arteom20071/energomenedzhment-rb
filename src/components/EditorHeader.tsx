import {
  ChevronDown,
  HelpCircle,
  Play,
  Redo2,
  Sparkles,
  Undo2,
} from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";

import type { SaveStatus } from "../store/editorStore";
import { ZOOM_MAX, ZOOM_MIN } from "../store/editorStore";
import { SaveStatusBadge } from "./SaveStatusBadge";
import { IconButton } from "./ui/IconButton";

interface EditorHeaderProps {
  title: string;
  saveStatus: SaveStatus;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  onTitleChange: (title: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomChange: (zoom: number) => void;
  onAiGenerate?: () => void;
  onPresent?: () => void;
  onExportJson?: () => void;
  onExportPng?: () => void;
  onExportHtml?: () => void;
  onExportPptx?: () => void;
  onOpenShortcuts: () => void;
  shortcutsTriggerRef?: RefObject<HTMLButtonElement | null>;
}

export function EditorHeader({
  title,
  saveStatus,
  zoom,
  canUndo,
  canRedo,
  onTitleChange,
  onUndo,
  onRedo,
  onZoomChange,
  onAiGenerate,
  onPresent,
  onExportJson,
  onExportPng,
  onExportHtml,
  onExportPptx,
  onOpenShortcuts,
  shortcutsTriggerRef,
}: EditorHeaderProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exportOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!exportRef.current?.contains(event.target as Node)) {
        setExportOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [exportOpen]);

  const zoomPercent = Math.round(zoom * 100);

  const handleZoomInput = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      return;
    }
    onZoomChange(parsed / 100);
  };

  return (
    <header
      aria-label="Панель редактора"
      className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900 px-2 pt-[max(0px,env(safe-area-inset-top))] sm:px-4"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-lg bg-indigo-500 font-bold text-white"
        >
          P
        </div>
        <div className="min-w-0">
          <input
            type="text"
            aria-label="Название презентации"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="w-full min-w-0 truncate rounded-md border border-transparent bg-transparent px-1 text-sm font-semibold text-slate-100 hover:border-slate-700 focus:border-indigo-500 focus:outline-none"
          />
          <SaveStatusBadge status={saveStatus} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <IconButton label="Отменить" onClick={onUndo} disabled={!canUndo}>
          <Undo2 aria-hidden="true" size={18} />
        </IconButton>
        <IconButton label="Повторить" onClick={onRedo} disabled={!canRedo}>
          <Redo2 aria-hidden="true" size={18} />
        </IconButton>

        <label className="ml-2 flex items-center gap-1 text-xs text-slate-400">
          <span className="sr-only">Масштаб</span>
          <input
            type="number"
            aria-label="Масштаб"
            min={ZOOM_MIN * 100}
            max={ZOOM_MAX * 100}
            step={10}
            value={zoomPercent}
            onChange={(event) => handleZoomInput(event.target.value)}
            className="w-16 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-right text-slate-100 focus:border-indigo-500 focus:outline-none"
          />
          <span aria-hidden="true">%</span>
        </label>

        <IconButton
          label="Сгенерировать с ИИ"
          onClick={onAiGenerate}
          className="ml-1 text-indigo-300 hover:text-indigo-200"
        >
          <Sparkles aria-hidden="true" size={18} />
        </IconButton>

        <div ref={exportRef} className="relative">
          <button
            type="button"
            aria-label="Экспорт"
            aria-expanded={exportOpen}
            aria-haspopup="menu"
            title="Экспорт"
            onClick={() => setExportOpen((open) => !open)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-sm text-slate-300 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            Экспорт
            <ChevronDown aria-hidden="true" size={14} />
          </button>
          {exportOpen ? (
            <div
              role="menu"
              aria-label="Меню экспорта"
              className="absolute right-0 top-full z-20 mt-1 min-w-44 rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl"
            >
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                onClick={() => {
                  onExportJson?.();
                  setExportOpen(false);
                }}
              >
                JSON
              </button>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                onClick={() => {
                  onExportPng?.();
                  setExportOpen(false);
                }}
              >
                PNG
              </button>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                onClick={() => {
                  onExportHtml?.();
                  setExportOpen(false);
                }}
              >
                HTML
              </button>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                onClick={() => {
                  onExportPptx?.();
                  setExportOpen(false);
                }}
              >
                PowerPoint
              </button>
            </div>
          ) : null}
        </div>

        <IconButton label="Показать презентацию" onClick={onPresent}>
          <Play aria-hidden="true" size={18} />
        </IconButton>

        <IconButton
          ref={shortcutsTriggerRef}
          label="Горячие клавиши"
          onClick={onOpenShortcuts}
        >
          <HelpCircle aria-hidden="true" size={18} />
        </IconButton>
      </div>
    </header>
  );
}
