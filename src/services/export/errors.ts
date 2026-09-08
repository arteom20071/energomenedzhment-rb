export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export const IMPORT_ERRORS = {
  empty: "JSON не может быть пустым.",
  tooLarge: "Размер JSON превышает допустимый лимит (5 МБ).",
  syntax: (detail: string) => `Синтаксическая ошибка JSON: ${detail}`,
  validation: (path: string, message: string) => `${path}: ${message}`,
} as const;

export const EXPORT_ERRORS = {
  validation: (path: string, message: string) => `Экспорт отменён: ${path}: ${message}`,
  capture: (slideIndex: number, detail: string) =>
    `Не удалось экспортировать слайд ${slideIndex + 1}: ${detail}`,
  timeout: (slideIndex: number) =>
    `Превышено время ожидания загрузки ресурсов слайда ${slideIndex + 1}.`,
} as const;
