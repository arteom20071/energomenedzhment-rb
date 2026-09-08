import type { IDBFacade, StoreName } from "./idbFacade";

type StoreData = Map<string, unknown>;

function cloneStoredValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (value instanceof Blob) {
    return value;
  }

  if (
    "blob" in value &&
    (value as { blob: unknown }).blob instanceof Blob &&
    "metadata" in value
  ) {
    const stored = value as { metadata: unknown; blob: Blob };
    return {
      metadata: structuredClone(stored.metadata),
      blob: stored.blob,
    };
  }

  return structuredClone(value);
}

export class FakeIdbFacade implements IDBFacade {
  private readonly stores = new Map<StoreName, StoreData>([
    ["documents", new Map()],
    ["assets", new Map()],
    ["settings", new Map()],
  ]);

  private openPromise: Promise<void> | null = null;
  private shouldFailOpen = false;
  private abortNextWrite = false;
  private quotaAbortAfterRequest = false;

  setFailOpen(value: boolean): void {
    this.shouldFailOpen = value;
  }

  setAbortNextWrite(value: boolean): void {
    this.abortNextWrite = value;
  }

  setQuotaAbortAfterRequest(value: boolean): void {
    this.quotaAbortAfterRequest = value;
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

  private async runWriteTransaction(
    store: StoreName,
    key: string,
    value: unknown,
  ): Promise<void> {
    await this.open();

    const staged = cloneStoredValue(value);
    void staged;

    if (this.abortNextWrite) {
      this.abortNextWrite = false;
      throw new DOMException("Transaction aborted", "AbortError");
    }

    if (this.quotaAbortAfterRequest) {
      this.quotaAbortAfterRequest = false;
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    }

    this.getStore(store).set(key, cloneStoredValue(value));
  }

  private async runDeleteTransaction(store: StoreName, key: string): Promise<void> {
    await this.open();

    if (this.abortNextWrite) {
      this.abortNextWrite = false;
      throw new DOMException("Transaction aborted", "AbortError");
    }

    if (this.quotaAbortAfterRequest) {
      this.quotaAbortAfterRequest = false;
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    }

    this.getStore(store).delete(key);
  }

  async get<T>(store: StoreName, key: string): Promise<T | undefined> {
    await this.open();
    const value = this.getStore(store).get(key);
    return value === undefined ? undefined : (cloneStoredValue(value) as T);
  }

  async put(store: StoreName, key: string, value: unknown): Promise<void> {
    await this.runWriteTransaction(store, key, value);
  }

  async delete(store: StoreName, key: string): Promise<void> {
    await this.runDeleteTransaction(store, key);
  }

  async getAll<T>(store: StoreName): Promise<T[]> {
    await this.open();
    return [...this.getStore(store).values()].map((value) => cloneStoredValue(value) as T);
  }

  clear(): void {
    for (const store of this.stores.values()) {
      store.clear();
    }
  }
}

export async function probeRequestSuccessTransactionAbort(
  idb: FakeIdbFacade,
  store: StoreName,
  key: string,
  value: unknown,
): Promise<{ committed: boolean; error: unknown | null }> {
  idb.setQuotaAbortAfterRequest(true);
  let error: unknown | null = null;

  try {
    await idb.put(store, key, value);
  } catch (caught) {
    error = caught;
  }

  const stored = await idb.get(store, key);
  return {
    committed: stored !== undefined,
    error,
  };
}
