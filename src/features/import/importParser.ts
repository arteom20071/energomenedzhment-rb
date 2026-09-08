import {
  formatValidationErrors,
  parsePresentation,
  type Presentation,
  type ValidationError,
} from "../../domain/presentation";
import { MAX_IMPORT_BYTES, IMPORT_ERRORS } from "../../services/export/errors";

export type ImportResult =
  | { success: true; data: Presentation; summary: ImportSummary }
  | { success: false; errors: ValidationError[]; atomic: true };

export interface ImportSummary {
  title: string;
  slideCount: number;
  elementCount: number;
}

function countElements(presentation: Presentation): number {
  return presentation.slides.reduce((total, slide) => total + slide.elements.length, 0);
}

function byteLength(input: string): number {
  return new TextEncoder().encode(input).length;
}

export function parseImportJson(raw: string): ImportResult {
  if (byteLength(raw) > MAX_IMPORT_BYTES) {
    return {
      success: false,
      errors: [{ path: "(root)", message: IMPORT_ERRORS.tooLarge }],
      atomic: true,
    };
  }

  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return {
      success: false,
      errors: [{ path: "(root)", message: IMPORT_ERRORS.empty }],
      atomic: true,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    const detail = error instanceof SyntaxError ? error.message : "неизвестная ошибка";
    return {
      success: false,
      errors: [{ path: "(root)", message: IMPORT_ERRORS.syntax(detail) }],
      atomic: true,
    };
  }

  const validated = parsePresentation(parsed);
  if (!validated.success) {
    return { success: false, errors: validated.errors, atomic: true };
  }

  return {
    success: true,
    data: validated.data,
    summary: {
      title: validated.data.title,
      slideCount: validated.data.slides.length,
      elementCount: countElements(validated.data),
    },
  };
}

export function formatImportErrors(errors: ValidationError[]): string {
  return formatValidationErrors(errors);
}

export async function parseImportFile(file: File): Promise<ImportResult> {
  if (file.size > MAX_IMPORT_BYTES) {
    return {
      success: false,
      errors: [{ path: "(root)", message: IMPORT_ERRORS.tooLarge }],
      atomic: true,
    };
  }

  const text = await file.text();
  return parseImportJson(text);
}
