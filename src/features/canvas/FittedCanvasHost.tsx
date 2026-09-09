import { type ReactNode, useRef } from "react";

import { useFitScale } from "./useFitScale";

interface FittedCanvasHostProps {
  children: (fitScale: number) => ReactNode;
  padding?: number;
}

export function FittedCanvasHost({ children, padding = 0 }: FittedCanvasHostProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const fitScale = useFitScale(hostRef, padding);

  return (
    <div
      ref={hostRef}
      data-testid="fitted-canvas-host"
      className="grid h-full w-full min-h-0 min-w-0 place-items-center overflow-auto"
    >
      {children(fitScale)}
    </div>
  );
}
