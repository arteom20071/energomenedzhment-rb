import { type ReactNode, useCallback, useEffect, useState, useSyncExternalStore } from "react";

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
import { UnsupportedViewportNotice } from "../components/UnsupportedViewportNotice";
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
  onPresent?: () => void;
  onTransitionChange?: (transition: SlideTransition) => void;
  onAnimationChange?: (animation: ElementAnimation | undefined) => void;
  /** Test-only override for mobile layout notice. */
  forceMobileLayout?: boolean;
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
  onPresent,
  onTransitionChange,
  onAnimationChange,
  forceMobileLayout = false,
}: EditorShellProps) {
  const title = useEditorStore((state) => state.presentation.title);
  const saveStatus = useEditorStore((state) => state.saveStatus);
  const zoom = useEditorStore((state) => state.zoom);
  const selectedElementIds = useEditorStore((state) => state.selectedElementIds);
  const activeSlide = useEditorStore((state) =>
    state.presentation.slides.find((slide) => slide.id === state.activeSlideId),
  );

  const renamePresentation = useEditorStore((state) => state.renamePresentation);
  const setZoom = useEditorStore((state) => state.setZoom);

  const canUndo = useEditorTemporalStore((state) => state.pastStates.length > 0);
  const canRedo = useEditorTemporalStore((state) => state.futureStates.length > 0);

  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (isEditableTarget(event.target)) {
      return;
    }

    if (event.key === "?") {
      event.preventDefault();
      setShortcutsOpen(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (forceMobileLayout) {
    return <UnsupportedViewportNotice />;
  }

  return (
    <div className="grid h-screen grid-rows-[auto_1fr_auto] bg-slate-950 text-slate-100">
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
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />

      <div className="grid min-h-0 grid-cols-[auto_1fr_auto]">
        <LeftToolSidebar
          aiCreatePanel={aiCreatePanel}
          textPanel={textPanel}
          shapesPanel={shapesPanel}
          mediaPanel={mediaPanel}
          templatesPanel={templatesPanel}
        />

        <section
          aria-label="Рабочая область"
          className="flex min-w-0 flex-col overflow-hidden bg-slate-950"
        >
          {contextToolbar ? (
            <div className="shrink-0 border-b border-slate-800 bg-slate-900 px-4 py-2">
              {contextToolbar}
            </div>
          ) : null}
          <div className="min-h-0 flex-1 overflow-auto p-6">{canvas}</div>
        </section>

        <RightInspector
          hasSelection={selectedElementIds.length > 0}
          transition={activeSlide?.transition ?? "fade"}
          animation={undefined}
          selectedObjectPanel={selectedObjectPanel}
          onTransitionChange={onTransitionChange}
          onAnimationChange={onAnimationChange}
        />
      </div>

      <SlideStrip />

      <KeyboardShortcutsDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </div>
  );
}

const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";

function subscribeDesktopViewport(onStoreChange: () => void) {
  if (typeof window.matchMedia !== "function") {
    return () => undefined;
  }

  const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getDesktopSnapshot() {
  if (typeof window.matchMedia !== "function") {
    return true;
  }

  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

function getDesktopServerSnapshot() {
  return true;
}

function useDesktopViewport() {
  return useSyncExternalStore(
    subscribeDesktopViewport,
    getDesktopSnapshot,
    getDesktopServerSnapshot,
  );
}

export function EditorShell(props: EditorShellProps) {
  const isDesktop = useDesktopViewport();

  if (props.forceMobileLayout) {
    return (
      <ToastProvider>
        <UnsupportedViewportNotice />
      </ToastProvider>
    );
  }

  if (!isDesktop) {
    return (
      <ToastProvider>
        <UnsupportedViewportNotice />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <EditorShellLayout {...props} />
    </ToastProvider>
  );
}
