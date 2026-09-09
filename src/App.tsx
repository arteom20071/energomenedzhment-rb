import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BringToFront,
  Crop,
  SendToBack,
  Square,
  Trash2,
  Type,
  Copy,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

import { EditorShell } from "./app/EditorShell";
import {
  bootstrapEditor,
  createEditorRuntime,
  createPresentationAutosave,
  persistZoomPreference,
  type BootstrapResult,
  type EditorRuntime,
} from "./app/bootstrap";
import { releaseDisplayUrls, resolveDisplaySlide } from "./app/displaySlide";
import { createMediaRepositoryAdapter, fitImageSize } from "./app/mediaRepositoryAdapter";
import { ToastProvider, useToast } from "./components/Toast";
import { IconButton } from "./components/ui/IconButton";
import { Dialog } from "./components/ui/Dialog";
import {
  collectPresentationIds,
  createImageElement,
  createShapeElement,
  createTextElement,
  generateId,
} from "./domain/factories";
import type { ElementAnimation, Slide, SlideTransition } from "./domain/presentation";
import { SlideCanvas } from "./features/canvas/SlideCanvas";
import { parseImportJson } from "./features/import/importParser";
import { MediaPanel } from "./features/media/MediaPanel";
import type { MediaAsset, ValidatedMediaFile } from "./features/media/types";
import { PresentationMode } from "./features/presentation/PresentationMode";
import { usePresentationMode } from "./features/presentation/usePresentationMode";
import { applyTemplate, TemplateGallery, type TemplateId } from "./features/templates";
import { createStoredAssetResolver } from "./services/export/imageContent";
import { generateStandaloneHtml } from "./services/export/htmlExporter";
import { exportPresentationJson } from "./services/export/jsonExporter";
import { captureSlidePng } from "./services/export/pngExporter";
import { toAssetReference } from "./services/persistence/assetRepository";
import { useEditorStore } from "./store/editorStore";

