import { useEffect, useState } from "react";

import type { MediaAsset, MediaRepository } from "./types";

export interface MediaGridProps {
  repository: MediaRepository;
  onInsert: (asset: MediaAsset) => void;
  onReplace: (asset: MediaAsset) => void;
  onDelete: (asset: MediaAsset) => void;
}

interface AssetPreview {
  asset: MediaAsset;
  previewUrl: string | null;
}

export function MediaGrid({
  repository,
  onInsert,
  onReplace,
  onDelete,
}: MediaGridProps) {
  const [items, setItems] = useState<AssetPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadAssets() {
      setLoading(true);
      const assets = await repository.list();
      const previews = await Promise.all(
        assets.map(async (asset) => ({
          asset,
          previewUrl: await repository.getPreviewUrl(asset.id),
        })),
      );

      if (!cancelled) {
        setItems(previews);
        setLoading(false);
      }
    }

    void loadAssets();
    return () => {
      cancelled = true;
    };
  }, [repository]);

  const handleDelete = async (asset: MediaAsset) => {
    await repository.delete(asset.id);
    setItems((current) => current.filter((item) => item.asset.id !== asset.id));
    onDelete(asset);
  };

  if (loading) {
    return <p className="text-sm text-slate-400">Загрузка медиатеки…</p>;
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
                void handleDelete(asset);
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
