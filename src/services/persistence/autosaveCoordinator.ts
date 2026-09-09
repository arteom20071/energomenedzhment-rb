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
  let lastPersistedRevision = 0;
  let pendingTimer: ReturnType<typeof setTimeout> | null = null;
  let latestSnapshot: AutosaveSnapshot | null = null;
  let cancelled = false;
  let writerChain: Promise<void> = Promise.resolve();

  const setStatus = (next: AutosaveStatus, error?: PersistenceError) => {
    status = next;
    options.onStatusChange?.(next, error);
  };

  const runWriter = async (): Promise<void> => {
    while (!cancelled && latestSnapshot && latestSnapshot.revision > lastPersistedRevision) {
      const snapshot = latestSnapshot;
      setStatus("saving");

      try {
        await options.save(snapshot);

        if (cancelled) {
          return;
        }

        if (latestSnapshot.revision === snapshot.revision) {
          lastPersistedRevision = snapshot.revision;
          setStatus("saved");
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (latestSnapshot.revision <= snapshot.revision) {
          setStatus("error", classifyPersistenceError(error));
        }
        return;
      }
    }
  };

  const enqueueWrite = (): void => {
    writerChain = writerChain.then(runWriter);
  };

  const scheduleSave = (): void => {
    if (pendingTimer) {
      clearTimeout(pendingTimer);
    }

    pendingTimer = setTimeout(() => {
      pendingTimer = null;
      enqueueWrite();
    }, debounceMs);
  };

  return {
    markDirty(presentation, documentId) {
      cancelled = false;
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
      enqueueWrite();
      await writerChain;
    },

    cancel() {
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
      cancelled = true;
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
