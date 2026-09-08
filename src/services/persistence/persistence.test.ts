import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { createPresentation } from "../../domain/factories";
import { FakeIdbFacade, probeRequestSuccessTransactionAbort } from "./fakeIdb";
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
  it("stores and retrieves documents and assets with blob metadata", async () => {
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
    expect(stored?.blob.size).toBe(blob.size);
  });

  it("rejects when request succeeds but transaction aborts before commit", async () => {
    const idb = new FakeIdbFacade();
    const probe = await probeRequestSuccessTransactionAbort(idb, "documents", "doc-1", {
      id: "doc-1",
      value: true,
    });

    expect(probe.committed).toBe(false);
    expect(probe.error).toBeInstanceOf(DOMException);
    expect((probe.error as DOMException).name).toBe("QuotaExceededError");
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

  it("stores parsed normalized presentation value", async () => {
    const idb = new FakeIdbFacade();
    const documents = createDocumentRepository(idb);
    const presentation = createPresentation("Normalized");

    await documents.save({
      id: presentation.id,
      presentation,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const raw = await idb.get<{ presentation: unknown }>("documents", presentation.id);
    const { parsePresentation } = await import("../../domain/presentation");
    expect(raw?.presentation).toEqual(parsePresentation(presentation).success ? presentation : null);
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

  it("classifies SecurityError InvalidStateError and NotAllowedError as unavailable", () => {
    for (const name of ["SecurityError", "InvalidStateError", "NotAllowedError"] as const) {
      const error = classifyPersistenceError(new DOMException(name, name));
      expect(error.kind).toBe("unavailable");
    }
  });

  it("classifies unavailable errors from message", () => {
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

  it("revokes and replaces URL when blob changes for same id", () => {
    const cache = new AssetUrlCache();
    const createSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValueOnce("blob:old")
      .mockReturnValueOnce("blob:new");
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");

    cache.acquire("a1", new Blob(["old"], { type: "text/plain" }));
    const next = cache.acquire("a1", new Blob(["new"], { type: "text/plain" }));

    expect(revokeSpy).toHaveBeenCalledWith("blob:old");
    expect(next).toBe("blob:new");

    cache.revokeAll();
    expect(cache.size()).toBe(0);

    createSpy.mockRestore();
    revokeSpy.mockRestore();
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
    await coordinator.flush();

    expect(save).toHaveBeenCalledTimes(1);
    expect(statuses).toContain("saving");
    expect(coordinator.getStatus()).toBe("saved");
  });

  it("never persists stale snapshots after newer revisions via single writer queue", async () => {
    const persistedTitles: string[] = [];
    let releaseFirst: (() => void) | undefined;

    const save = vi.fn().mockImplementation((snapshot: { presentation: { title: string } }) => {
      if (snapshot.presentation.title === "First") {
        return new Promise<void>((resolve) => {
          releaseFirst = resolve;
        });
      }
      persistedTitles.push(snapshot.presentation.title);
      return Promise.resolve();
    });

    const coordinator = createAutosaveCoordinator({ debounceMs: 50, save });

    coordinator.markDirty(createPresentation("First"), "doc");
    vi.advanceTimersByTime(50);
    await Promise.resolve();

    coordinator.markDirty(createPresentation("Second"), "doc");
    vi.advanceTimersByTime(50);
    await Promise.resolve();

    const flushPromise = coordinator.flush();
    releaseFirst?.();
    await flushPromise;

    expect(persistedTitles).toEqual(["Second"]);
    expect(coordinator.getStatus()).toBe("saved");
  });

  it("flush waits for in-flight and latest pending writes", async () => {
    let releaseFirst: (() => void) | undefined;
    const save = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            releaseFirst = resolve;
          }),
      )
      .mockResolvedValue(undefined);

    const coordinator = createAutosaveCoordinator({ debounceMs: 100, save });
    coordinator.markDirty(createPresentation("One"), "doc");
    vi.advanceTimersByTime(100);
    await Promise.resolve();

    coordinator.markDirty(createPresentation("Two"), "doc");
    const flushPromise = coordinator.flush();
    releaseFirst?.();
    await flushPromise;

    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1]?.[0]?.presentation.title).toBe("Two");
  });

  it("cancel prevents future timers but in-flight write completes deterministically", async () => {
    let release: (() => void) | undefined;
    const save = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );

    const coordinator = createAutosaveCoordinator({ debounceMs: 10, save });
    coordinator.markDirty(createPresentation("Cancel"), "doc");
    vi.advanceTimersByTime(10);
    await Promise.resolve();

    coordinator.cancel();
    release?.();
    await coordinator.flush();

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
  it("propagates quota exceeded from fake idb transaction abort", async () => {
    const idb = new FakeIdbFacade();
    idb.setQuotaAbortAfterRequest(true);
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
