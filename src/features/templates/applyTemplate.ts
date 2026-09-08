import { createSlide } from "../../domain/factories";
import type { Slide } from "../../domain/presentation";
import {
  buildMetricsGridElements,
  buildTimelineElements,
  buildTitleElements,
  buildTwoColumnsElements,
} from "./templateBuilders";

export type TemplateId = "title" | "two-columns" | "metrics-grid" | "timeline";

export interface SlideTemplateDefinition {
  id: TemplateId;
  name: string;
  description: string;
  previewColors: string[];
}

export const SLIDE_TEMPLATES: SlideTemplateDefinition[] = [
  {
    id: "title",
    name: "Титульный",
    description: "Заголовок, подзаголовок и область для изображения",
    previewColors: ["#6366f1", "#0f172a", "#f8fafc"],
  },
  {
    id: "two-columns",
    name: "2 колонки",
    description: "Две равные колонки с заголовками",
    previewColors: ["#6366f1", "#334155", "#cbd5e1"],
  },
  {
    id: "metrics-grid",
    name: "Метрики",
    description: "Сетка карточек с показателями",
    previewColors: ["#6366f1", "#0f172a", "#f8fafc"],
  },
  {
    id: "timeline",
    name: "Таймлайн",
    description: "Горизонтальная последовательность этапов",
    previewColors: ["#6366f1", "#cbd5e1", "#0f172a"],
  },
];

const TEMPLATE_BUILDERS: Record<
  TemplateId,
  (occupiedIds: Set<string>) => ReturnType<typeof buildTitleElements>
> = {
  title: buildTitleElements,
  "two-columns": buildTwoColumnsElements,
  "metrics-grid": buildMetricsGridElements,
  timeline: buildTimelineElements,
};

export function applyTemplate(
  templateId: TemplateId,
  occupiedIds?: Set<string>,
): Slide {
  const usedIds = occupiedIds ? new Set(occupiedIds) : new Set<string>();
  const builder = TEMPLATE_BUILDERS[templateId];
  const elements = builder(usedIds);
  return createSlide(elements, usedIds);
}
