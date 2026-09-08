import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { createPresentation } from "../../domain/factories";
import { FakeIdbFacade } from "./fakeIdb";
import { createAssetRepository } from "./assetRepositoryImpl";
import { createDocumentRepository } from "./documentRepositoryImpl";
import { validateDocumentRecord } from "./documentRepository";
import { classifyPersistenceError } from "./errors";
import { AssetUrlCache } from "./assetUrlCache";
import { createAutosaveCoordinator } from "./autosaveCoordinator";
import {
  clearLocalPreferences,
  getActiveProjectId,
  getUiPrefs,
  setActiveProjectId,
  setUiPrefs,
} from "./localStorageHelper";

describe("FakeIdbFacade", () => {
  it("stores and retrieves documents and assets", async () => {
    const idb = new FakeIdbFacade();
    const assets = createAssetRepository(idb);
    const blob = new Blob(["png"], { type: "image/png" });

    await assets.save({
      metadata: {
        id: "asset-1",
        mimeType: "image/png",
        byteSize: blob.size,
        filename: "test.png",
        createdAt: new Date().toISOString(),
      },
      blob,
    });

    const stored = await assets.get("asset-1");
    expect(stored?.metadata.filename).toBe("test.png");
    expect(stored?.blob.type).toBe("image/png");
  });
});

describe("documentRepository", () => {
  it("validates presentation on save and load", async () => {
    const idb = new FakeIdbFacade();
    const documents = createDocumentRepository(idb);
    const presentation = createPresentation("Test");

    await documents.save({
      id: presentation.id,
      presentation,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const loaded = await documents.load(presentation.id);
    expect(loaded?.presentation.title).toBe("Test");
  });

  it("rejects corrupted stored documents", () => {
    expect(() =>
      validateDocumentRecord({
        id: "doc-1",
        presentation: { invalid: true },
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      }),
    ).toThrow("Сохранённый документ повреждён");
  });
});

describe("classifyPersistenceError", () => {
  it("classifies quota errors with Russian message", () => {
    const error = classifyPersistenceError(new DOMException("Quota exceeded", "QuotaExceededError"));
    expect(error.kind).toBe("quota");
    expect(error.message).toContain("Недостаточно места");
  });

  it("classifies unavailable errors", () => {
    const error = classifyPersistenceError(new Error("IndexedDB unavailable"));
    expect(error.kind).toBe("unavailable");
    expect(error.message).toContain("недоступно");
  });
});

describe("AssetUrlCache", () => {
  it("creates and revokes object URLs safely", () => {
    const cache = new AssetUrlCache();
    const blob = new Blob(["x"], { type: "text/plain" });
    const createSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");

    const url = cache.acquire("a1", blob);
    expect(url).toBe("blob:mock");
    expect(cache.get("a1")).toBe("blob:mock");

    cache.release("a1");
    expect(revokeSpy).toHaveBeenCalledWith("blob:mock");
    expect(cache.size()).toBe(0);

    createSpy.mockRestore();
    revokeSpy.mockRestore();
  });

  it("tracks reference counts", () => {
    const cache = new AssetUrlCache();
    const blob = new Blob(["x"], { type: "text/plain" });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:ref");

    cache.acquire("a1", blob);
    cache.acquire("a1", blob);
    cache.release("a1");
    expect(cache.size()).toBe(1);

    cache.release("a1");
    expect(cache.size()).toBe(0);
  });
});

describe("createAutosaveCoordinator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces saves by 500ms and reports dirty/saving/saved", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const statuses: string[] = [];
    const coordinator = createAutosaveCoordinator({
      debounceMs: 500,
      save,
      onStatusChange: (status) => statuses.push(status),
    });

    const presentation = createPresentation();
    coordinator.markDirty(presentation, presentation.id);
    expect(coordinator.getStatus()).toBe("dirty");
    expect(save).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    await vi.runAllTimersAsync();

    expect(save).toHaveBeenCalledTimes(1);
    expect(statuses).toContain("saving");
    expect(coordinator.getStatus()).toBe("saved");
  });

  it("prevents stale async completion from marking newer changes saved", async () => {
    let resolveFirst: (() => void) | undefined;
    const save = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValue(undefined);

    const statuses: string[] = [];
    const coordinator = createAutosaveCoordinator({
      debounceMs: 100,
      save,
      onStatusChange: (status) => statuses.push(status),
    });

    const first = createPresentation("First");
    coordinator.markDirty(first, first.id);
    vi.advanceTimersByTime(100);
    await Promise.resolve();

    const second = createPresentation("Second");
    coordinator.markDirty(second, second.id);
    vi.advanceTimersByTime(100);
    await Promise.resolve();

    resolveFirst?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(save).toHaveBeenCalledTimes(2);
    expect(coordinator.getRevision()).toBe(2);
    expect(statuses.at(-1)).toBe("saved");
  });

  it("supports flush and cancel", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const coordinator = createAutosaveCoordinator({ save });
    const presentation = createPresentation();

    coordinator.markDirty(presentation, presentation.id);
    await coordinator.flush();
    expect(save).toHaveBeenCalledTimes(1);

    coordinator.cancel();
    expect(coordinator.getStatus()).toBe("idle");
  });
});

describe("localStorageHelper", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores active project id and ui prefs", () => {
    setActiveProjectId("proj-1");
    expect(getActiveProjectId()).toBe("proj-1");

    setUiPrefs({ sidebarCollapsed: true, inspectorWidth: 320 });
    expect(getUiPrefs()).toEqual({ sidebarCollapsed: true, inspectorWidth: 320 });

    clearLocalPreferences();
    expect(getActiveProjectId()).toBeNull();
    expect(getUiPrefs()).toBeNull();
  });
});

describe("assetRepository quota", () => {
  it("propagates quota exceeded from fake idb", async () => {
    const idb = new FakeIdbFacade();
    idb.setQuotaExceeded(true);
    const assets = createAssetRepository(idb);
    const blob = new Blob(["x"], { type: "image/png" });

    await expect(
      assets.save({
        metadata: {
          id: "a1",
          mimeType: "image/png",
          byteSize: 1,
          filename: "a.png",
          createdAt: new Date().toISOString(),
        },
        blob,
      }),
    ).rejects.toThrow();
  });
});
