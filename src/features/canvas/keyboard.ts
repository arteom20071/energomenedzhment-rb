export const NUDGE_SMALL = 1;
export const NUDGE_LARGE = 10;

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }

  if (target.isContentEditable) {
    return true;
  }

  return target.getAttribute("contenteditable") === "true";
}

export interface CanvasKeyboardActions {
  selectedIds: string[];
  isEditing: boolean;
  commitNudge: (dx: number, dy: number) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
}

export function createCanvasKeyboardHandler(actions: CanvasKeyboardActions) {
  return (event: KeyboardEvent) => {
    if (actions.isEditing || isEditableTarget(event.target)) {
      return;
    }

    if (actions.selectedIds.length === 0) {
      return;
    }

    const step = event.shiftKey ? NUDGE_LARGE : NUDGE_SMALL;

    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        actions.commitNudge(-step, 0);
        break;
      case "ArrowRight":
        event.preventDefault();
        actions.commitNudge(step, 0);
        break;
      case "ArrowUp":
        event.preventDefault();
        actions.commitNudge(0, -step);
        break;
      case "ArrowDown":
        event.preventDefault();
        actions.commitNudge(0, step);
        break;
      case "Delete":
      case "Backspace":
        event.preventDefault();
        actions.deleteSelected();
        break;
      default:
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
          event.preventDefault();
          actions.duplicateSelected();
        }
        break;
    }
  };
}
