import { useCallback, useEffect, useRef, useState } from "react";

import { safeParseMediaAssets } from "./mediaAssetSchema";
import type { MediaAsset, MediaRepository } from "./types";

export interface MediaGridProps {
  repository: MediaRepository;
  refreshKey?: number;
  onInsert: (asset: MediaAsset) => void;
  onReplace: (asset: MediaAsset) => void;
  onDelete: (asset: MediaAsset) => void;
}

interface AssetPreview {
  asset: MediaAsset;
  previewUrl: string | null;
}

interface AcquiredPreview {
  assetId: string;
  url: string;
}

export function MediaGrid({
  repository,
  refreshKey = 0,
  onInsert,
  onReplace,
  onDelete,
}: MediaGridProps) {
  const [items, setItems] = useState<AssetPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generationRef = useRef(0);
  const acquiredRef = useRef<AcquiredPreview[]>([]);

  const releaseAllPreviews = useCallback(async () => {
    const acquired = acquiredRef.current;
    acquiredRef.current = [];
    await Promise.all(
      acquired.map(async (preview) => {
        try {
          await repository.releasePreviewUrl(preview.assetId, preview.url);
        } catch {
          // Release failures should not block UI teardown.
        }
      }),
    );
  }, [repository]);

  const releasePreview = useCallback(
    async (assetId: string, url: string | null) => {
      if (!url) {
        return;
      }
      acquiredRef.current = acquiredRef.current.filter(
        (preview) => !(preview.assetId === assetId && preview.url === url),
      );
      try {
        await repository.releasePreviewUrl(assetId, url);
      } catch {
        // Ignore release errors during item replacement.
      }
    },
    [repository],
  );

  useEffect(() => {
    const generation = ++generationRef.current;
    let cancelled = false;

    async function loadAssets() {
      setLoading(true);
      setError(null);
      await releaseAllPreviews();

      try {
        const rawAssets = await repository.list();
        if (cancelled || generation !== generationRef.current) {
          return;
        }

        const parsedAssets = safeParseMediaAssets(rawAssets);
        if (!parsedAssets.success) {
          setError(parsedAssets.error);
          setItems([]);
          setLoading(false);
          return;
        }

        const previews: AssetPreview[] = [];
        for (const asset of parsedAssets.data) {
          if (cancelled || generation !== generationRef.current) {
            await releaseAllPreviews();
            return;
          }

          let previewUrl: string | null = null;
          try {
            previewUrl = await repository.getPreviewUrl(asset.id);
          } catch {
            if (!cancelled && generation === generationRef.current) {
              setError(`Не удалось получить предпросмотр для «${asset.filename}».`);
            }
            continue;
          }

          if (previewUrl) {
            acquiredRef.current.push({ assetId: asset.id, url: previewUrl });
          }
          previews.push({ asset, previewUrl });
        }

        if (!cancelled && generation === generationRef.current) {
          setItems(previews);
          setLoading(false);
        } else {
          await releaseAllPreviews();
        }
      } catch {
        if (!cancelled && generation === generationRef.current) {
          setError("Не удалось загрузить медиатеку.");
          setItems([]);
          setLoading(false);
        }
      }
    }

    void loadAssets();

    return () => {
      cancelled = true;
      void releaseAllPreviews();
    };
  }, [repository, refreshKey, releaseAllPreviews]);

  const handleDelete = async (asset: MediaAsset, previewUrl: string | null) => {
    setError(null);
    try {
      await repository.delete(asset.id);
      await releasePreview(asset.id, previewUrl);
      setItems((current) => current.filter((item) => item.asset.id !== asset.id));
      onDelete(asset);
    } catch {
      setError(`Не удалось удалить «${asset.filename}».`);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-400">Загрузка медиатеки…</p>;
  }

  if (error) {
    return (
      <p role="alert" className="text-sm text-rose-400">
        {error}
      </p>
    );
  }

  if (items.length === 0) {
    return <p className="text-sm text-slate-400">Медиафайлы пока не добавлены.</p>;
  }

  return (
    <ul aria-label="Локальная медиатека" className="grid grid-cols-2 gap-3">
      {items.map(({ asset, previewUrl }) => (
        <li
          key={asset.id}
          className="rounded-lg border border-slate-700 bg-slate-900 p-3"
        >
          <div className="mb-2 aspect-video overflow-hidden rounded bg-slate-800">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={asset.filename}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-500">
                Нет предпросмотра
              </div>
            )}
          </div>
          <p className="truncate text-sm text-slate-200">{asset.filename}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              aria-label={`Вставить ${asset.filename}`}
              className="rounded bg-indigo-500 px-2 py-1 text-xs text-white hover:bg-indigo-400"
              onClick={() => onInsert(asset)}
            >
              Вставить
            </button>
            <button
              type="button"
              aria-label={`Заменить выбранное изображение на ${asset.filename}`}
              className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:border-indigo-400"
              onClick={() => onReplace(asset)}
            >
              Заменить
            </button>
            <button
              type="button"
              aria-label={`Удалить ${asset.filename}`}
              className="rounded border border-rose-500/40 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10"
              onClick={() => {
                void handleDelete(asset, previewUrl);
              }}
            >
              Удалить
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
