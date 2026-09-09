import { DB_NAME, DB_VERSION, STORE_NAMES, type IDBFacade, type StoreName } from "./idbFacade";

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

export function createIndexedDbFacade(): IDBFacade {
  if (!isIndexedDbAvailable()) {
    throw new Error("IndexedDB is not available");
  }

  let db: IDBDatabase | null = null;

  const openDatabase = (): Promise<IDBDatabase> => {
    if (db) {
      return Promise.resolve(db);
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;
        for (const storeName of STORE_NAMES) {
          if (!database.objectStoreNames.contains(storeName)) {
            database.createObjectStore(storeName);
          }
        }
      };

      request.onsuccess = () => {
        db = request.result;
        resolve(db);
      };

      request.onerror = () => {
        reject(request.error ?? new Error("IndexedDB unavailable"));
      };
    });
  };

  const runTransaction = <T>(
    store: StoreName,
    mode: IDBTransactionMode,
    operation: (objectStore: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> => {
    return openDatabase().then(
      (database) =>
        new Promise<T>((resolve, reject) => {
          let settled = false;
          let result: T | undefined;

          const settleResolve = (value: T) => {
            if (settled) {
              return;
            }
            settled = true;
            resolve(value);
          };

          const settleReject = (error: unknown) => {
            if (settled) {
              return;
            }
            settled = true;
            reject(error instanceof Error ? error : new Error(String(error)));
          };

          const transaction = database.transaction(store, mode);
          const objectStore = transaction.objectStore(store);
          const request = operation(objectStore);

          request.onsuccess = () => {
            result = request.result as T;
          };

          request.onerror = () => {
            settleReject(request.error ?? new Error("IndexedDB request failed"));
          };

          transaction.oncomplete = () => {
            settleResolve(result as T);
          };

          transaction.onabort = () => {
            settleReject(transaction.error ?? new DOMException("Transaction aborted", "AbortError"));
          };

          transaction.onerror = () => {
            settleReject(transaction.error ?? new Error("IndexedDB transaction failed"));
          };
        }),
    );
  };

  return {
    open: () => openDatabase().then(() => undefined),

    get<T>(store: StoreName, key: string): Promise<T | undefined> {
      return runTransaction(store, "readonly", (objectStore) => objectStore.get(key));
    },

    put(store: StoreName, key: string, value: unknown): Promise<void> {
      return runTransaction(store, "readwrite", (objectStore) => objectStore.put(value, key)).then(
        () => undefined,
      );
    },

    delete(store: StoreName, key: string): Promise<void> {
      return runTransaction(store, "readwrite", (objectStore) => objectStore.delete(key)).then(
        () => undefined,
      );
    },

    getAll<T>(store: StoreName): Promise<T[]> {
      return runTransaction(store, "readonly", (objectStore) => objectStore.getAll());
    },
  };
}
