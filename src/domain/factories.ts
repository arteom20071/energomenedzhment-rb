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

export function generateUniqueId(usedIds: Set<string>): string {
  const baseId = generateId();
  if (!usedIds.has(baseId)) {
    return baseId;
  }

  for (let attempt = 1; attempt <= 1000; attempt += 1) {
    const candidate = `${baseId}-${attempt}`;
    if (!usedIds.has(candidate)) {
      return candidate;
    }
  }

  return `${baseId}-fallback-${usedIds.size}`;
}

function nextZIndex(elements: SlideElement[]): number {
  if (elements.length === 0) {
    return 0;
  }

  return Math.max(...elements.map((element) => element.zIndex)) + 1;
}

export function createSlide(elements: SlideElement[] = [], usedIds?: Set<string>): Slide {
  const ids = usedIds ?? new Set<string>();
  for (const element of elements) {
    ids.add(element.id);
  }

  const slideId = generateUniqueId(ids);
  ids.add(slideId);

  return {
    id: slideId,
    background: "#ffffff",
    transition: "fade",
    elements: [...elements],
  };
}

export function createPresentation(title = "Untitled presentation"): Presentation {
  const usedIds = new Set<string>();
  const presentationId = generateUniqueId(usedIds);
  usedIds.add(presentationId);
  const slide = createSlide([], usedIds);

  return {
    id: presentationId,
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

export function collectPresentationIds(presentation: Presentation): Set<string> {
  const ids = new Set<string>([presentation.id]);
  for (const slide of presentation.slides) {
    ids.add(slide.id);
    for (const element of slide.elements) {
      ids.add(element.id);
    }
  }
  return ids;
}