export interface AppProps {
  runtime?: EditorRuntime;
  baseUrl?: string;
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadText(filename: string, content: string, mime: string): void {
  downloadBlob(filename, new Blob([content], { type: mime }));
}

function AiImportDialog({
  open,
  onClose,
  saveStatus,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  saveStatus: string;
  onImported: (title: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const setPresentation = useEditorStore((state) => state.setPresentation);

  const handleImport = () => {
    const result = parseImportJson(draft);
    if (!result.success) {
      setError(result.errors.map((item) => `${item.path}: ${item.message}`).join("\n"));
      return;
    }

    if (saveStatus === "dirty") {
      const confirmed = window.confirm("Заменить несохранённый документ импортированным JSON?");
      if (!confirmed) {
        return;
      }
    }

    setPresentation(result.data);
    setError(null);
    onImported(result.data.title);
    onClose();
  };

  return (
    <Dialog title="Импорт JSON" open={open} onClose={onClose}>
      <p className="mb-2 text-sm text-slate-300">
        Вставьте JSON презентации. При ошибке текст в поле сохранится.
      </p>
      <textarea
        aria-label="JSON презентации"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className="h-48 w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-100"
      />
      {error ? (
        <p role="alert" className="mt-2 whitespace-pre-wrap text-sm text-red-400">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          className="rounded-md px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          onClick={onClose}
        >
          Отмена
        </button>
        <button
          type="button"
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-500"
          onClick={handleImport}
        >
          Импортировать
        </button>
      </div>
    </Dialog>
  );
}

function RecoveryBanner({
  payload,
  onOpenSeed,
}: {
  payload: string;
  onOpenSeed: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-4 border-b border-amber-700 bg-amber-950 px-4 py-3 text-sm text-amber-100"
    >
      <p>Сохранённый документ повреждён и не был перезаписан. Можно выгрузить исходные данные или открыть стартовый проект.</p>
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-md bg-amber-700 px-3 py-1.5 text-white"
          onClick={() => downloadText("recovery.json", payload || "{}", "application/json")}
        >
          Скачать данные
        </button>
        <button
          type="button"
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-white"
          onClick={onOpenSeed}
        >
          Открыть стартовый проект
        </button>
      </div>
    </div>
  );
}

function EditorApp({ runtime: runtimeProp, baseUrl }: AppProps) {
  const { showToast } = useToast();
  const runtime = useMemo(() => runtimeProp ?? createEditorRuntime(), [runtimeProp]);
  const mediaRepository = useMemo(
    () => createMediaRepositoryAdapter(runtime.assets, runtime.urlCache),
    [runtime],
  );
  const [ready, setReady] = useState(false);
  const [recovery, setRecovery] = useState<Extract<BootstrapResult, { kind: "recovery" }> | null>(
    null,
  );
  const [importOpen, setImportOpen] = useState(false);
  const documentIdRef = useRef<string>("");
  const createdAtRef = useRef<string>(new Date().toISOString());
  const [displaySlide, setDisplaySlide] = useState<Slide | null>(null);

  const presentation = useEditorStore((state) => state.presentation);
  const activeSlideId = useEditorStore((state) => state.activeSlideId);
  const selectedElementIds = useEditorStore((state) => state.selectedElementIds);
  const zoom = useEditorStore((state) => state.zoom);
  const editingTextId = useEditorStore((state) => state.editingTextId);
  const cropElementId = useEditorStore((state) => state.cropElementId);
  const saveStatus = useEditorStore((state) => state.saveStatus);
  const setPresentation = useEditorStore((state) => state.setPresentation);
  const setSaveStatus = useEditorStore((state) => state.setSaveStatus);
  const setZoom = useEditorStore((state) => state.setZoom);
  const setSelection = useEditorStore((state) => state.setSelection);
  const toggleSelection = useEditorStore((state) => state.toggleSelection);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const commitElementTransforms = useEditorStore((state) => state.commitElementTransforms);
  const updateElement = useEditorStore((state) => state.updateElement);
  const setEditingTextId = useEditorStore((state) => state.setEditingTextId);
  const setCropElementId = useEditorStore((state) => state.setCropElementId);
  const deleteSelectedElements = useEditorStore((state) => state.deleteSelectedElements);
  const duplicateSelectedElements = useEditorStore((state) => state.duplicateSelectedElements);
  const addElement = useEditorStore((state) => state.addElement);
  const insertSlide = useEditorStore((state) => state.insertSlide);
  const updateSlide = useEditorStore((state) => state.updateSlide);
  const bringForward = useEditorStore((state) => state.bringForward);
  const sendBackward = useEditorStore((state) => state.sendBackward);
  const bringToFront = useEditorStore((state) => state.bringToFront);
  const sendToBack = useEditorStore((state) => state.sendToBack);

  const activeSlide = presentation.slides.find((slide) => slide.id === activeSlideId);
  const selectedElement = activeSlide?.elements.find((element) =>
    selectedElementIds.includes(element.id),
  );
  const slideIndex = Math.max(
    0,
    presentation.slides.findIndex((slide) => slide.id === activeSlideId),
  );
  const presentationMode = usePresentationMode({
    slideCount: presentation.slides.length,
    initialSlideIndex: slideIndex,
  });

  const applyReady = useCallback(
    (result: Extract<BootstrapResult, { kind: "ready" }>) => {
      documentIdRef.current = result.documentId;
      createdAtRef.current = result.createdAt;
      setPresentation(result.presentation);
      if (typeof result.zoom === "number") {
        setZoom(result.zoom);
      }
      setSaveStatus("saved");
      setReady(true);
    },
    [setPresentation, setSaveStatus, setZoom],
  );

  useEffect(() => {
    let cancelled = false;
    void bootstrapEditor(runtime, baseUrl ?? import.meta.env.BASE_URL).then((result) => {
      if (cancelled) {
        return;
      }
      if (result.kind === "recovery") {
        setRecovery(result);
        setReady(true);
        return;
      }
      applyReady(result);
    });
    return () => {
      cancelled = true;
    };
  }, [applyReady, baseUrl, runtime]);

  useEffect(() => {
    if (!ready || recovery) {
      return;
    }
    const coordinator = createPresentationAutosave(runtime, createdAtRef.current, setSaveStatus);
    const unsubscribe = useEditorStore.subscribe((state, previous) => {
      if (state.presentation !== previous.presentation) {
        coordinator.markDirty(state.presentation, documentIdRef.current || state.presentation.id);
        documentIdRef.current = state.presentation.id;
      }
      if (state.zoom !== previous.zoom) {
        persistZoomPreference(state.zoom);
      }
    });
    return () => {
      unsubscribe();
      void coordinator.flush();
      coordinator.cancel();
    };
  }, [ready, recovery, runtime, setSaveStatus]);

  useEffect(() => {
    if (!activeSlide) {
      return;
    }

    let released = false;
    let acquired: string[] = [];
    void resolveDisplaySlide(activeSlide, runtime.assets, runtime.urlCache).then((resolved) => {
      if (released) {
        releaseDisplayUrls(resolved.urls, runtime.urlCache);
        return;
      }
      acquired = resolved.urls;
      setDisplaySlide(resolved.slide);
    });

    return () => {
      released = true;
      releaseDisplayUrls(acquired, runtime.urlCache);
    };
  }, [activeSlide, runtime]);

  const insertImageFromAsset = useCallback(
    (asset: { id: string; width?: number; height?: number; filename?: string }) => {
      const elements = activeSlide?.elements ?? [];
      const size = fitImageSize(asset.width ?? 480, asset.height ?? 270);
      addElement(
        createImageElement(elements, {
          content: toAssetReference(asset.id),
          width: size.width,
          height: size.height,
          styles: { objectFit: "cover", alt: asset.filename ?? "" },
        }),
      );
    },
    [activeSlide?.elements, addElement],
  );

  const handleAddImage = useCallback(
    async (file: ValidatedMediaFile) => {
      const id = generateId();
      await runtime.assets.save({
        metadata: {
          id,
          mimeType: file.mimeType,
          byteSize: file.blob.size,
          filename: file.filename,
          width: file.width,
          height: file.height,
          createdAt: new Date().toISOString(),
        },
        blob: file.blob,
      });
      insertImageFromAsset({
        id,
        width: file.width,
        height: file.height,
        filename: file.filename,
      });
    },
    [insertImageFromAsset, runtime.assets],
  );

  const handleInsertAsset = useCallback(
    (asset: MediaAsset) => {
      insertImageFromAsset(asset);
    },
    [insertImageFromAsset],
  );

  const handleReplaceAsset = useCallback(
    (asset: MediaAsset) => {
      if (selectedElement?.type === "image") {
        const size = fitImageSize(asset.width, asset.height);
        updateElement(selectedElement.id, {
          content: toAssetReference(asset.id),
          width: size.width,
          height: size.height,
        });
        return;
      }
      insertImageFromAsset(asset);
    },
    [insertImageFromAsset, selectedElement, updateElement],
  );

  const handleTemplate = useCallback(
    (templateId: TemplateId) => {
      const used = collectPresentationIds(presentation);
      insertSlide(applyTemplate(templateId, used));
    },
    [insertSlide, presentation],
  );

  const handleExportJson = useCallback(async () => {
    const resolver = createStoredAssetResolver((id) => runtime.assets.get(id));
    const result = await exportPresentationJson(presentation, resolver);
    if (!result.success) {
      showToast(result.error);
      return;
    }
    downloadText(result.filename, result.json, "application/json");
  }, [presentation, runtime.assets, showToast]);

  const handleExportHtml = useCallback(async () => {
    const resolver = createStoredAssetResolver((id) => runtime.assets.get(id));
    const result = await generateStandaloneHtml(presentation, resolver);
    if (!result.success) {
      showToast(result.error);
      return;
    }
    downloadText(result.filename, result.html, "text/html");
  }, [presentation, runtime.assets, showToast]);

  const handleExportPng = useCallback(async () => {
    const node = document.querySelector<HTMLElement>('[data-testid="slide-canvas"]');
    if (!node) {
      showToast("Не удалось найти холст для экспорта PNG");
      return;
    }
    const result = await captureSlidePng(node, slideIndex);
    if (!result.success) {
      showToast(result.error);
      return;
    }
    downloadBlob(`${presentation.title || "slide"}-${slideIndex + 1}.png`, result.blob);
  }, [presentation.title, showToast, slideIndex]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-300">
        Загрузка редактора…
      </div>
    );
  }

  if (recovery) {
    return (
      <RecoveryBanner
        payload={recovery.rawPayload}
        onOpenSeed={() => {
          applyReady({
            kind: "ready",
            presentation: recovery.seed,
            documentId: recovery.seed.id,
            createdAt: new Date().toISOString(),
          });
          setRecovery(null);
        }}
      />
    );
  }

  const canvasSlide =
    activeSlide && displaySlide?.id === activeSlide.id ? displaySlide : activeSlide;

  return (
    <>
      <EditorShell
        canvas={
          canvasSlide ? (
            <SlideCanvas
              slide={canvasSlide}
              selectedIds={selectedElementIds}
              zoom={zoom}
              editingTextId={editingTextId}
              cropElementId={cropElementId}
              onSelectionChange={setSelection}
              onToggleSelection={toggleSelection}
              onClearSelection={clearSelection}
              onCommitTransforms={commitElementTransforms}
              onUpdateElement={updateElement}
              onSetEditingTextId={setEditingTextId}
              onSetCropElementId={setCropElementId}
              onDeleteSelected={deleteSelectedElements}
              onDuplicateSelected={duplicateSelectedElements}
            />
          ) : (
            <p className="text-slate-400">Нет активного слайда</p>
          )
        }
        contextToolbar={
          <div className="flex items-center gap-1">
            <IconButton label="На передний план" onClick={bringToFront}>
              <BringToFront size={16} />
            </IconButton>
            <IconButton label="Вперёд" onClick={bringForward}>
              <ChevronUp size={16} />
            </IconButton>
            <IconButton label="Назад" onClick={sendBackward}>
              <ChevronDown size={16} />
            </IconButton>
            <IconButton label="На задний план" onClick={sendToBack}>
              <SendToBack size={16} />
            </IconButton>
            <IconButton label="Дублировать" onClick={duplicateSelectedElements}>
              <Copy size={16} />
            </IconButton>
            <IconButton label="Удалить объекты" onClick={deleteSelectedElements}>
              <Trash2 size={16} />
            </IconButton>
            {selectedElement?.type === "image" ? (
              <IconButton
                label="Обрезать изображение"
                onClick={() => setCropElementId(selectedElement.id)}
              >
                <Crop size={16} />
              </IconButton>
            ) : null}
          </div>
        }
        textPanel={
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
            onClick={() =>
              addElement(
                createTextElement(activeSlide?.elements ?? [], {
                  content: "Текст",
                  x: 200,
                  y: 200,
                }),
              )
            }
          >
            <Type size={16} />
            Добавить текст
          </button>
        }
        shapesPanel={
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
            onClick={() =>
              addElement(
                createShapeElement(activeSlide?.elements ?? [], {
                  x: 240,
                  y: 240,
                }),
              )
            }
          >
            <Square size={16} />
            Прямоугольник
          </button>
        }
        mediaPanel={
          <MediaPanel
            repository={mediaRepository}
            onAddImage={handleAddImage}
            onInsert={handleInsertAsset}
            onReplace={handleReplaceAsset}
            onDelete={(asset) => {
              void runtime.assets.delete(asset.id);
            }}
          />
        }
        templatesPanel={<TemplateGallery onSelect={handleTemplate} />}
        aiCreatePanel={
          <button
            type="button"
            className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-500"
            onClick={() => setImportOpen(true)}
          >
            Вставить JSON
          </button>
        }
        selectedObjectPanel={
          <div className="space-y-3 text-sm">
            <label className="block text-slate-300">
              <span className="mb-1 block text-xs text-slate-400">Фон слайда</span>
              <input
                type="color"
                aria-label="Фон слайда"
                value={/^#[0-9a-fA-F]{6}$/.test(activeSlide?.background ?? "")
                  ? activeSlide!.background
                  : "#ffffff"}
                onChange={(event) => {
                  if (activeSlide) {
                    updateSlide(activeSlide.id, { background: event.target.value });
                  }
                }}
              />
            </label>
            {selectedElement?.type === "text" ? (
              <label className="block text-slate-300">
                <span className="mb-1 block text-xs text-slate-400">Размер шрифта</span>
                <input
                  type="number"
                  aria-label="Размер шрифта"
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1"
                  value={Number(selectedElement.styles.fontSize ?? 32)}
                  onChange={(event) =>
                    updateElement(selectedElement.id, {
                      styles: {
                        ...selectedElement.styles,
                        fontSize: Number(event.target.value),
                      },
                    })
                  }
                />
              </label>
            ) : null}
            {selectedElement?.type === "shape" ? (
              <label className="block text-slate-300">
                <span className="mb-1 block text-xs text-slate-400">Заливка</span>
                <input
                  type="color"
                  aria-label="Заливка фигуры"
                  value={typeof selectedElement.styles.fill === "string"
                    ? (selectedElement.styles.fill as string)
                    : "#6366f1"}
                  onChange={(event) =>
                    updateElement(selectedElement.id, {
                      styles: { ...selectedElement.styles, fill: event.target.value },
                    })
                  }
                />
              </label>
            ) : null}
          </div>
        }
        onAiGenerate={() => setImportOpen(true)}
        onPresent={() => presentationMode.enter()}
        onExportJson={() => {
          void handleExportJson();
        }}
        onExportPng={() => {
          void handleExportPng();
        }}
        onExportHtml={() => {
          void handleExportHtml();
        }}
        onTransitionChange={(transition: SlideTransition) => {
          if (activeSlide) {
            updateSlide(activeSlide.id, { transition });
          }
        }}
        onElementAnimationChange={(animation: ElementAnimation | undefined) => {
          if (selectedElement) {
            updateElement(selectedElement.id, { animation });
          }
        }}
      />
      <AiImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        saveStatus={saveStatus}
        onImported={() => undefined}
      />
      {presentationMode.state.isActive ? (
        <PresentationMode
          presentation={presentation}
          currentSlideIndex={presentationMode.state.currentSlideIndex}
          onExit={presentationMode.exit}
        />
      ) : null}
    </>
  );
}

export function App(props: AppProps) {
  return (
    <ToastProvider>
      <EditorApp {...props} />
    </ToastProvider>
  );
}
