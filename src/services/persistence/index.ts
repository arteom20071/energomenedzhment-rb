export type { IDBFacade, StoreName } from "./idbFacade";
export { DB_NAME, DB_VERSION, STORE_NAMES } from "./idbFacade";
export { FakeIdbFacade } from "./fakeIdb";
export { createIndexedDbFacade } from "./indexedDbAdapter";
export type { AssetMetadata, AssetRepository, StoredAsset } from "./assetRepository";
export { ASSET_SCHEME, toAssetReference, parseAssetReference } from "./assetRepository";
export { createAssetRepository } from "./assetRepositoryImpl";
export type { DocumentRecord, DocumentRepository } from "./documentRepository";
export { validateDocumentRecord } from "./documentRepository";
export { createDocumentRepository } from "./documentRepositoryImpl";
export { AssetUrlCache, assetUrlCache } from "./assetUrlCache";
export {
  createAutosaveCoordinator,
  type AutosaveCoordinator,
  type AutosaveSnapshot,
  type AutosaveStatus,
} from "./autosaveCoordinator";
export { classifyPersistenceError, type PersistenceError } from "./errors";
export {
  getActiveProjectId,
  setActiveProjectId,
  getUiPrefs,
  setUiPrefs,
  clearLocalPreferences,
  type UiPrefs,
} from "./localStorageHelper";
