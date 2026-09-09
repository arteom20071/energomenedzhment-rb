import type { Presentation } from "../domain/presentation";
import {
  createAssetRepository,
  createAutosaveCoordinator,
  createDocumentRepository,
  createIndexedDbFacade,
  FakeIdbFacade,
  getActiveProjectId,
  getUiPrefs,
  setActiveProjectId,
  setUiPrefs,
  validateDocumentRecord,
  type AssetRepository,
  type AutosaveCoordinator,
  type DocumentRecord,
  type DocumentRepository,
  type IDBFacade,
} from "../services/persistence";
import { AssetUrlCache } from "../services/persistence/assetUrlCache";
import { cloneSeedPresentation, shouldReplaceEnergySeedDraft } from "./cloneSeed";

export type BootstrapResult =
  | {
      kind: "ready";
      presentation: Presentation;
      documentId: string;
      createdAt: string;
      zoom?: number;
    }
  | {
      kind: "recovery";
      documentId: string;
      rawPayload: string;
      seed: Presentation;
    };

export interface EditorRuntime {
  idb: IDBFacade;
  documents: DocumentRepository;
  assets: AssetRepository;
  urlCache: AssetUrlCache;
  persistEnabled: boolean;
}

export function createEditorRuntime(idb?: IDBFacade): EditorRuntime {
  let facade = idb;
  let persistEnabled = true;

  if (!facade) {
    try {
      facade = createIndexedDbFacade();
    } catch {
      facade = new FakeIdbFacade();
      persistEnabled = false;
    }
  }

  return {
    idb: facade,
    documents: createDocumentRepository(facade),
    assets: createAssetRepository(facade),
    urlCache: new AssetUrlCache(),
    persistEnabled: persistEnabled || Boolean(idb),
  };
}

export async function bootstrapEditor(
  runtime: EditorRuntime,
  baseUrl = "/",
): Promise<BootstrapResult> {
  const seed = cloneSeedPresentation(baseUrl);
  const activeId = getActiveProjectId();

  if (!activeId) {
    return {
      kind: "ready",
      presentation: seed,
      documentId: seed.id,
      createdAt: new Date().toISOString(),
      zoom: getUiPrefs()?.zoom,
    };
  }

  try {
    const raw = await runtime.idb.get<unknown>("documents", activeId);
    if (raw === undefined) {
      return {
        kind: "ready",
        presentation: seed,
        documentId: seed.id,
        createdAt: new Date().toISOString(),
        zoom: getUiPrefs()?.zoom,
      };
    }

    try {
      const record = validateDocumentRecord(raw);
      return {
        kind: "ready",
        presentation: shouldReplaceEnergySeedDraft(record.presentation)
          ? seed
          : record.presentation,
        documentId: record.id,
        createdAt: record.createdAt,
        zoom: getUiPrefs()?.zoom,
      };
    } catch {
      return {
        kind: "recovery",
        documentId: activeId,
        rawPayload: JSON.stringify(raw),
        seed,
      };
    }
  } catch {
    return {
      kind: "recovery",
      documentId: activeId,
      rawPayload: "",
      seed,
    };
  }
}

export function persistDocument(
  runtime: EditorRuntime,
  record: DocumentRecord,
): Promise<void> {
  if (!runtime.persistEnabled) {
    return Promise.resolve();
  }
  return runtime.documents.save(record);
}

export function createPresentationAutosave(
  runtime: EditorRuntime,
  createdAt: string,
  onStatus: (status: "idle" | "dirty" | "saving" | "saved" | "error") => void,
): AutosaveCoordinator {
  return createAutosaveCoordinator({
    debounceMs: 500,
    onStatusChange: (status) => {
      onStatus(status);
    },
    save: async (snapshot) => {
      const existing = runtime.persistEnabled
        ? await runtime.documents.load(snapshot.documentId).catch(() => undefined)
        : undefined;
      await persistDocument(runtime, {
        id: snapshot.documentId,
        presentation: snapshot.presentation,
        updatedAt: new Date().toISOString(),
        createdAt: existing?.createdAt ?? createdAt,
      });
      setActiveProjectId(snapshot.documentId);
    },
  });
}

export function persistZoomPreference(zoom: number): void {
  const current = getUiPrefs() ?? {};
  setUiPrefs({ ...current, zoom });
}
