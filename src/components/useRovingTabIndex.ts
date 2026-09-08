import { useCallback, useMemo, useRef, useState } from "react";

type Orientation = "horizontal" | "vertical";

const NEXT_KEY: Record<Orientation, string> = {
  horizontal: "ArrowRight",
  vertical: "ArrowDown",
};

const PREVIOUS_KEY: Record<Orientation, string> = {
  horizontal: "ArrowLeft",
  vertical: "ArrowUp",
};

function resolveFocusedId<T extends string>(
  itemIds: readonly T[],
  selectedId: T,
  focusedOverride: T | null,
): T {
  if (itemIds.length === 0) {
    return selectedId;
  }

  if (focusedOverride && itemIds.includes(focusedOverride)) {
    return focusedOverride;
  }

  if (itemIds.includes(selectedId)) {
    return selectedId;
  }

  return itemIds[0]!;
}

export function useRovingTabIndex<T extends string>(
  itemIds: readonly T[],
  selectedId: T,
  orientation: Orientation = "horizontal",
) {
  const itemRefs = useRef(new Map<T, HTMLElement>());
  const [focusedOverride, setFocusedOverride] = useState<T | null>(null);

  const focusedId = useMemo(
    () => resolveFocusedId(itemIds, selectedId, focusedOverride),
    [itemIds, selectedId, focusedOverride],
  );

  const registerRef = useCallback(
    (itemId: T) => (element: HTMLElement | null) => {
      if (element) {
        itemRefs.current.set(itemId, element);
      } else {
        itemRefs.current.delete(itemId);
      }
    },
    [],
  );

  const focusItem = useCallback((itemId: T) => {
    itemRefs.current.get(itemId)?.focus();
  }, []);

  const moveFocus = useCallback(
    (delta: number) => {
      const currentIndex = itemIds.indexOf(focusedId);
      if (currentIndex === -1) {
        return itemIds[0];
      }

      const nextIndex = (currentIndex + delta + itemIds.length) % itemIds.length;
      return itemIds[nextIndex] ?? focusedId;
    },
    [focusedId, itemIds],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (itemIds.length === 0) {
        return null;
      }

      let nextId: T | null = null;

      if (event.key === NEXT_KEY[orientation]) {
        event.preventDefault();
        nextId = moveFocus(1);
      } else if (event.key === PREVIOUS_KEY[orientation]) {
        event.preventDefault();
        nextId = moveFocus(-1);
      } else if (event.key === "Home") {
        event.preventDefault();
        nextId = itemIds[0]!;
      } else if (event.key === "End") {
        event.preventDefault();
        nextId = itemIds[itemIds.length - 1]!;
      }

      if (!nextId) {
        return null;
      }

      setFocusedOverride(nextId);
      focusItem(nextId);
      return nextId;
    },
    [focusItem, itemIds, moveFocus, orientation],
  );

  const getTabProps = useCallback(
    (itemId: T) => ({
      tabIndex: itemId === focusedId ? 0 : -1,
      onFocus: () => setFocusedOverride(itemId),
      ref: registerRef(itemId),
    }),
    [focusedId, registerRef],
  );

  return {
    focusedId,
    setFocusedId: setFocusedOverride,
    handleKeyDown,
    getTabProps,
  };
}
