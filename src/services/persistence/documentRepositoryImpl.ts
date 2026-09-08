import type { IDBFacade } from "./idbFacade";
import type { DocumentRecord, DocumentRepository } from "./documentRepository";
import { validateDocumentRecord } from "./documentRepository";

export function createDocumentRepository(idb: IDBFacade): DocumentRepository {
  return {
    async save(record: DocumentRecord): Promise<void> {
      const validated = validateDocumentRecord(record);
      await idb.put("documents", validated.id, validated);
    },

    async load(id: string): Promise<DocumentRecord | undefined> {
      const stored = await idb.get<DocumentRecord>("documents", id);
      if (!stored) {
        return undefined;
      }
      return validateDocumentRecord(stored);
    },

    async delete(id: string): Promise<void> {
      await idb.delete("documents", id);
    },

    async list(): Promise<DocumentRecord[]> {
      const records = await idb.getAll<DocumentRecord>("documents");
      return records.map((record) => validateDocumentRecord(record));
    },
  };
}
