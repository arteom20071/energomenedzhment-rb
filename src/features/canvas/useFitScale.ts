import { useEffect, useState, type RefObject } from "react";

import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../domain/presentation";
import { computeFitScale, resolveFitScale } from "./fitScale";

export function useFitScale(
  hostRef: RefObject<HTMLElement | null>,
  padding = 0,
): number {
  const [fitScale, setFitScale] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const update = () => {
      setFitScale(
        computeFitScale(host.clientWidth, host.clientHeight, CANVAS_WIDTH, CANVAS_HEIGHT, padding),
      );
    };

    update();

    if (typeof ResizeObserver !== "function") {
      return;
    }

    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, [hostRef, padding]);

  return resolveFitScale(fitScale);
}
