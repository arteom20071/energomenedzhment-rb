import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SLIDE_TEMPLATES } from "./applyTemplate";
import { TemplateGallery } from "./TemplateGallery";

describe("TemplateGallery", () => {
  it("renders visual thumbnails for all templates", () => {
    render(<TemplateGallery onSelect={vi.fn()} />);

    for (const template of SLIDE_TEMPLATES) {
      expect(screen.getByRole("button", { name: template.name })).toBeInTheDocument();
    }
  });

  it("invokes onSelect when a template is chosen", () => {
    const onSelect = vi.fn();
    render(<TemplateGallery onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: SLIDE_TEMPLATES[0]!.name }));
    expect(onSelect).toHaveBeenCalledWith(SLIDE_TEMPLATES[0]!.id);
  });
});
