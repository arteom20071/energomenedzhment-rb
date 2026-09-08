const WINDOWS_RESERVED = new Set([
  "CON",
  "PRN",
  "AUX",
  "NUL",
  ...Array.from({ length: 9 }, (_, index) => `COM${index + 1}`),
  ...Array.from({ length: 9 }, (_, index) => `LPT${index + 1}`),
]);

const UNSAFE_FILENAME_CHARS = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*']);

function truncateCodePoints(value: string, maxLength: number): string {
  const codePoints = [...value];
  if (codePoints.length <= maxLength) {
    return value;
  }
  return codePoints.slice(0, maxLength).join("");
}

function stripControlChars(value: string): string {
  return [...value]
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code >= 32 && !UNSAFE_FILENAME_CHARS.has(char);
    })
    .join("");
}

function normalizeWindowsBasename(value: string): string {
  let base = value.replace(/[\s.]+$/g, "");
  if (base.length === 0) {
    base = "presentation";
  }

  const upper = base.toUpperCase();
  if (WINDOWS_RESERVED.has(upper)) {
    return `${base}_`;
  }

  return base;
}

export function sanitizeExportBasename(title: string, maxLength = 80): string {
  const stripped = stripControlChars(title.trim())
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  const truncated = truncateCodePoints(stripped, maxLength);
  return normalizeWindowsBasename(truncated.length > 0 ? truncated : "presentation");
}

export function sanitizeJsonFilename(title: string): string {
  return `${sanitizeExportBasename(title)}.presentation.json`;
}

export function sanitizeHtmlFilename(title: string): string {
  return `${sanitizeExportBasename(title)}.html`;
}
