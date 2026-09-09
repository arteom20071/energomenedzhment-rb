/// <reference types="node" />
import { describe, expect, it, vi } from "vitest";

import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  parsePresentation,
  type Presentation,
  type Slide,
  type SlideElement,
} from "../domain/presentation";
import {
  energyManagementPresentation,
  resolveSeedAssetUrl,
} from "./energyManagement";

const EXPECTED_FIXED_IDS = [
  "em-pres",
  "em-slide-00",
  "em-slide-01",
  "em-slide-02",
  "em-slide-10",
  "em-slide-03",
  "em-slide-04",
  "em-slide-05",
  "em-slide-06",
  "em-slide-07",
  "em-slide-08",
  "em-slide-09",
] as const;

const EXPECTED_SLIDES: Array<{
  titleAnchor: string;
  contentAnchors: string[];
}> = [
  {
    titleAnchor: "Цели, задачи и организация энергоменеджмента и энергоаудита на предприятии",
    contentAnchors: [
      "Белорусский государственный медицинский университет",
      "Ласица Я.В.",
      "группа 7108",
      "стоматологического факультета",
    ],
  },
  {
    titleAnchor: "Зачем предприятию энергоменеджмент",
    contentAnchors: ["паспорт объекта", "4-энергосбережение"],
  },
  {
    titleAnchor: "Какие документы действуют в Беларуси",
    contentAnchors: [
      "№ 111-З",
      "energoeffect.gov.by",
      "СТБ 1774",
      "Форма 4-энергосбережение",
    ],
  },
  {
    titleAnchor: "Что нужно делать по закону",
    contentAnchors: ["300 т у.т.", "1 500 т у.т.", "ст. 19"],
  },
  {
    titleAnchor: "Когда аудит уже не добровольный",
    contentAnchors: ["в график обследования", "Департамент", "поверенные приборы"],
  },
  {
    titleAnchor: "Как проводят обследование",
    contentAnchors: ["36 месяцев", "неучтенный расход", "1 500 т у.т."],
  },
  {
    titleAnchor: "Чем измеряют на обследовании",
    contentAnchors: ["Clamp-on", "действующей поверкой"],
  },
  {
    titleAnchor: "СЭнМ по ГОСТ ISO 50001-2021",
    contentAnchors: ["EnB", "EnPI", "анализ за 3 года"],
  },
  {
    titleAnchor: "Как нормируют ТЭР и какие меры берут",
    contentAnchors: ["1-5 лет", "50 тыс. т у.т.", "«Е-Паслуга»", "ЧРП"],
  },
  {
    titleAnchor: "Кто за что отвечает на предприятии",
    contentAnchors: ["Главный энергетик", "АСКУЭ", "АСТУЭ"],
  },
  {
    titleAnchor: "Что считать результатом",
    contentAnchors: ["Δq", "ISO", "ГОСТ ISO 50001-2021"],
  },
];

const HALL_MIN_FONT = 28;

const SUPPORTED_TRANSITIONS = new Set(["fade", "slide", "zoom", "none"]);
const FORBIDDEN_STYLE_KEYS = ["textTransform", "fontStyle"] as const;

function collectTextContent(slide: Slide): string {
  return slide.elements
    .filter((element) => element.type === "text")
    .map((element) => element.content ?? "")
    .join("\n");
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

describe("resolveSeedAssetUrl", () => {
  it("resolves base-relative paths under a GitHub Pages /repo/ base", () => {
    const path = "assets/images/slide-1-schema.svg";
    expect(resolveSeedAssetUrl(path, "/repo/")).toBe(
      "/repo/assets/images/slide-1-schema.svg",
    );
    expect(resolveSeedAssetUrl(path, "/repo/")).not.toBe("/assets/images/slide-1-schema.svg");
  });

  it("normalizes root base to an absolute /assets path", () => {
    expect(resolveSeedAssetUrl("assets/images/slide-2-legal.svg", "/")).toBe(
      "/assets/images/slide-2-legal.svg",
    );
  });
});

describe("energyManagementPresentation seed", () => {
  it("exports a presentation that passes parsePresentation", () => {
    const result = parsePresentation(energyManagementPresentation);
    expect(result.success).toBe(true);
  });

  it("has a title slide plus content slides with title and content anchors", () => {
    const presentation = energyManagementPresentation;
    expect(presentation.slides).toHaveLength(11);

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
    expect(energyManagementPresentation.title).toContain("энергоменеджмента");
    expect(energyManagementPresentation.title).toContain("энергоаудита");
  });

  it("uses fixed static presentation and slide ids", () => {
    expect(energyManagementPresentation.id).toBe("em-pres");
    expect(energyManagementPresentation.slides.map((slide) => slide.id)).toEqual([
      ...EXPECTED_FIXED_IDS.slice(1),
    ]);
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

  it("keeps hall-readable type and uses photos instead of baked SVG diagrams", () => {
    const [titleSlide, ...contentSlides] = energyManagementPresentation.slides;
    const titleImages = titleSlide!.elements.filter((element) => element.type === "image");
    expect(titleImages).toHaveLength(1);
    expect(titleImages[0]?.content).toContain("assets/images/title-campus.jpg");

    for (const slide of energyManagementPresentation.slides) {
      for (const element of slide.elements) {
        if (element.type !== "text" || element.id.includes("foot")) {
          continue;
        }
        const fontSize = element.styles.fontSize;
        expect(typeof fontSize).toBe("number");
        expect(fontSize).toBeGreaterThanOrEqual(HALL_MIN_FONT);
      }
    }

    contentSlides.forEach((slide) => {
      const images = slide.elements.filter((element) => element.type === "image");
      const texts = slide.elements.filter((element) => element.type === "text");
      const shapes = slide.elements.filter((element) => element.type === "shape");

      expect(images.length).toBeLessThanOrEqual(1);
      for (const image of images) {
        expect(image.content).toMatch(/^assets\/images\/photo-/);
        expect(image.content).not.toMatch(/slide-\d+-/);
      }
      expect(texts.length).toBeGreaterThanOrEqual(2);
      expect(shapes.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("does not use unsupported text style keys", () => {
    for (const slide of energyManagementPresentation.slides) {
      for (const element of slide.elements) {
        for (const key of FORBIDDEN_STYLE_KEYS) {
          expect(element.styles).not.toHaveProperty(key);
        }
      }
    }
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

  it("remains byte-identical after module reimport", async () => {
    const first = JSON.stringify(energyManagementPresentation);
    vi.resetModules();
    const { energyManagementPresentation: reloaded } = await import("./energyManagement");
    expect(JSON.stringify(reloaded)).toBe(first);
    expect(reloaded.id).toBe("em-pres");
    expect(reloaded.slides[8]!.elements.find((e) => e.id === "em-s07-n2-b")?.content).toContain(
      "50 000",
    );
  });
});
