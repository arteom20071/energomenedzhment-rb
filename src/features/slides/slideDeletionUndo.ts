import type { Presentation } from "../../domain/presentation";
import type { EditorStoreApi } from "../../store/editorStore";

export type SlideDeletionKind = "remove-slide" | "clear-contents";

export interface SlideDeletionToken {
  kind: SlideDeletionKind;
  postDeleteFingerprint: string;
  pastStatesLength: number;
  futureStatesLength: number;
  hadMutation: boolean;
  pastStatesRef: readonly unknown[];
  pastTopRef: unknown;
  futureStatesRef: readonly unknown[];
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
  const pastStates = temporal.pastStates;

  return {
    kind: input.kind,
    postDeleteFingerprint: fingerprintPresentation(input.presentationAfter),
    pastStatesLength: pastStates.length,
    futureStatesLength: temporal.futureStates.length,
    hadMutation: input.hadMutation,
    pastStatesRef: pastStates,
    pastTopRef: pastStates[pastStates.length - 1],
    futureStatesRef: temporal.futureStates,
  };
}

function temporalIdentityMatches(
  store: EditorStoreApi,
  token: SlideDeletionToken,
): boolean {
  const temporal = store.temporal.getState();

  return (
    temporal.pastStates === token.pastStatesRef &&
    temporal.pastStates[temporal.pastStates.length - 1] === token.pastTopRef &&
    temporal.futureStates === token.futureStatesRef
  );
}

export function canUndoSlideDeletion(
  store: EditorStoreApi,
  token: SlideDeletionToken,
): boolean {
  const currentPresentation = store.getState().presentation;

  return (
    fingerprintPresentation(currentPresentation) === token.postDeleteFingerprint &&
    temporalIdentityMatches(store, token)
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
