/// <reference types="node" />
import { existsSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  parsePresentation,
  type Presentation,
  type Slide,
  type SlideElement,
} from "../domain/presentation";
import { energyManagementPresentation } from "./energyManagement";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const EXPECTED_SLIDES: Array<{
  titleAnchor: string;
  contentAnchors: string[];
}> = [
  {
    titleAnchor:
      "Цели, задачи и организация энергоменеджмента и энергоаудита на предприятии",
    contentAnchors: ["239-З", "ГОСТ ISO 50001", "Республика Беларусь"],
  },
  {
    titleAnchor: "Нормативно-правовой базис энергоэффективности в РБ",
    contentAnchors: ["239-З", "ГОСТ ISO 50001-2021", "4-энергосбережение"],
  },
  {
    titleAnchor: "Критерии обязательности и периодичность",
    contentAnchors: ["1 500", "5 лет", "≥ 3", "ГОСТ ISO 50001-2021"],
  },
  {
    titleAnchor: "Задачи и поэтапный алгоритм энергоаудита",
    contentAnchors: [
      "Документарный анализ",
      "Инструментальное обследование",
      "Энергетический баланс",
      "ТЭО мероприятий",
    ],
  },
  {
    titleAnchor: "Инструментальный парк и контрольные замеры",
    contentAnchors: ["≥ 3", "Тепловизионная", "Ультразвуковая", "ГОСТ 32144"],
  },
  {
    titleAnchor: "СЭнМ по ГОСТ ISO 50001-2021",
    contentAnchors: ["Plan", "Do", "Check", "Act", "PDCA"],
  },
  {
    titleAnchor: "Нормирование ТЭР и классификация мероприятий",
    contentAnchors: ["1 500", "Е-Паслуга", "≤ 1 г.", "CAPEX"],
  },
  {
    titleAnchor: "Организационная структура энергослужбы предприятия",
    contentAnchors: ["Главный энергетик", "АСКУЭ", "АСТУЭ", "EnPI"],
  },
  {
    titleAnchor: "Итоговые показатели эффективности и дорожная карта",
    contentAnchors: ["ROI", "ISO", "Месяцы 1–3", "АСКУЭ/АСТУЭ"],
  },
];

const SUPPORTED_TRANSITIONS = new Set(["fade", "slide", "zoom", "none"]);

function collectTextContent(slide: Slide): string {
  return slide.elements
    .filter((element) => element.type === "text")
    .map((element) => element.content ?? "")
    .join("\n");
}

function resolveImagePath(content: string): string {
  const normalized = content.startsWith("/") ? content.slice(1) : content;
  return join(PROJECT_ROOT, "public", normalized);
}

function isWithinCanvas(element: SlideElement, margin = 8): boolean {
  const right = element.x + element.width;
  const bottom = element.y + element.height;
  return (
    element.x >= -margin &&
    element.y >= -margin &&
    right <= CANVAS_WIDTH + margin &&
    bottom <= CANVAS_HEIGHT + margin
  );
}

function collectAllIds(presentation: Presentation): string[] {
  const ids = [presentation.id];
  for (const slide of presentation.slides) {
    ids.push(slide.id);
    for (const element of slide.elements) {
      ids.push(element.id);
    }
  }
  return ids;
}

describe("energyManagementPresentation seed", () => {
  it("exports a presentation that passes parsePresentation", () => {
    const result = parsePresentation(energyManagementPresentation);
    expect(result.success).toBe(true);
  });

  it("has exactly 9 slides in legacy order with title and content anchors", () => {
    const presentation = energyManagementPresentation;
    expect(presentation.slides).toHaveLength(9);

    presentation.slides.forEach((slide, index) => {
      const expected = EXPECTED_SLIDES[index]!;
      const textBlob = collectTextContent(slide);
      expect(textBlob).toContain(expected.titleAnchor);
      for (const anchor of expected.contentAnchors) {
        expect(textBlob).toContain(anchor);
      }
    });
  });

  it("uses 16:9 aspect ratio and Russian presentation title", () => {
    expect(energyManagementPresentation.aspectRatio).toBe("16:9");
    expect(energyManagementPresentation.title).toContain("Энергоменеджмент");
    expect(energyManagementPresentation.title).toContain("Беларусь");
  });

  it("assigns globally unique ids", () => {
    const ids = collectAllIds(energyManagementPresentation);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps geometry finite, positive, and substantially within canvas", () => {
    for (const slide of energyManagementPresentation.slides) {
      for (const element of slide.elements) {
        expect(Number.isFinite(element.x)).toBe(true);
        expect(Number.isFinite(element.y)).toBe(true);
        expect(Number.isFinite(element.width)).toBe(true);
        expect(Number.isFinite(element.height)).toBe(true);
        expect(element.width).toBeGreaterThan(0);
        expect(element.height).toBeGreaterThan(0);
        expect(isWithinCanvas(element)).toBe(true);
      }
    }
  });

  it("includes one resolvable image per slide and separate editable text", () => {
    energyManagementPresentation.slides.forEach((slide, index) => {
      const images = slide.elements.filter((element) => element.type === "image");
      const texts = slide.elements.filter((element) => element.type === "text");

      expect(images).toHaveLength(1);
      expect(texts.length).toBeGreaterThanOrEqual(2);

      const image = images[0]!;
      expect(image.content).toBeTruthy();
      const filePath = resolveImagePath(image.content!);
      expect(existsSync(filePath)).toBe(true);
      expect(filePath).toMatch(new RegExp(`slide-${index + 1}-`));
    });
  });

  it("includes at least one visual element per slide and unique zIndex within slide", () => {
    for (const slide of energyManagementPresentation.slides) {
      const visuals = slide.elements.filter(
        (element) => element.type === "shape" || element.type === "image",
      );
      expect(visuals.length).toBeGreaterThanOrEqual(1);

      const zIndexes = slide.elements.map((element) => element.zIndex);
      expect(new Set(zIndexes).size).toBe(zIndexes.length);
    }
  });

  it("uses supported transitions varied across slides", () => {
    const transitions = energyManagementPresentation.slides.map(
      (slide) => slide.transition,
    );
    for (const transition of transitions) {
      expect(SUPPORTED_TRANSITIONS.has(transition)).toBe(true);
    }
    expect(new Set(transitions).size).toBeGreaterThanOrEqual(2);
  });

  it("assigns meaningful backgrounds and animations to elements", () => {
    for (const slide of energyManagementPresentation.slides) {
      expect(slide.background.length).toBeGreaterThan(0);
    }

    const animated = energyManagementPresentation.slides.flatMap((slide) =>
      slide.elements.filter((element) => element.animation !== undefined),
    );
    expect(animated.length).toBeGreaterThanOrEqual(9);
  });

  it("serializes deterministically across reloads", () => {
    const first = JSON.stringify(energyManagementPresentation);
    const second = JSON.stringify(
      JSON.parse(first) as typeof energyManagementPresentation,
    );
    expect(second).toBe(first);
  });
});
