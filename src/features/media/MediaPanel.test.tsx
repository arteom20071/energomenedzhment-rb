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

function createRepository(): MediaRepository {
  return {
    list: vi.fn(async () => [sampleAsset]),
    getPreviewUrl: vi.fn(async () => "blob:preview"),
    delete: vi.fn(async () => undefined),
  };
}

describe("MediaPanel", () => {
  it("shows accepted formats and upload control", async () => {
    render(
      <MediaPanel
        repository={createRepository()}
        onAddImage={vi.fn()}
        validateFile={vi.fn(async () => ({ success: true as const, file: {
          blob: new Blob(),
          mimeType: "image/png",
          filename: "photo.png",
          width: 1,
          height: 1,
        }}))}
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
});
