import { useCallback, useState } from "react";

type Orientation = "horizontal" | "vertical";

const NEXT_KEY: Record<Orientation, string> = {
  horizontal: "ArrowRight",
  vertical: "ArrowDown",
};

const PREVIOUS_KEY: Record<Orientation, string> = {
  horizontal: "ArrowLeft",
  vertical: "ArrowUp",
};

export function useRovingTabIndex<T extends string>(
  itemIds: readonly T[],
  selectedId: T,
  orientation: Orientation = "horizontal",
) {
  const [focusedOverride, setFocusedOverride] = useState<T | null>(null);
  const focusedId = focusedOverride ?? selectedId;

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

      if (event.key === NEXT_KEY[orientation]) {
        event.preventDefault();
        const nextId = moveFocus(1);
        setFocusedOverride(nextId);
        return nextId;
      }

      if (event.key === PREVIOUS_KEY[orientation]) {
        event.preventDefault();
        const previousId = moveFocus(-1);
        setFocusedOverride(previousId);
        return previousId;
      }

      if (event.key === "Home") {
        event.preventDefault();
        const firstId = itemIds[0]!;
        setFocusedOverride(firstId);
        return firstId;
      }

      if (event.key === "End") {
        event.preventDefault();
        const lastId = itemIds[itemIds.length - 1]!;
        setFocusedOverride(lastId);
        return lastId;
      }

      return null;
    },
    [itemIds, moveFocus, orientation],
  );

  const getTabProps = useCallback(
    (itemId: T) => ({
      tabIndex: itemId === focusedId ? 0 : -1,
      onFocus: () => setFocusedOverride(itemId),
    }),
    [focusedId],
  );

  return {
    focusedId,
    setFocusedId: setFocusedOverride,
    handleKeyDown,
    getTabProps,
  };
}
