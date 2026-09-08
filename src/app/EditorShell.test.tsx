import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createPresentation, createTextElement, resetIdGenerator } from "../domain/factories";
import {
  editorTemporalControls,
  useEditorStore,
} from "../store/editorStore";
import { EditorShell } from "./EditorShell";

function resetStore(title = "Тестовая презентация") {
  resetIdGenerator();
  useEditorStore.getState().setPresentation(createPresentation(title));
  editorTemporalControls.clear();
}

function renderShell(overrides: Partial<ComponentProps<typeof EditorShell>> = {}) {
  return render(
    <EditorShell
      canvas={<div data-testid="canvas-slot">Canvas</div>}
      {...overrides}
    />,
  );
}

describe("EditorShell", () => {
  beforeEach(() => {
    resetStore();
  });

  it("renders accessible shell regions with Russian labels", () => {
    renderShell();

    expect(screen.getByRole("banner", { name: "Панель редактора" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Инструменты" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Рабочая область" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Инспектор" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Лента слайдов" })).toBeInTheDocument();
    expect(screen.getByTestId("canvas-slot")).toBeInTheDocument();
  });

  it("allows editing the presentation title via the header", () => {
    renderShell();

    const titleInput = screen.getByRole("textbox", { name: "Название презентации" });
    fireEvent.change(titleInput, { target: { value: "Новый заголовок" } });

    expect(useEditorStore.getState().presentation.title).toBe("Новый заголовок");
  });

  it("disables undo and redo when history is empty", () => {
    renderShell();

    expect(screen.getByRole("button", { name: "Отменить" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Повторить" })).toBeDisabled();
  });

  it("enables undo after a document change and redo after undo", () => {
    renderShell();

    act(() => {
      useEditorStore.getState().addSlide();
    });

    const undoButton = screen.getByRole("button", { name: "Отменить" });
    expect(undoButton).toBeEnabled();

    fireEvent.click(undoButton);
    expect(useEditorStore.getState().presentation.slides).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Повторить" })).toBeEnabled();
  });

  it("updates zoom through the header control within 50–200%", () => {
    renderShell();

    const zoomInput = screen.getByRole("spinbutton", { name: "Масштаб" });
    fireEvent.change(zoomInput, { target: { value: "150" } });

    expect(useEditorStore.getState().zoom).toBe(1.5);
    expect(zoomInput).toHaveValue(150);
  });

  it("shows save status from the store", () => {
    useEditorStore.getState().setSaveStatus("saved");
    renderShell();

    expect(screen.getByText("Сохранено")).toBeInTheDocument();
  });

  it("opens the keyboard shortcuts dialog when pressing ?", () => {
    renderShell();

    fireEvent.keyDown(window, { key: "?" });
    expect(screen.getByRole("dialog", { name: "Горячие клавиши" })).toBeInTheDocument();
  });

  it("opens shortcuts dialog from the help button", () => {
    renderShell();

    fireEvent.click(screen.getByRole("button", { name: "Горячие клавиши" }));
    expect(screen.getByRole("dialog", { name: "Горячие клавиши" })).toBeInTheDocument();
  });

  it("invokes AI generate callback from the header", () => {
    const onAiGenerate = vi.fn();
    renderShell({ onAiGenerate });

    fireEvent.click(screen.getByRole("button", { name: "Сгенерировать с ИИ" }));
    expect(onAiGenerate).toHaveBeenCalledOnce();
  });

  it("invokes presentation callback from the header", () => {
    const onPresent = vi.fn();
    renderShell({ onPresent });

    fireEvent.click(screen.getByRole("button", { name: "Показать презентацию" }));
    expect(onPresent).toHaveBeenCalledOnce();
  });

  it("renders left tool tabs and switches active panel content", () => {
    renderShell({
      textPanel: <div>Text panel content</div>,
      shapesPanel: <div>Shapes panel content</div>,
    });

    fireEvent.click(screen.getByRole("tab", { name: "Текст" }));
    expect(screen.getByText("Text panel content")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Фигуры" }));
    expect(screen.getByText("Shapes panel content")).toBeInTheDocument();
  });

  it("renders context toolbar slot above the canvas", () => {
    renderShell({
      contextToolbar: <div data-testid="context-toolbar">Toolbar</div>,
    });

    const workspace = screen.getByRole("region", { name: "Рабочая область" });
    expect(within(workspace).getByTestId("context-toolbar")).toBeInTheDocument();
  });

  it("shows slide settings when nothing is selected", () => {
    renderShell();

    expect(screen.getByText("Настройки слайда")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Переход слайда" })).toBeInTheDocument();
  });

  it("shows selected object slot when elements are selected", () => {
    act(() => {
      useEditorStore.getState().addElement(
        createTextElement(
          useEditorStore.getState().presentation.slides[0]?.elements ?? [],
        ),
      );
    });

    renderShell({
      selectedObjectPanel: <div>Selected object panel</div>,
    });

    expect(screen.getByText("Selected object panel")).toBeInTheDocument();
  });

  it("calls transition change callback from the inspector", () => {
    const onTransitionChange = vi.fn();
    renderShell({ onTransitionChange });

    fireEvent.change(screen.getByRole("combobox", { name: "Переход слайда" }), {
      target: { value: "zoom" },
    });

    expect(onTransitionChange).toHaveBeenCalledWith("zoom");
  });

  it("shows unsupported layout notice below 1024px breakpoint", () => {
    renderShell({ forceMobileLayout: true });

    expect(screen.getByText("Требуется рабочая область для настольного ПК")).toBeInTheDocument();
  });
});
