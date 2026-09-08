import type { Presentation } from "../../domain/presentation";
import { classifyPersistenceError, type PersistenceError } from "./errors";

export type AutosaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export interface AutosaveSnapshot {
  documentId: string;
  presentation: Presentation;
  revision: number;
}

export interface AutosaveCoordinatorOptions {
  debounceMs?: number;
  save: (snapshot: AutosaveSnapshot) => Promise<void>;
  onStatusChange?: (status: AutosaveStatus, error?: PersistenceError) => void;
}

export interface AutosaveCoordinator {
  markDirty(presentation: Presentation, documentId: string): void;
  flush(): Promise<void>;
  cancel(): void;
  getStatus(): AutosaveStatus;
  getRevision(): number;
}

export function createAutosaveCoordinator(options: AutosaveCoordinatorOptions): AutosaveCoordinator {
  const debounceMs = options.debounceMs ?? 500;
  let status: AutosaveStatus = "idle";
  let revision = 0;
  let pendingTimer: ReturnType<typeof setTimeout> | null = null;
  let inFlightRevision: number | null = null;
  let latestSnapshot: AutosaveSnapshot | null = null;

  const setStatus = (next: AutosaveStatus, error?: PersistenceError) => {
    status = next;
    options.onStatusChange?.(next, error);
  };

  const scheduleSave = () => {
    if (pendingTimer) {
      clearTimeout(pendingTimer);
    }

    pendingTimer = setTimeout(() => {
      pendingTimer = null;
      void performSave();
    }, debounceMs);
  };

  const performSave = async (): Promise<void> => {
    if (!latestSnapshot) {
      return;
    }

    const snapshot = latestSnapshot;
    inFlightRevision = snapshot.revision;
    setStatus("saving");

    try {
      await options.save(snapshot);

      if (inFlightRevision !== snapshot.revision) {
        if (latestSnapshot && latestSnapshot.revision > snapshot.revision) {
          scheduleSave();
        }
        return;
      }

      if (latestSnapshot?.revision === snapshot.revision) {
        setStatus("saved");
      }
    } catch (error) {
      const classified = classifyPersistenceError(error);
      if (inFlightRevision === snapshot.revision) {
        setStatus("error", classified);
      }
    } finally {
      if (inFlightRevision === snapshot.revision) {
        inFlightRevision = null;
      }
    }
  };

  return {
    markDirty(presentation, documentId) {
      revision += 1;
      latestSnapshot = { documentId, presentation, revision };
      setStatus("dirty");
      scheduleSave();
    },

    async flush() {
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
      await performSave();
    },

    cancel() {
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
      latestSnapshot = null;
      setStatus("idle");
    },

    getStatus() {
      return status;
    },

    getRevision() {
      return revision;
    },
  };
}
