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
  return filesFromList(dataTransfer.files);
}

export function extractFilesFromClipboard(dataTransfer: DataTransfer): File[] {
  return filesFromList(dataTransfer.files);
}

export async function extractFilesFromClipboardEvent(
  event: ClipboardEvent,
): Promise<File[]> {
  if (!event.clipboardData) {
    return [];
  }
  return extractFilesFromClipboard(event.clipboardData);
}
