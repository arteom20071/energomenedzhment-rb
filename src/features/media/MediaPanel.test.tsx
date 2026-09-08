import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { MediaAsset, MediaRepository } from "./types";
import { MediaPanel } from "./MediaPanel";

const sampleAsset: MediaAsset = {
  id: "asset-1",
  filename: "photo.png",
  mimeType: "image/png",
  sizeBytes: 1024,
  width: 800,
  height: 600,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function createRepository(
  overrides: Partial<MediaRepository> = {},
): MediaRepository {
  return {
    list: vi.fn(async () => [sampleAsset]),
    getPreviewUrl: vi.fn(async () => "blob:preview"),
    releasePreviewUrl: vi.fn(),
    delete: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("MediaPanel", () => {
  it("shows accepted formats and upload control", async () => {
    render(
      <MediaPanel
        repository={createRepository()}
        onAddImage={vi.fn()}
        validateFile={vi.fn(async () => ({
          success: true as const,
          file: {
            blob: new Blob(),
            mimeType: "image/png",
            filename: "photo.png",
            width: 1,
            height: 1,
          },
        }))}
      />,
    );

    expect(await screen.findByText(/PNG/i)).toBeInTheDocument();
    expect(screen.getByText(/15\s*МБ/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /загрузить/i })).toBeInTheDocument();
  });

  it("calls onAddImage after successful file selection without mutating repository on failure", async () => {
    const repository = createRepository();
    const onAddImage = vi.fn();
    const validateFile = vi
      .fn()
      .mockResolvedValueOnce({
        success: false as const,
        error: "Неподдерживаемый тип файла",
      })
      .mockResolvedValueOnce({
        success: true as const,
        file: {
          blob: new Blob(["x"], { type: "image/png" }),
          mimeType: "image/png",
          filename: "ok.png",
          width: 10,
          height: 10,
        },
      });

    render(
      <MediaPanel
        repository={repository}
        onAddImage={onAddImage}
        validateFile={validateFile}
      />,
    );

    const input = screen.getByLabelText(/выбор файла/i) as HTMLInputElement;
    const badFile = new File(["bad"], "bad.gif", { type: "image/gif" });
    const goodFile = new File(["ok"], "ok.png", { type: "image/png" });

    fireEvent.change(input, { target: { files: [badFile] } });
    expect(await screen.findByText(/неподдерживаем/i)).toBeInTheDocument();
    expect(onAddImage).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { files: [goodFile] } });
    await waitFor(() => {
      expect(onAddImage).toHaveBeenCalledWith(
        expect.objectContaining({ filename: "ok.png" }),
      );
    });
  });

  it("handles drag-and-drop of image files", async () => {
    const onAddImage = vi.fn();
    const validateFile = vi.fn(async () => ({
      success: true as const,
      file: {
        blob: new Blob(["x"], { type: "image/png" }),
        mimeType: "image/png",
        filename: "drop.png",
        width: 10,
        height: 10,
      },
    }));

    render(
      <MediaPanel
        repository={createRepository()}
        onAddImage={onAddImage}
        validateFile={validateFile}
      />,
    );

    const dropZone = screen.getByLabelText(/перетащите/i);
    const file = new File(["x"], "drop.png", { type: "image/png" });

    fireEvent.dragOver(dropZone);
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
        items: [],
        types: ["Files"],
      },
    });

    await waitFor(() => {
      expect(onAddImage).toHaveBeenCalled();
    });
  });

  it("shows Russian error for unsupported file dropped alongside supported file", async () => {
    const onAddImage = vi.fn();
    const validateFile = vi.fn(async (file: File) => {
      if (file.type === "text/plain") {
        return {
          success: false as const,
          error: "Неподдерживаемый тип файла. Допустимы PNG, JPEG, WebP и SVG.",
        };
      }
      return {
        success: true as const,
        file: {
          blob: file,
          mimeType: "image/png",
          filename: file.name,
          width: 10,
          height: 10,
        },
      };
    });

    render(
      <MediaPanel
        repository={createRepository()}
        onAddImage={onAddImage}
        validateFile={validateFile}
      />,
    );

    const dropZone = screen.getByLabelText(/перетащите/i);
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [
          new File(["x"], "ok.png", { type: "image/png" }),
          new File(["y"], "notes.txt", { type: "text/plain" }),
        ],
        items: [],
        types: ["Files"],
      },
    });

    await waitFor(() => {
      expect(onAddImage).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(/неподдерживаем/i);
  });

  it("keeps batch rejection when valid file follows unsupported file", async () => {
    const onAddImage = vi.fn();
    const validateFile = vi.fn(async (file: File) => {
      if (file.name.endsWith(".gif")) {
        return {
          success: false as const,
          error: "Неподдерживаемый тип файла. Допустимы PNG, JPEG, WebP и SVG.",
        };
      }
      return {
        success: true as const,
        file: {
          blob: file,
          mimeType: "image/png",
          filename: file.name,
          width: 10,
          height: 10,
        },
      };
    });

    render(
      <MediaPanel
        repository={createRepository()}
        onAddImage={onAddImage}
        validateFile={validateFile}
      />,
    );

    const input = screen.getByLabelText(/выбор файла/i);
    fireEvent.change(input, {
      target: {
        files: [
          new File(["bad"], "bad.gif", { type: "image/gif" }),
          new File(["ok"], "ok.png", { type: "image/png" }),
        ],
      },
    });

    await waitFor(() => {
      expect(onAddImage).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(/неподдерживаем/i);
  });

  it("shows Russian error when onAddImage fails", async () => {
    render(
      <MediaPanel
        repository={createRepository()}
        onAddImage={vi.fn(async () => {
          throw new Error("save failed");
        })}
        validateFile={vi.fn(async () => ({
          success: true as const,
          file: {
            blob: new Blob(["x"], { type: "image/png" }),
            mimeType: "image/png",
            filename: "ok.png",
            width: 10,
            height: 10,
          },
        }))}
      />,
    );

    const input = screen.getByLabelText(/выбор файла/i);
    fireEvent.change(input, {
      target: { files: [new File(["x"], "ok.png", { type: "image/png" })] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(/сохран/i);
  });

  it("refreshes mounted grid after successful upload without repository identity change", async () => {
    const assets: MediaAsset[] = [sampleAsset];
    const repository = createRepository({
      list: vi.fn(async () => assets),
      getPreviewUrl: vi.fn(async (id: string) => `blob:${id}`),
    });

    const onAddImage = vi.fn(async () => {
      assets.push({
        id: "asset-2",
        filename: "added.png",
        mimeType: "image/png",
        sizeBytes: 10,
        width: 10,
        height: 10,
        createdAt: "2026-01-03T00:00:00.000Z",
      });
    });

    render(
      <MediaPanel
        repository={repository}
        onAddImage={onAddImage}
        onInsert={vi.fn()}
        onReplace={vi.fn()}
        onDelete={vi.fn()}
        validateFile={vi.fn(async () => ({
          success: true as const,
          file: {
            blob: new Blob(["x"], { type: "image/png" }),
            mimeType: "image/png",
            filename: "added.png",
            width: 10,
            height: 10,
          },
        }))}
      />,
    );

    await screen.findByText("photo.png");

    const input = screen.getByLabelText(/выбор файла/i);
    fireEvent.change(input, {
      target: { files: [new File(["x"], "added.png", { type: "image/png" })] },
    });

    expect(await screen.findByText("added.png")).toBeInTheDocument();
  });
});
