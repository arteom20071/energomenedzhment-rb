export const EXPORT_ERRORS = {
  validation: (path: string, message: string) => `Экспорт отменён: ${path}: ${message}`,
  fontLoad: (slideIndex: number, detail: string) =>
    `Не удалось загрузить шрифты слайда ${slideIndex + 1}: ${detail}`,
  imageDecode: (slideIndex: number, detail: string) =>
    `Не удалось декодировать изображение слайда ${slideIndex + 1}: ${detail}`,
  imageLoad: (slideIndex: number, detail: string) =>
    `Не удалось загрузить изображение слайда ${slideIndex + 1}: ${detail}`,
  resourceTimeout: (slideIndex: number) =>
    `Превышено время ожидания загрузки ресурсов слайда ${slideIndex + 1}.`,
  captureTimeout: (slideIndex: number) =>
    `Превышено время ожидания экспорта слайда ${slideIndex + 1}.`,
  capture: (slideIndex: number, detail: string) =>
    `Не удалось экспортировать слайд ${slideIndex + 1}: ${detail}`,
  /** @deprecated use resourceTimeout */
  timeout: (slideIndex: number) =>
    `Превышено время ожидания загрузки ресурсов слайда ${slideIndex + 1}.`,
} as const;

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export const IMPORT_ERRORS = {
  empty: "JSON не может быть пустым.",
  tooLarge: "Размер JSON превышает допустимый лимит (5 МБ).",
  syntax: (detail: string) => `Синтаксическая ошибка JSON: ${detail}`,
  validation: (path: string, message: string) => `${path}: ${message}`,
} as const;

export class ResourceWaitError extends Error {
  constructor(
    message: string,
    readonly kind: "font" | "image-decode" | "image-load" | "timeout",
  ) {
    super(message);
    this.name = "ResourceWaitError";
  }
}

export class CaptureError extends Error {
  constructor(
    message: string,
    readonly kind: "timeout" | "capture",
  ) {
    super(message);
    this.name = "CaptureError";
  }
}
