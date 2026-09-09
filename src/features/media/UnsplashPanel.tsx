export interface UnsplashPanelProps {
  isConfigured: boolean;
  accessKey: string;
  onAccessKeyChange: (value: string) => void;
  onConfigure: () => void;
}

export function UnsplashPanel({
  isConfigured,
  accessKey,
  onAccessKeyChange,
  onConfigure,
}: UnsplashPanelProps) {
  if (isConfigured) {
    return (
      <section aria-label="Unsplash" className="space-y-2">
        <p className="text-sm text-slate-300">Unsplash подключён.</p>
        <p className="text-xs text-slate-500">
          Поиск изображений будет доступен после интеграции провайдера.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Unsplash" className="space-y-3 rounded-lg border border-slate-700 p-4">
      <p className="text-sm text-slate-300">Требуется настройка Unsplash</p>
      <p className="text-xs text-slate-500">
        Укажите ключ доступа Unsplash Access Key, чтобы включить поиск изображений.
      </p>
      <label className="block space-y-1">
        <span className="text-xs text-slate-400">Ключ доступа Unsplash</span>
        <input
          type="password"
          value={accessKey}
          aria-label="Ключ доступа Unsplash"
          className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          onChange={(event) => onAccessKeyChange(event.target.value)}
        />
      </label>
      <button
        type="button"
        className="rounded bg-indigo-500 px-3 py-2 text-sm text-white hover:bg-indigo-400"
        onClick={onConfigure}
      >
        Сохранить ключ
      </button>
    </section>
  );
}
