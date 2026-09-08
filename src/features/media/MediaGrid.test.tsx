import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { MediaAsset, MediaRepository } from "./types";
import { MediaGrid } from "./MediaGrid";

const sampleAssets: MediaAsset[] = [
  {
    id: "asset-1",
    filename: "photo.png",
    mimeType: "image/png",
    sizeBytes: 1024,
    width: 800,
    height: 600,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "asset-2",
    filename: "logo.svg",
    mimeType: "image/svg+xml",
    sizeBytes: 512,
    width: 100,
    height: 100,
    createdAt: "2026-01-02T00:00:00.000Z",
  },
];

function createRepository(
  overrides: Partial<MediaRepository> = {},
): MediaRepository {
  return {
    list: vi.fn(async () => sampleAssets),
    getPreviewUrl: vi.fn(async (id: string) => `blob:preview-${id}`),
    releasePreviewUrl: vi.fn(),
    delete: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("MediaGrid", () => {
  it("renders assets with preview URLs and accessible action labels", async () => {
    const repository = createRepository();
    const onInsert = vi.fn();
    const onReplace = vi.fn();
    const onDelete = vi.fn();

    render(
      <MediaGrid
        repository={repository}
        onInsert={onInsert}
        onReplace={onReplace}
        onDelete={onDelete}
      />,
    );

    expect(await screen.findByText("photo.png")).toBeInTheDocument();
    expect(screen.getByText("logo.svg")).toBeInTheDocument();

    const insertButtons = screen.getAllByRole("button", { name: /вставить/i });
    expect(insertButtons).toHaveLength(2);

    fireEvent.click(insertButtons[0]!);
    expect(onInsert).toHaveBeenCalledWith(sampleAssets[0]);

    fireEvent.click(screen.getAllByRole("button", { name: /заменить/i })[0]!);
    expect(onReplace).toHaveBeenCalledWith(sampleAssets[0]);

    fireEvent.click(screen.getAllByRole("button", { name: /удалить/i })[0]!);
    await waitFor(() => {
      expect(repository.delete).toHaveBeenCalledWith("asset-1");
      expect(onDelete).toHaveBeenCalledWith(sampleAssets[0]);
    });
  });

  it("releases preview URLs on unmount", async () => {
    const repository = createRepository();
    const { unmount } = render(
      <MediaGrid
        repository={repository}
        onInsert={vi.fn()}
        onReplace={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await screen.findByText("photo.png");
    unmount();

    expect(repository.releasePreviewUrl).toHaveBeenCalledWith(
      "asset-1",
      "blob:preview-asset-1",
    );
    expect(repository.releasePreviewUrl).toHaveBeenCalledWith(
      "asset-2",
      "blob:preview-asset-2",
    );
  });

  it("shows Russian error when repository list fails", async () => {
    const repository = createRepository({
      list: vi.fn(async () => {
        throw new Error("db down");
      }),
    });

    render(
      <MediaGrid
        repository={repository}
        onInsert={vi.fn()}
        onReplace={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(/медиатек/i);
  });

  it("ignores stale list results after refreshKey changes", async () => {
    let resolveFirst: (value: MediaAsset[]) => void = () => undefined;
    const firstList = new Promise<MediaAsset[]>((resolve) => {
      resolveFirst = resolve;
    });

    const repository = createRepository({
      list: vi
        .fn()
        .mockImplementationOnce(() => firstList)
        .mockImplementationOnce(async () => [
          {
            id: "asset-new",
            filename: "new.png",
            mimeType: "image/png",
            sizeBytes: 1,
            width: 1,
            height: 1,
            createdAt: "2026-01-03T00:00:00.000Z",
          },
        ]),
      getPreviewUrl: vi.fn(async (id: string) => `blob:preview-${id}`),
    });

    const { rerender } = render(
      <MediaGrid
        repository={repository}
        refreshKey={0}
        onInsert={vi.fn()}
        onReplace={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    rerender(
      <MediaGrid
        repository={repository}
        refreshKey={1}
        onInsert={vi.fn()}
        onReplace={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    resolveFirst(sampleAssets);
    expect(await screen.findByText("new.png")).toBeInTheDocument();
    expect(screen.queryByText("photo.png")).not.toBeInTheDocument();
  });

  it("releases preview URL when delete fails and shows error", async () => {
    const repository = createRepository({
      delete: vi.fn(async () => {
        throw new Error("delete failed");
      }),
    });

    render(
      <MediaGrid
        repository={repository}
        onInsert={vi.fn()}
        onReplace={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await screen.findByText("photo.png");
    fireEvent.click(screen.getAllByRole("button", { name: /удалить/i })[0]!);

    expect(await screen.findByRole("alert")).toHaveTextContent(/удал/i);
  });
});
