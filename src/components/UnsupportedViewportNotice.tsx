export function UnsupportedViewportNotice() {
  return (
    <section className="grid min-h-screen place-items-center bg-slate-950 p-8 text-center text-slate-100">
      <div>
        <h1 className="text-xl font-semibold">Требуется рабочая область для настольного ПК</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-400">
          Редактор презентаций рассчитан на ширину экрана не менее 1024 пикселей.
        </p>
      </div>
    </section>
  );
}
