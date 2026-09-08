import { useCallback, useEffect, useId, useRef, useState } from "react";

import {
  extractFilesFromClipboardEvent,
  extractFilesFromDataTransfer,
  extractFilesFromFileInput,
} from "./ingestion";
import type {
  ImageDimensionDecoder,
  MediaAsset,
  MediaRepository,
  MediaValidationResult,
  ValidatedMediaFile,
} from "./types";
import {
  ACCEPTED_FORMATS_LABEL,
  defaultImageDecoder,
  validateMediaFile,
} from "./validation";
import { MediaGrid } from "./MediaGrid";

export interface MediaPanelProps {
  repository: MediaRepository;
  onAddImage: (file: ValidatedMediaFile) => void | Promise<void>;
  onInsert?: (asset: MediaAsset) => void;
  onReplace?: (asset: MediaAsset) => void;
  onDelete?: (asset: MediaAsset) => void;
  decoder?: ImageDimensionDecoder;
  validateFile?: (file: File) => Promise<MediaValidationResult>;
}

export function MediaPanel({
  repository,
  onAddImage,
  onInsert,
  onReplace,
  onDelete,
  decoder = defaultImageDecoder,
  validateFile,
}: MediaPanelProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const validate = useCallback(
    (file: File) => (validateFile ? validateFile(file) : validateMediaFile(file, decoder)),
    [decoder, validateFile],
  );

  const ingestFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) {
        return;
      }

      for (const file of files) {
        const result = await validate(file);
        if (!result.success) {
          setError(result.error);
          continue;
        }

        setError(null);
        await onAddImage(result.file);
      }
    },
    [onAddImage, validate],
  );

  const handleInputChange = useCallback(async () => {
    if (!inputRef.current) {
      return;
    }
    const files = extractFilesFromFileInput(inputRef.current);
    await ingestFiles(files);
    inputRef.current.value = "";
  }, [ingestFiles]);

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const files = extractFilesFromDataTransfer(event.dataTransfer);
      await ingestFiles(files);
    },
    [ingestFiles],
  );

  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA")
      ) {
        return;
      }

      const files = await extractFilesFromClipboardEvent(event);
      if (files.length === 0) {
        return;
      }

      event.preventDefault();
      await ingestFiles(files);
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [ingestFiles]);

  const showGrid = onInsert && onReplace && onDelete;

  return (
    <section aria-label="Медиатека" className="space-y-3">
      <p className="text-sm text-slate-400">{ACCEPTED_FORMATS_LABEL}</p>

      <div
        aria-label="Перетащите изображение сюда"
        className={`rounded-lg border border-dashed p-4 transition-colors ${
          isDragging ? "border-indigo-400 bg-indigo-500/10" : "border-slate-700"
        }`}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <button
          type="button"
          className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
          onClick={() => inputRef.current?.click()}
        >
          Загрузить изображение
        </button>
        <p className="mt-2 text-xs text-slate-500">
          Также можно вставить изображение из буфера обмена (Ctrl+V).
        </p>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        aria-label="Выбор файла изображения"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"
        className="sr-only"
        onChange={() => {
          void handleInputChange();
        }}
      />

      {error ? (
        <p role="alert" className="text-sm text-rose-400">
          {error}
        </p>
      ) : null}

      {showGrid ? (
        <MediaGrid
          repository={repository}
          onInsert={onInsert}
          onReplace={onReplace}
          onDelete={onDelete}
        />
      ) : null}
    </section>
  );
}
