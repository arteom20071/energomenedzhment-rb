import type { Presentation } from "../../domain/presentation";
import { parsePresentation } from "../../domain/presentation";

export interface DocumentRecord {
  id: string;
  presentation: Presentation;
  updatedAt: string;
  createdAt: string;
}

export interface DocumentRepository {
  save(record: DocumentRecord): Promise<void>;
  load(id: string): Promise<DocumentRecord | undefined>;
  delete(id: string): Promise<void>;
  list(): Promise<DocumentRecord[]>;
}

export function validateDocumentRecord(record: unknown): DocumentRecord {
  if (record === null || typeof record !== "object") {
    throw new Error("Некорректная запись документа");
  }

  const candidate = record as Partial<DocumentRecord>;
  if (typeof candidate.id !== "string" || candidate.id.length === 0) {
    throw new Error("Некорректный идентификатор документа");
  }

  const parsed = parsePresentation(candidate.presentation);
  if (!parsed.success) {
    throw new Error("Сохранённый документ повреждён");
  }

  return {
    id: candidate.id,
    presentation: parsed.data,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : new Date().toISOString(),
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : new Date().toISOString(),
  };
}
