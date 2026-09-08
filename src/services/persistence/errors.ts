export type PersistenceErrorKind = "unavailable" | "quota" | "transaction" | "validation";

export interface PersistenceError {
  kind: PersistenceErrorKind;
  message: string;
  cause?: unknown;
}

const UNAVAILABLE_DOM_EXCEPTIONS = new Set([
  "SecurityError",
  "InvalidStateError",
  "NotAllowedError",
]);

export function classifyPersistenceError(error: unknown): PersistenceError {
  if (error instanceof DOMException) {
    if (error.name === "QuotaExceededError") {
      return {
        kind: "quota",
        message:
          "Недостаточно места в локальном хранилище. Освободите место или экспортируйте презентацию в JSON.",
        cause: error,
      };
    }

    if (UNAVAILABLE_DOM_EXCEPTIONS.has(error.name)) {
      return {
        kind: "unavailable",
        message:
          "Локальное хранилище недоступно. Проверьте настройки браузера или режим инкогнито.",
        cause: error,
      };
    }
  }

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (
    lower.includes("indexeddb unavailable") ||
    lower.includes("indexeddb is not available") ||
    lower.includes("securityerror") ||
    lower.includes("invalidstateerror") ||
    lower.includes("notallowederror")
  ) {
    return {
      kind: "unavailable",
      message:
        "Локальное хранилище недоступно. Проверьте настройки браузера или режим инкогнито.",
      cause: error,
    };
  }

  if (lower.includes("quota")) {
    return {
      kind: "quota",
      message:
        "Недостаточно места в локальном хранилище. Освободите место или экспортируйте презентацию в JSON.",
      cause: error,
    };
  }

  return {
    kind: "transaction",
    message: "Не удалось сохранить документ. Повторите попытку.",
    cause: error,
  };
}
