export const NUDGE_SMALL = 1;
export const NUDGE_LARGE = 10;
export const ROTATE_SMALL = 1;
export const ROTATE_LARGE = 15;
export const RESIZE_SMALL = 1;
export const RESIZE_LARGE = 10;

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
  commitRotate?: (delta: number) => void;
  commitResize?: (dw: number, dh: number) => void;
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
    const rotateStep = event.shiftKey ? ROTATE_LARGE : ROTATE_SMALL;
    const resizeStep = event.shiftKey ? RESIZE_LARGE : RESIZE_SMALL;

    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        if (event.altKey && actions.commitResize) {
          actions.commitResize(-resizeStep, 0);
        } else {
          actions.commitNudge(-step, 0);
        }
        break;
      case "ArrowRight":
        event.preventDefault();
        if (event.altKey && actions.commitResize) {
          actions.commitResize(resizeStep, 0);
        } else {
          actions.commitNudge(step, 0);
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (event.altKey && actions.commitResize) {
          actions.commitResize(0, -resizeStep);
        } else {
          actions.commitNudge(0, -step);
        }
        break;
      case "ArrowDown":
        event.preventDefault();
        if (event.altKey && actions.commitResize) {
          actions.commitResize(0, resizeStep);
        } else {
          actions.commitNudge(0, step);
        }
        break;
      case "[":
        if (actions.commitRotate) {
          event.preventDefault();
          actions.commitRotate(-rotateStep);
        }
        break;
      case "]":
        if (actions.commitRotate) {
          event.preventDefault();
          actions.commitRotate(rotateStep);
        }
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
