import { describe, expect, it } from "vitest";

import {
  extractFilesFromClipboard,
  extractFilesFromDataTransfer,
  extractFilesFromFileInput,
} from "./ingestion";

function createFile(name: string, type: string): File {
  return new File(["content"], name, { type });
}

describe("ingestion helpers", () => {
  it("extracts files from a file input change event", () => {
    const fileA = createFile("a.png", "image/png");
    const fileB = createFile("b.jpg", "image/jpeg");
    const input = document.createElement("input");
    Object.defineProperty(input, "files", {
      value: {
        length: 2,
        0: fileA,
        1: fileB,
        item: (index: number) => [fileA, fileB][index] ?? null,
        [Symbol.iterator]: function* () {
          yield fileA;
          yield fileB;
        },
      },
    });

    const files = extractFilesFromFileInput(input);
    expect(files).toEqual([fileA, fileB]);
  });

  it("returns empty array when file input has no files", () => {
    const input = document.createElement("input");
    Object.defineProperty(input, "files", { value: null });
    expect(extractFilesFromFileInput(input)).toEqual([]);
  });

  it("preserves unsupported files from DataTransfer drop", () => {
    const png = createFile("drop.png", "image/png");
    const txt = createFile("note.txt", "text/plain");
    const dataTransfer = {
      files: {
        length: 2,
        0: png,
        1: txt,
        item: (index: number) => [png, txt][index] ?? null,
        [Symbol.iterator]: function* () {
          yield png;
          yield txt;
        },
      },
      items: [],
      types: [],
    } as unknown as DataTransfer;

    const files = extractFilesFromDataTransfer(dataTransfer);
    expect(files).toEqual([png, txt]);
  });

  it("preserves all clipboard files including unsupported types", () => {
    const webp = createFile("clip.webp", "image/webp");
    const txt = createFile("notes.txt", "text/plain");
    const dataTransfer = {
      files: {
        length: 2,
        0: webp,
        1: txt,
        item: (index: number) => [webp, txt][index] ?? null,
        [Symbol.iterator]: function* () {
          yield webp;
          yield txt;
        },
      },
      items: [],
      types: ["Files"],
    } as unknown as DataTransfer;

    expect(extractFilesFromClipboard(dataTransfer)).toEqual([webp, txt]);
  });

  it("returns empty array when clipboard has no files", () => {
    const dataTransfer = {
      files: { length: 0, item: () => null, [Symbol.iterator]: function* () {} },
      items: [],
      types: ["text/plain"],
    } as unknown as DataTransfer;

    expect(extractFilesFromClipboard(dataTransfer)).toEqual([]);
  });
});
