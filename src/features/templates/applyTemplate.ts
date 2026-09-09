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
  previewColors: readonly string[];
}

const TEMPLATE_BACKGROUND = "#0f172a";

const SLIDE_TEMPLATE_DEFINITIONS = [
  {
    id: "title" as const,
    name: "Титульный",
    description: "Заголовок, подзаголовок и область для изображения",
    previewColors: Object.freeze(["#6366f1", "#0f172a", "#f8fafc"]),
  },
  {
    id: "two-columns" as const,
    name: "2 колонки",
    description: "Две равные колонки с заголовками",
    previewColors: Object.freeze(["#6366f1", "#334155", "#cbd5e1"]),
  },
  {
    id: "metrics-grid" as const,
    name: "Метрики",
    description: "Сетка карточек с показателями",
    previewColors: Object.freeze(["#6366f1", "#0f172a", "#f8fafc"]),
  },
  {
    id: "timeline" as const,
    name: "Таймлайн",
    description: "Горизонтальная последовательность этапов",
    previewColors: Object.freeze(["#6366f1", "#cbd5e1", "#0f172a"]),
  },
].map((template) =>
  Object.freeze({
    ...template,
    previewColors: template.previewColors,
  }),
) satisfies readonly SlideTemplateDefinition[];

export const SLIDE_TEMPLATES = Object.freeze(
  SLIDE_TEMPLATE_DEFINITIONS,
) as readonly SlideTemplateDefinition[];

export function getSlideTemplates(): SlideTemplateDefinition[] {
  return SLIDE_TEMPLATES.map((template) => ({
    ...template,
    previewColors: [...template.previewColors],
  }));
}

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
  return {
    ...createSlide(elements, usedIds),
    background: TEMPLATE_BACKGROUND,
  };
}
