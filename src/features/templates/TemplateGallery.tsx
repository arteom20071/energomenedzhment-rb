import { SLIDE_TEMPLATES, type TemplateId } from "./applyTemplate";

export interface TemplateGalleryProps {
  onSelect: (templateId: TemplateId) => void;
}

export function TemplateGallery({ onSelect }: TemplateGalleryProps) {
  return (
    <div aria-label="Галерея шаблонов" className="grid grid-cols-2 gap-3">
      {SLIDE_TEMPLATES.map((template) => (
        <button
          key={template.id}
          type="button"
          aria-label={template.name}
          className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-left hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          onClick={() => onSelect(template.id)}
        >
          <div
            aria-hidden="true"
            className="mb-2 flex h-16 overflow-hidden rounded"
          >
            {template.previewColors.map((color) => (
              <span
                key={color}
                className="flex-1"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <span className="block text-sm font-medium text-slate-100">
            {template.name}
          </span>
          <span className="mt-1 block text-xs text-slate-400">
            {template.description}
          </span>
        </button>
      ))}
    </div>
  );
}
