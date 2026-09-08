export type StoreName = "documents" | "assets" | "settings";

export interface IDBFacade {
  open(): Promise<void>;
  get<T>(store: StoreName, key: string): Promise<T | undefined>;
  put(store: StoreName, key: string, value: unknown): Promise<void>;
  delete(store: StoreName, key: string): Promise<void>;
  getAll<T>(store: StoreName): Promise<T[]>;
}

export const DB_NAME = "presentation-editor";
export const DB_VERSION = 1;
export const STORE_NAMES: StoreName[] = ["documents", "assets", "settings"];
