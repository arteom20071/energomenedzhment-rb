import type { Presentation } from "../../domain/presentation";
import type { EditorStoreApi } from "../../store/editorStore";

export type SlideDeletionKind = "remove-slide" | "clear-contents";

export interface SlideDeletionToken {
  kind: SlideDeletionKind;
  postDeleteFingerprint: string;
  pastStatesLength: number;
  futureStatesLength: number;
  hadMutation: boolean;
}

interface BuildSlideDeletionTokenInput {
  store: EditorStoreApi;
  presentationAfter: Presentation;
  kind: SlideDeletionKind;
  hadMutation: boolean;
}

export function fingerprintPresentation(presentation: Presentation): string {
  return JSON.stringify(presentation);
}

export function buildSlideDeletionToken(
  input: BuildSlideDeletionTokenInput,
): SlideDeletionToken {
  const temporal = input.store.temporal.getState();

  return {
    kind: input.kind,
    postDeleteFingerprint: fingerprintPresentation(input.presentationAfter),
    pastStatesLength: temporal.pastStates.length,
    futureStatesLength: temporal.futureStates.length,
    hadMutation: input.hadMutation,
  };
}

export function canUndoSlideDeletion(
  store: EditorStoreApi,
  token: SlideDeletionToken,
): boolean {
  const temporal = store.temporal.getState();
  const currentPresentation = store.getState().presentation;

  return (
    fingerprintPresentation(currentPresentation) === token.postDeleteFingerprint &&
    temporal.pastStates.length === token.pastStatesLength &&
    temporal.futureStates.length === token.futureStatesLength
  );
}

export function undoSlideDeletion(
  store: EditorStoreApi,
  token: SlideDeletionToken,
): { success: true } | { success: false; reason: "mutated" } {
  if (!canUndoSlideDeletion(store, token)) {
    return { success: false, reason: "mutated" };
  }

  store.temporal.getState().undo();
  return { success: true };
}

export function createDeletionKind(slideCount: number): SlideDeletionKind {
  return slideCount === 1 ? "clear-contents" : "remove-slide";
}
