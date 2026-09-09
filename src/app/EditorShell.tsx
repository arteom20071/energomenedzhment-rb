import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { PanelLeft, PanelRight, X } from "lucide-react";

import type { ElementAnimation, SlideTransition } from "../domain/presentation";
import {
  editorTemporalControls,
  useEditorStore,
  useEditorTemporalStore,
} from "../store/editorStore";
import { EditorHeader } from "../components/EditorHeader";
import {
  isEditableTarget,
  KeyboardShortcutsDialog,
} from "../components/KeyboardShortcutsDialog";
import { LeftToolSidebar } from "../components/LeftToolSidebar";
import { RightInspector } from "../components/RightInspector";
import { ToastProvider } from "../components/Toast";
import { SlideStrip } from "../features/slides/SlideStrip";

export interface EditorShellProps {
  canvas: ReactNode;
  contextToolbar?: ReactNode;
  aiCreatePanel?: ReactNode;
  textPanel?: ReactNode;
  shapesPanel?: ReactNode;
  mediaPanel?: ReactNode;
  templatesPanel?: ReactNode;
  selectedObjectPanel?: ReactNode;
  onAiGenerate?: () => void;
  onExportJson?: () => void;
  onExportPng?: () => void;
  onExportHtml?: () => void;
  onExportPptx?: () => void;
  onPresent?: () => void;
  onTransitionChange?: (transition: SlideTransition) => void;
  onElementAnimationChange?: (animation: ElementAnimation | undefined) => void;
  /** Test-only override that keeps side panels in overlay mode. */
  forceMobileLayout?: boolean;
}

function panelClassName(open: boolean, compact: boolean, side: "left" | "right"): string {
  const placement =
    side === "left"
      ? "left-0 border-r"
      : "right-0 border-l";
  if (compact) {
    return `${open ? "flex" : "hidden"} absolute inset-y-0 z-30 ${placement} border-slate-800`;
  }
  return `${open ? "flex" : "hidden"} absolute inset-y-0 z-30 ${placement} border-slate-800 lg:relative lg:inset-auto lg:z-0 lg:flex`;
}

