import type {
  Presentation,
  Slide,
  SlideElement,
  SlideElementType,
} from "./presentation";

type IdGenerator = () => string;

let customIdGenerator: IdGenerator | null = null;

export function setIdGenerator(generator: IdGenerator): void {
  customIdGenerator = generator;
}

export function resetIdGenerator(): void {
  customIdGenerator = null;
}

export function generateId(): string {
  if (customIdGenerator) {
    return customIdGenerator();
  }

  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function nextZIndex(elements: SlideElement[]): number {
  if (elements.length === 0) {
    return 0;
  }

  return Math.max(...elements.map((element) => element.zIndex)) + 1;
}

export function createSlide(elements: SlideElement[] = []): Slide {
  return {
    id: generateId(),
    background: "#ffffff",
    transition: "fade",
    elements: [...elements],
  };
}

export function createPresentation(title = "Untitled presentation"): Presentation {
  const slide = createSlide();
  return {
    id: generateId(),
    title,
    aspectRatio: "16:9",
    slides: [slide],
  };
}

type ElementOverrides = Partial<
  Pick<
    SlideElement,
    "x" | "y" | "width" | "height" | "rotation" | "zIndex" | "animation" | "content" | "styles"
  >
>;

function createBaseElement(
  type: SlideElementType,
  existingElements: SlideElement[],
  overrides: ElementOverrides = {},
): SlideElement {
  return {
    id: generateId(),
    type,
    x: overrides.x ?? 100,
    y: overrides.y ?? 100,
    width: overrides.width ?? 320,
    height: overrides.height ?? 120,
    rotation: overrides.rotation ?? 0,
    zIndex: overrides.zIndex ?? nextZIndex(existingElements),
    animation: overrides.animation,
    content: overrides.content,
    styles: overrides.styles ?? {},
  };
}

export function createTextElement(
  existingElements: SlideElement[] = [],
  overrides: ElementOverrides = {},
): SlideElement {
  return createBaseElement("text", existingElements, {
    height: 80,
    content: "Text",
    styles: {
      fontSize: 32,
      color: "#111827",
      fontFamily: "Inter, sans-serif",
    },
    ...overrides,
  });
}

export function createShapeElement(
  existingElements: SlideElement[] = [],
  overrides: ElementOverrides = {},
): SlideElement {
  return createBaseElement("shape", existingElements, {
    width: 240,
    height: 240,
    styles: {
      fill: "#6366f1",
      borderRadius: 8,
    },
    ...overrides,
  });
}

export function createImageElement(
  existingElements: SlideElement[] = [],
  overrides: ElementOverrides = {},
): SlideElement {
  return createBaseElement("image", existingElements, {
    width: 480,
    height: 270,
    styles: {
      objectFit: "cover",
      alt: "",
    },
    ...overrides,
  });
}
