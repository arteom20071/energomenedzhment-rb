import { useEffect, useRef, useState } from "react";

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

interface ActivePreviewOwnership {
  repository: MediaRepository;
  acquired: AcquiredPreview[];
  generation: number;
}

async function releaseAcquiredPreviews(
  repository: MediaRepository,
  acquired: AcquiredPreview[],
): Promise<void> {
  await Promise.all(
    acquired.map(async (preview) => {
      try {
        await repository.releasePreviewUrl(preview.assetId, preview.url);
      } catch {
        // Release failures should not block UI teardown.
      }
    }),
  );
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
  const deleteGenerationRef = useRef(0);
  const mountedRef = useRef(true);
  const activePreviewsRef = useRef<ActivePreviewOwnership>({
    repository,
    acquired: [],
    generation: 0,
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const loadRepository = repository;
    const loadGeneration = ++generationRef.current;
    const localAcquired: AcquiredPreview[] = [];

    const previousActive = activePreviewsRef.current;
    activePreviewsRef.current = {
      repository: loadRepository,
      acquired: [],
      generation: loadGeneration,
    };

    void releaseAcquiredPreviews(previousActive.repository, previousActive.acquired);

    async function releaseLocalAcquired(): Promise<void> {
      const pending = localAcquired.splice(0, localAcquired.length);
      await releaseAcquiredPreviews(loadRepository, pending);
    }

    async function loadAssets() {
      if (mountedRef.current && loadGeneration === generationRef.current) {
        setLoading(true);
        setError(null);
      }

      try {
        const rawAssets = await loadRepository.list();
        if (loadGeneration !== generationRef.current) {
          await releaseLocalAcquired();
          return;
        }

        const parsedAssets = safeParseMediaAssets(rawAssets);
        if (!parsedAssets.success) {
          if (mountedRef.current && loadGeneration === generationRef.current) {
            setError(parsedAssets.error);
            setItems([]);
            setLoading(false);
          }
          await releaseLocalAcquired();
          return;
        }

        const previews: AssetPreview[] = [];
        for (const asset of parsedAssets.data) {
          if (loadGeneration !== generationRef.current) {
            await releaseLocalAcquired();
            return;
          }

          let previewUrl: string | null = null;
          try {
            previewUrl = await loadRepository.getPreviewUrl(asset.id);
          } catch {
            if (mountedRef.current && loadGeneration === generationRef.current) {
              setError(`Не удалось получить предпросмотр для «${asset.filename}».`);
            }
            continue;
          }

          if (loadGeneration !== generationRef.current) {
            if (previewUrl) {
              await releaseAcquiredPreviews(loadRepository, [
                { assetId: asset.id, url: previewUrl },
              ]);
            }
            await releaseLocalAcquired();
            return;
          }

          if (previewUrl) {
            localAcquired.push({ assetId: asset.id, url: previewUrl });
          }
          previews.push({ asset, previewUrl });
        }

        if (loadGeneration !== generationRef.current) {
          await releaseLocalAcquired();
          return;
        }

        activePreviewsRef.current = {
          repository: loadRepository,
          acquired: [...localAcquired],
          generation: loadGeneration,
        };
        localAcquired.length = 0;

        if (mountedRef.current && loadGeneration === generationRef.current) {
          setItems(previews);
          setLoading(false);
        }
      } catch {
        await releaseLocalAcquired();
        if (mountedRef.current && loadGeneration === generationRef.current) {
          setError("Не удалось загрузить медиатеку.");
          setItems([]);
          setLoading(false);
        }
      }
    }

    void loadAssets();

    return () => {
      void (async () => {
        await releaseLocalAcquired();
        const active = activePreviewsRef.current;
        if (active.generation === loadGeneration) {
          await releaseAcquiredPreviews(active.repository, active.acquired);
          if (activePreviewsRef.current.generation === loadGeneration) {
            activePreviewsRef.current = {
              repository: loadRepository,
              acquired: [],
              generation: loadGeneration,
            };
          }
        }
      })();
    };
  }, [repository, refreshKey]);

  const handleDelete = async (asset: MediaAsset, previewUrl: string | null) => {
    const deleteGeneration = ++deleteGenerationRef.current;
    const deleteRepository = repository;

    if (mountedRef.current && deleteGeneration === deleteGenerationRef.current) {
      setError(null);
    }

    try {
      await deleteRepository.delete(asset.id);
    } catch {
      if (
        mountedRef.current &&
        deleteGeneration === deleteGenerationRef.current &&
        deleteRepository === repository
      ) {
        setError(`Не удалось удалить «${asset.filename}».`);
      }
      return;
    }

    if (
      !mountedRef.current ||
      deleteGeneration !== deleteGenerationRef.current ||
      deleteRepository !== repository
    ) {
      return;
    }

    if (previewUrl) {
      try {
        await deleteRepository.releasePreviewUrl(asset.id, previewUrl);
      } catch {
        // Ignore release errors after successful delete.
      }

      if (activePreviewsRef.current.repository === deleteRepository) {
        activePreviewsRef.current.acquired = activePreviewsRef.current.acquired.filter(
          (preview) => !(preview.assetId === asset.id && preview.url === previewUrl),
        );
      }
    }

    if (
      !mountedRef.current ||
      deleteGeneration !== deleteGenerationRef.current ||
      deleteRepository !== repository
    ) {
      return;
    }

    setItems((current) => current.filter((item) => item.asset.id !== asset.id));
    onDelete(asset);
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