function EditorShellLayout({
  canvas,
  contextToolbar,
  aiCreatePanel,
  textPanel,
  shapesPanel,
  mediaPanel,
  templatesPanel,
  selectedObjectPanel,
  onAiGenerate,
  onExportJson,
  onExportPng,
  onExportHtml,
  onExportPptx,
  onPresent,
  onTransitionChange,
  onElementAnimationChange,
  forceMobileLayout = false,
}: EditorShellProps) {
  const title = useEditorStore((state) => state.presentation.title);
  const saveStatus = useEditorStore((state) => state.saveStatus);
  const zoom = useEditorStore((state) => state.zoom);
  const selectedElementIds = useEditorStore((state) => state.selectedElementIds);
  const activeSlide = useEditorStore((state) =>
    state.presentation.slides.find((slide) => slide.id === state.activeSlideId),
  );
  const selectedElement = activeSlide?.elements.find((element) =>
    selectedElementIds.includes(element.id),
  );

  const renamePresentation = useEditorStore((state) => state.renamePresentation);
  const setZoom = useEditorStore((state) => state.setZoom);

  const canUndo = useEditorTemporalStore((state) => state.pastStates.length > 0);
  const canRedo = useEditorTemporalStore((state) => state.futureStates.length > 0);

  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const shortcutsTriggerRef = useRef<HTMLButtonElement>(null);
  const compact = forceMobileLayout;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (isEditableTarget(event.target)) {
      return;
    }

    if (event.key === "?") {
      event.preventDefault();
      setShortcutsOpen(true);
    }

    if (event.key === "Escape") {
      setToolsOpen(false);
      setInspectorOpen(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      data-layout={compact ? "compact" : "auto"}
      className="grid h-dvh max-h-dvh grid-rows-[auto_1fr_auto] bg-slate-950 text-slate-100"
    >
      <EditorHeader
        title={title}
        saveStatus={saveStatus}
        zoom={zoom}
        canUndo={canUndo}
        canRedo={canRedo}
        onTitleChange={renamePresentation}
        onUndo={() => editorTemporalControls.undo()}
        onRedo={() => editorTemporalControls.redo()}
        onZoomChange={setZoom}
        onAiGenerate={onAiGenerate}
        onPresent={onPresent}
        onExportJson={onExportJson}
        onExportPng={onExportPng}
        onExportHtml={onExportHtml}
        onExportPptx={onExportPptx}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        shortcutsTriggerRef={shortcutsTriggerRef}
      />

      <div
        className={`relative grid min-h-0 grid-rows-[auto_1fr] ${
          compact ? "" : "lg:grid-cols-[auto_1fr_auto] lg:grid-rows-1"
        }`}
      >
        <div
          className={`flex items-center justify-between gap-2 border-b border-slate-800 bg-slate-900 px-2 py-1 ${
            compact ? "" : "lg:hidden"
          }`}
        >
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm text-slate-200 hover:bg-slate-800"
            aria-expanded={toolsOpen}
            onClick={() => {
              setToolsOpen((open) => !open);
              setInspectorOpen(false);
            }}
          >
            <PanelLeft size={16} aria-hidden="true" />
            Инструменты
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm text-slate-200 hover:bg-slate-800"
            aria-expanded={inspectorOpen}
            onClick={() => {
              setInspectorOpen((open) => !open);
              setToolsOpen(false);
            }}
          >
            <PanelRight size={16} aria-hidden="true" />
            Свойства
          </button>
        </div>

        <div className={panelClassName(toolsOpen, compact, "left")}>
          <LeftToolSidebar
            aiCreatePanel={aiCreatePanel}
            textPanel={textPanel}
            shapesPanel={shapesPanel}
            mediaPanel={mediaPanel}
            templatesPanel={templatesPanel}
          />
          <button
            type="button"
            className="absolute right-2 top-2 z-10 rounded-md bg-slate-800 p-2 text-slate-200 lg:hidden"
            aria-label="Закрыть инструменты"
            onClick={() => setToolsOpen(false)}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <section
          aria-label="Рабочая область"
          className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-slate-200"
        >
          {contextToolbar ? (
            <div className="shrink-0 overflow-x-auto border-b border-slate-800 bg-slate-900 px-2 py-2 text-slate-100 sm:px-4">
              {contextToolbar}
            </div>
          ) : null}
          <div
            data-testid="workspace-stage"
            className="grid min-h-0 flex-1 place-items-center overflow-hidden p-1 sm:p-3"
          >
            <div className="h-full w-full min-h-0 min-w-0">{canvas}</div>
          </div>
        </section>

        <div className={panelClassName(inspectorOpen, compact, "right")}>
          <RightInspector
            hasSelection={selectedElementIds.length > 0}
            transition={activeSlide?.transition ?? "fade"}
            elementAnimation={selectedElement?.animation}
            selectedObjectPanel={selectedObjectPanel}
            onTransitionChange={onTransitionChange}
            onElementAnimationChange={onElementAnimationChange}
          />
          <button
            type="button"
            className="absolute left-2 top-2 z-10 rounded-md bg-slate-800 p-2 text-slate-200 lg:hidden"
            aria-label="Закрыть инспектор"
            onClick={() => setInspectorOpen(false)}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {toolsOpen || inspectorOpen ? (
          <button
            type="button"
            className="absolute inset-0 z-20 bg-slate-950/50 lg:hidden"
            aria-label="Закрыть панели"
            onClick={() => {
              setToolsOpen(false);
              setInspectorOpen(false);
            }}
          />
        ) : null}
      </div>

      <SlideStrip />

      <KeyboardShortcutsDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        triggerRef={shortcutsTriggerRef}
      />
    </div>
  );
}

export function EditorShell(props: EditorShellProps) {
  return (
    <ToastProvider>
      <EditorShellLayout {...props} />
    </ToastProvider>
  );
}
