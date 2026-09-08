import { z } from "zod";

export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;
export const MAX_SLIDES = 100;
export const MAX_ELEMENTS_PER_SLIDE = 1000;

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

function collectJsonUnsafeStyleErrors(
  value: unknown,
  path: (string | number)[],
  context: z.RefinementCtx,
): void {
  if (value === null) {
    return;
  }

  const valueType = typeof value;

  if (valueType === "undefined" || value === undefined) {
    context.addIssue({
      code: "custom",
      message: "styles must not contain undefined values",
      path,
    });
    return;
  }

  if (valueType === "string" || valueType === "boolean") {
    return;
  }

  if (valueType === "number") {
    if (!Number.isFinite(value)) {
      context.addIssue({
        code: "custom",
        message: "styles must contain only JSON-safe values",
        path,
      });
    }
    return;
  }

  if (valueType === "function" || valueType === "symbol" || valueType === "bigint") {
    context.addIssue({
      code: "custom",
      message: "styles must contain only JSON-safe values",
      path,
    });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectJsonUnsafeStyleErrors(item, [...path, index], context);
    });
    return;
  }

  if (valueType === "object") {
    if (Object.getPrototypeOf(value) !== Object.prototype && !Array.isArray(value)) {
      context.addIssue({
        code: "custom",
        message: "styles must contain only JSON-safe values",
        path,
      });
      return;
    }

    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      if (FORBIDDEN_STYLE_KEYS.has(key)) {
        context.addIssue({
          code: "custom",
          message: `Forbidden styles key: ${key}`,
          path: [...path, key],
        });
      }
      collectJsonUnsafeStyleErrors(nestedValue, [...path, key], context);
    }
  }
}

const jsonSafeStylesSchema = z
  .record(z.string(), z.unknown())
  .superRefine((styles, context) => {
    collectJsonUnsafeStyleErrors(styles, [], context);
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
    elements: z.array(slideElementSchema).max(MAX_ELEMENTS_PER_SLIDE),
  })
  .strict();

export const presentationSchema = z
  .object({
    id: z.string().min(1),
    title: z.string(),
    aspectRatio: z.literal("16:9"),
    slides: z.array(slideSchema).min(1).max(MAX_SLIDES),
  })
  .strict();

function formatPath(path: (string | number)[]): string {
  if (path.length === 0) {
    return "(root)";
  }

  let result = "";
  for (const segment of path) {
    if (typeof segment === "number") {
      result += `[${segment}]`;
    } else {
      result += result ? `.${segment}` : segment;
    }
  }
  return result;
}

function formatForbiddenPath(path: string): string {
  return path
    .replace(/^\(root\)\./, "")
    .replace(/\.(\d+)(?=\.|$)/g, "[$1]");
}

function collectForbiddenKeyErrors(input: unknown, path = "(root)"): ValidationError[] {
  if (input === null || typeof input !== "object") {
    return [];
  }

  if (Array.isArray(input)) {
    return input.flatMap((item, index) => collectForbiddenKeyErrors(item, `${path}[${index}]`));
  }

  const errors: ValidationError[] = [];

  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string") {
      continue;
    }

    if (FORBIDDEN_STYLE_KEYS.has(key)) {
      errors.push({
        path: formatForbiddenPath(`${path}.${key}`),
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
    const slidePath = `slides[${slideIndex}].id`;
    const slideDuplicate = register(slide.id, slidePath);
    if (slideDuplicate) {
      errors.push(slideDuplicate);
    }

    slide.elements.forEach((element, elementIndex) => {
      const elementPath = `slides[${slideIndex}].elements[${elementIndex}].id`;
      const elementDuplicate = register(element.id, elementPath);
      if (elementDuplicate) {
        errors.push(elementDuplicate);
      }
    });
  });

  return errors;
}

function formatZodErrors(error: z.ZodError): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const issue of error.issues) {
    const pathSegments = issue.path.filter(
      (segment): segment is string | number => typeof segment !== "symbol",
    );

    if (issue.code === "unrecognized_keys") {
      const keys = "keys" in issue && Array.isArray(issue.keys) ? issue.keys : [];
      for (const key of keys) {
        if (typeof key !== "string") {
          continue;
        }
        errors.push({
          path: formatPath([...pathSegments, key]),
          message: issue.message,
        });
      }
      continue;
    }

    errors.push({
      path: formatPath(pathSegments),
      message: issue.message,
    });
  }

  return errors;
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

export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map((error) => `${error.path}: ${error.message}`).join("; ");
}
