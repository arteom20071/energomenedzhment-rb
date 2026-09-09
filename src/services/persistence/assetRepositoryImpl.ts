import type { IDBFacade } from "./idbFacade";
import type { AssetMetadata, AssetRepository, StoredAsset } from "./assetRepository";

export function createAssetRepository(idb: IDBFacade): AssetRepository {
  return {
    async save(asset: StoredAsset): Promise<void> {
      await idb.put("assets", asset.metadata.id, asset);
    },

    async get(id: string): Promise<StoredAsset | undefined> {
      const stored = await idb.get<StoredAsset>("assets", id);
      if (!stored) {
        return undefined;
      }
      return stored;
    },

    async delete(id: string): Promise<void> {
      await idb.delete("assets", id);
    },

    async list(): Promise<AssetMetadata[]> {
      const assets = await idb.getAll<StoredAsset>("assets");
      return assets.map((asset) => asset.metadata);
    },
  };
}
