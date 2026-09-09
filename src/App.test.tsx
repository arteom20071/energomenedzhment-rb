import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { App } from "./App";
import { createEditorRuntime } from "./app/bootstrap";
import { cloneSeedPresentation } from "./app/cloneSeed";
import { createPresentation } from "./domain/factories";
import {
  FakeIdbFacade,
  clearLocalPreferences,
} from "./services/persistence";
import { editorTemporalControls, useEditorStore } from "./store/editorStore";

function renderApp() {
  const runtime = createEditorRuntime(new FakeIdbFacade());
  render(<App runtime={runtime} baseUrl="/" />);
  return runtime;
}

beforeEach(() => {
  clearLocalPreferences();
  useEditorStore.getState().setPresentation(createPresentation("Сброс"));
  editorTemporalControls.clear();
  useEditorStore.getState().setSaveStatus("idle");
});

describe("App", () => {
  it("renders the desktop editor shell and bootstraps the seed deck", async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "Название презентации" })).toHaveValue(
        cloneSeedPresentation().title,
      );
    });

    expect(screen.getByRole("navigation", { name: "Инструменты" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Рабочая область" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Инспектор" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Лента слайдов" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Слайд 9" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Presentation editor scaffold" })).not.toBeInTheDocument();
  });

  it("keeps invalid import JSON in the dialog and replaces the deck on success", async () => {
    renderApp();
    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "Название презентации" })).toHaveValue(
        cloneSeedPresentation().title,
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Сгенерировать с ИИ" }));
    const textarea = screen.getByRole("textbox", { name: "JSON презентации" });
    fireEvent.change(textarea, { target: { value: "{not-json" } });
    fireEvent.click(screen.getByRole("button", { name: "Импортировать" }));

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(textarea).toHaveValue("{not-json");

    const replacement = createPresentation("Импортированный проект");
    fireEvent.change(textarea, { target: { value: JSON.stringify(replacement) } });
    fireEvent.click(screen.getByRole("button", { name: "Импортировать" }));

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "Название презентации" })).toHaveValue(
        "Импортированный проект",
      );
    });
  });

  it("opens presentation mode on F5", async () => {
    renderApp();
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Слайд 1" })).toBeInTheDocument();
    });

    act(() => {
      fireEvent.keyDown(window, { key: "F5" });
    });

    expect(screen.getByRole("region", { name: "Режим презентации" })).toBeInTheDocument();
  });
});
