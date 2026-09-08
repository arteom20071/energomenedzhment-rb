const IMAGE_MIME_PREFIX = "image/";

function isImageFile(file: File): boolean {
  if (file.type.startsWith(IMAGE_MIME_PREFIX)) {
    return true;
  }

  const lower = file.name.toLowerCase();
  return (
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".svg")
  );
}

function filesFromList(fileList: FileList | null | undefined): File[] {
  if (!fileList) {
    return [];
  }
  return Array.from(fileList);
}

export function extractFilesFromFileInput(input: HTMLInputElement): File[] {
  return filesFromList(input.files);
}

export function extractFilesFromDataTransfer(dataTransfer: DataTransfer): File[] {
  return filesFromList(dataTransfer.files).filter(isImageFile);
}

export function extractFilesFromClipboard(dataTransfer: DataTransfer): File[] {
  return filesFromList(dataTransfer.files).filter(isImageFile);
}

export async function extractFilesFromClipboardEvent(
  event: ClipboardEvent,
): Promise<File[]> {
  if (!event.clipboardData) {
    return [];
  }
  return extractFilesFromClipboard(event.clipboardData);
}
