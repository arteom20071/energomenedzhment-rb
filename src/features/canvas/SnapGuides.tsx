import type { SnapGuide } from "./snapping";

interface SnapGuidesProps {
  guides: SnapGuide[];
  scale: number;
}

export function SnapGuides({ guides, scale }: SnapGuidesProps) {
  if (guides.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="snap-guides"
      className="pointer-events-none absolute inset-0 z-[9999]"
      aria-hidden="true"
    >
      {guides.map((guide, index) =>
        guide.orientation === "vertical" ? (
          <div
            key={`v-${guide.position}-${index}`}
            className="absolute top-0 h-full w-px bg-indigo-500"
            style={{ left: `${guide.position * scale}px` }}
          />
        ) : (
          <div
            key={`h-${guide.position}-${index}`}
            className="absolute left-0 h-px w-full bg-indigo-500"
            style={{ top: `${guide.position * scale}px` }}
          />
        ),
      )}
    </div>
  );
}
