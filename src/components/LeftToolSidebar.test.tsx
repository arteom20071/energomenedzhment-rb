import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LeftToolSidebar } from "./LeftToolSidebar";

describe("LeftToolSidebar", () => {
  it("uses roving tabIndex with only the selected tab in the tab order", () => {
    render(<LeftToolSidebar textPanel={<div>Text</div>} />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveAttribute("tabindex", "0");
    expect(tabs[1]).toHaveAttribute("tabindex", "-1");
  });

  it("navigates tool tabs with arrow keys and Home/End", () => {
    render(
      <LeftToolSidebar
        textPanel={<div>Text panel</div>}
        shapesPanel={<div>Shapes panel</div>}
      />,
    );

    const tablist = screen.getByRole("tablist", { name: "Панели инструментов" });

    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Текст" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByText("Text panel")).toBeInTheDocument();

    fireEvent.keyDown(tablist, { key: "End" });
    expect(screen.getByRole("tab", { name: "Шаблоны" })).toHaveAttribute("tabindex", "0");

    fireEvent.keyDown(tablist, { key: "Home" });
    expect(screen.getByRole("tab", { name: "ИИ Создать" })).toHaveAttribute("tabindex", "0");
  });
});
