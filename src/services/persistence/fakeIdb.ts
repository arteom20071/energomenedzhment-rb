import type { IDBFacade, StoreName } from "./idbFacade";

type StoreData = Map<string, unknown>;

export class FakeIdbFacade implements IDBFacade {
  private readonly stores = new Map<StoreName, StoreData>([
    ["documents", new Map()],
    ["assets", new Map()],
    ["settings", new Map()],
  ]);

  private openPromise: Promise<void> | null = null;
  private shouldFailOpen = false;
  private quotaExceeded = false;

  setFailOpen(value: boolean): void {
    this.shouldFailOpen = value;
  }

  setQuotaExceeded(value: boolean): void {
    this.quotaExceeded = value;
  }

  async open(): Promise<void> {
    if (this.openPromise) {
      return this.openPromise;
    }

    this.openPromise = (async () => {
      if (this.shouldFailOpen) {
        throw new Error("IndexedDB unavailable");
      }
    })();

    return this.openPromise;
  }

  private getStore(store: StoreName): StoreData {
    const data = this.stores.get(store);
    if (!data) {
      throw new Error(`Unknown store: ${store}`);
    }
    return data;
  }

  async get<T>(store: StoreName, key: string): Promise<T | undefined> {
    await this.open();
    return this.getStore(store).get(key) as T | undefined;
  }

  async put(store: StoreName, key: string, value: unknown): Promise<void> {
    await this.open();
    if (this.quotaExceeded) {
      const error = new DOMException("Quota exceeded", "QuotaExceededError");
      throw error;
    }
    const stored =
      value !== null &&
      typeof value === "object" &&
      "blob" in value &&
      (value as { blob: unknown }).blob instanceof Blob
        ? {
            ...(value as Record<string, unknown>),
            blob: (value as { blob: Blob }).blob,
          }
        : structuredClone(value);
    this.getStore(store).set(key, stored);
  }

  async delete(store: StoreName, key: string): Promise<void> {
    await this.open();
    this.getStore(store).delete(key);
  }

  async getAll<T>(store: StoreName): Promise<T[]> {
    await this.open();
    return [...this.getStore(store).values()] as T[];
  }

  clear(): void {
    for (const store of this.stores.values()) {
      store.clear();
    }
  }
}
