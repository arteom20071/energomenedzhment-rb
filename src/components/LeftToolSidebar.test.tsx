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

  it("focuses the newly active tab when navigating with arrow keys", () => {
    render(
      <LeftToolSidebar
        textPanel={<div>Text panel</div>}
        shapesPanel={<div>Shapes panel</div>}
      />,
    );

    const tablist = screen.getByRole("tablist", { name: "Панели инструментов" });
    const textTab = screen.getByRole("tab", { name: "Текст" });

    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    expect(document.activeElement).toBe(textTab);
    expect(textTab).toHaveAttribute("tabindex", "0");
  });

  it("focuses first tab on Home and last tab on End", () => {
    render(<LeftToolSidebar textPanel={<div>Text panel</div>} />);

    const tablist = screen.getByRole("tablist", { name: "Панели инструментов" });
    const firstTab = screen.getByRole("tab", { name: "ИИ Создать" });
    const lastTab = screen.getByRole("tab", { name: "Шаблоны" });

    fireEvent.keyDown(tablist, { key: "End" });
    expect(document.activeElement).toBe(lastTab);

    fireEvent.keyDown(tablist, { key: "Home" });
    expect(document.activeElement).toBe(firstTab);
  });
});
