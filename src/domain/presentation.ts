import { z } from "zod";

export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;

export type AspectRatio = "16:9";
export type SlideTransition = "fade" | "slide" | "zoom" | "none";
export type SlideElementType = "text" | "image" | "shape";
export type ElementAnimation = "fade-up" | "scale" | "bounce";

export interface SlideElement {
  id: string;
  type: SlideElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  animation?: ElementAnimation;
  content?: string;
  styles: Record<string, unknown>;
}

export interface Slide {
  id: string;
  background: string;
  transition: SlideTransition;
  elements: SlideElement[];
}

export interface Presentation {
  id: string;
  title: string;
  aspectRatio: AspectRatio;
  slides: Slide[];
}

export interface ValidationError {
  path: string;
  message: string;
}

export type ParsePresentationResult =
  | { success: true; data: Presentation }
  | { success: false; errors: ValidationError[] };

const FORBIDDEN_STYLE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function isJsonSafeValue(value: unknown): boolean {
  if (value === null) {
    return true;
  }

  const valueType = typeof value;

  if (valueType === "string" || valueType === "boolean") {
    return true;
  }

  if (valueType === "number") {
    return Number.isFinite(value);
  }

  if (valueType === "function" || valueType === "symbol" || valueType === "bigint") {
    return false;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonSafeValue);
  }

  if (valueType === "object") {
    if (Object.getPrototypeOf(value) !== Object.prototype && !Array.isArray(value)) {
      return false;
    }

    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      if (FORBIDDEN_STYLE_KEYS.has(key)) {
        return false;
      }
      if (!isJsonSafeValue(nestedValue)) {
        return false;
      }
    }
    return true;
  }

  return false;
}

const jsonSafeStylesSchema = z
  .record(z.string(), z.unknown())
  .superRefine((styles, context) => {
    for (const key of Object.keys(styles)) {
      if (FORBIDDEN_STYLE_KEYS.has(key)) {
        context.addIssue({
          code: "custom",
          message: `Forbidden styles key: ${key}`,
          path: [key],
        });
      }
    }

    if (!isJsonSafeValue(styles)) {
      context.addIssue({
        code: "custom",
        message: "styles must contain only JSON-safe values",
      });
    }
  });

export const slideElementSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(["text", "image", "shape"]),
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().finite().positive(),
    height: z.number().finite().positive(),
    rotation: z.number().finite(),
    zIndex: z.number().finite(),
    animation: z.enum(["fade-up", "scale", "bounce"]).optional(),
    content: z.string().optional(),
    styles: jsonSafeStylesSchema,
  })
  .strict();

export const slideSchema = z
  .object({
    id: z.string().min(1),
    background: z.string().min(1),
    transition: z.enum(["fade", "slide", "zoom", "none"]),
    elements: z.array(slideElementSchema),
  })
  .strict();

export const presentationSchema = z
  .object({
    id: z.string().min(1),
    title: z.string(),
    aspectRatio: z.literal("16:9"),
    slides: z.array(slideSchema).min(1),
  })
  .strict();

function collectForbiddenKeyErrors(input: unknown, path = "(root)"): ValidationError[] {
  if (input === null || typeof input !== "object") {
    return [];
  }

  if (Array.isArray(input)) {
    return input.flatMap((item, index) => collectForbiddenKeyErrors(item, `${path}.${index}`));
  }

  const errors: ValidationError[] = [];

  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string") {
      continue;
    }

    if (FORBIDDEN_STYLE_KEYS.has(key)) {
      errors.push({
        path: `${path}.${key}`,
        message: `Forbidden key: ${key}`,
      });
    }

    errors.push(...collectForbiddenKeyErrors((input as Record<string, unknown>)[key], `${path}.${key}`));
  }

  return errors;
}
function collectDuplicateIdErrors(presentation: Presentation): ValidationError[] {
  const seen = new Map<string, string>();

  const register = (id: string, path: string) => {
    const previousPath = seen.get(id);
    if (previousPath) {
      return {
        path,
        message: `duplicate id "${id}" (also used at ${previousPath})`,
      };
    }
    seen.set(id, path);
    return null;
  };

  const errors: ValidationError[] = [];

  const presentationDuplicate = register(presentation.id, "id");
  if (presentationDuplicate) {
    errors.push(presentationDuplicate);
  }

  presentation.slides.forEach((slide, slideIndex) => {
    const slidePath = `slides.${slideIndex}.id`;
    const slideDuplicate = register(slide.id, slidePath);
    if (slideDuplicate) {
      errors.push(slideDuplicate);
    }

    slide.elements.forEach((element, elementIndex) => {
      const elementPath = `slides.${slideIndex}.elements.${elementIndex}.id`;
      const elementDuplicate = register(element.id, elementPath);
      if (elementDuplicate) {
        errors.push(elementDuplicate);
      }
    });
  });

  return errors;
}

function formatZodErrors(error: z.ZodError): ValidationError[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join(".") : "(root)",
    message: issue.message,
  }));
}

export function parsePresentation(input: unknown): ParsePresentationResult {
  const forbiddenKeyErrors = collectForbiddenKeyErrors(input);
  if (forbiddenKeyErrors.length > 0) {
    return { success: false, errors: forbiddenKeyErrors };
  }

  const parsed = presentationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: formatZodErrors(parsed.error) };
  }

  const duplicateErrors = collectDuplicateIdErrors(parsed.data);
  if (duplicateErrors.length > 0) {
    return { success: false, errors: duplicateErrors };
  }

  return { success: true, data: parsed.data };
}

export function validatePresentation(input: unknown): ParsePresentationResult {
  return parsePresentation(input);
}
