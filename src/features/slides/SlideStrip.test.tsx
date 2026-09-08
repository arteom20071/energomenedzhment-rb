import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { ToastProvider } from "../../components/Toast";
import {
  createPresentation,
  createTextElement,
  resetIdGenerator,
} from "../../domain/factories";
import {
  editorTemporalControls,
  useEditorStore,
} from "../../store/editorStore";
import { SlideStrip } from "./SlideStrip";

function resetStore() {
  resetIdGenerator();
  useEditorStore.getState().setPresentation(createPresentation("Slides"));
  editorTemporalControls.clear();
}

function renderStrip() {
  return render(
    <ToastProvider>
      <SlideStrip />
    </ToastProvider>,
  );
}

function dragSlide(source: HTMLElement, target: HTMLElement) {
  fireEvent.dragStart(source, { dataTransfer: { effectAllowed: "move" } });
  fireEvent.dragOver(target, { dataTransfer: { dropEffect: "move" } });
  fireEvent.drop(target, { dataTransfer: { dropEffect: "move" } });
  fireEvent.dragEnd(source);
}

describe("SlideStrip", () => {
  beforeEach(() => {
    resetStore();
  });

  it("lists slide thumbnails with accessible names and active state", () => {
    useEditorStore.getState().addSlide();
    renderStrip();

    const strip = screen.getByRole("region", { name: "Лента слайдов" });
    const tabs = within(strip).getAllByRole("tab");

    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveAttribute("aria-selected", "false");
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
  });

  it("activates a slide when its thumbnail is clicked", () => {
    useEditorStore.getState().addSlide();
    renderStrip();

    const secondSlideId = useEditorStore.getState().presentation.slides[1]!.id;
    fireEvent.click(screen.getByRole("tab", { name: "Слайд 2" }));

    expect(useEditorStore.getState().activeSlideId).toBe(secondSlideId);
  });

  it("adds a slide from the add button", () => {
    renderStrip();
    fireEvent.click(screen.getByRole("button", { name: "Добавить слайд" }));
    expect(useEditorStore.getState().presentation.slides).toHaveLength(2);
  });

  it("duplicates the active slide", () => {
    renderStrip();
    fireEvent.click(screen.getByRole("button", { name: "Дублировать слайд" }));
    expect(useEditorStore.getState().presentation.slides).toHaveLength(2);
  });

  it("deletes the active slide and restores it with scoped temporal undo", () => {
    useEditorStore.getState().addSlide();
    renderStrip();

    const initialCount = useEditorStore.getState().presentation.slides.length;
    const deletedId = useEditorStore.getState().presentation.slides[1]!.id;

    fireEvent.click(screen.getByRole("button", { name: "Удалить слайд" }));
    expect(useEditorStore.getState().presentation.slides).toHaveLength(initialCount - 1);

    fireEvent.click(screen.getByRole("button", { name: "Отменить удаление" }));
    expect(useEditorStore.getState().presentation.slides).toHaveLength(initialCount);
    expect(useEditorStore.getState().presentation.slides.some((slide) => slide.id === deletedId)).toBe(
      true,
    );
  });

  it("preserves earlier rename history after toast undo", () => {
    useEditorStore.getState().renamePresentation("Renamed");
    useEditorStore.getState().addSlide();
    renderStrip();

    fireEvent.click(screen.getByRole("button", { name: "Удалить слайд" }));
    fireEvent.click(screen.getByRole("button", { name: "Отменить удаление" }));

    expect(useEditorStore.getState().presentation.title).toBe("Renamed");
    expect(useEditorStore.getState().presentation.slides).toHaveLength(2);

    act(() => {
      editorTemporalControls.undo();
    });
    expect(useEditorStore.getState().presentation.slides).toHaveLength(1);
    expect(useEditorStore.getState().presentation.title).toBe("Renamed");

    act(() => {
      editorTemporalControls.undo();
    });
    expect(useEditorStore.getState().presentation.title).toBe("Slides");
  });

  it("does not undo unrelated edits through the deletion toast", () => {
    useEditorStore.getState().addSlide();
    renderStrip();

    fireEvent.click(screen.getByRole("button", { name: "Удалить слайд" }));
    act(() => {
      useEditorStore.getState().addSlide();
    });

    fireEvent.click(screen.getByRole("button", { name: "Отменить удаление" }));
    expect(screen.getByRole("status")).toHaveTextContent("Отмена недоступна: документ изменён");
  });

  it("disables scoped undo after manual temporal undo", () => {
    useEditorStore.getState().addSlide();
    renderStrip();

    fireEvent.click(screen.getByRole("button", { name: "Удалить слайд" }));
    act(() => {
      editorTemporalControls.undo();
    });

    fireEvent.click(screen.getByRole("button", { name: "Отменить удаление" }));
    expect(screen.getByRole("status")).toHaveTextContent("Отмена недоступна: документ изменён");
  });

  it("clears last slide contents with scoped undo restore", () => {
    act(() => {
      useEditorStore.getState().addElement(
        createTextElement(
          useEditorStore.getState().presentation.slides[0]?.elements ?? [],
          { content: "Payload" },
        ),
      );
    });
    renderStrip();

    fireEvent.click(screen.getByRole("button", { name: "Удалить слайд" }));
    expect(screen.getByRole("status")).toHaveTextContent("Содержимое слайда очищено");

    fireEvent.click(screen.getByRole("button", { name: "Отменить удаление" }));
    expect(useEditorStore.getState().presentation.slides[0]?.elements[0]?.content).toBe("Payload");
  });

  it("does not show a toast when deleting an already empty last slide", () => {
    renderStrip();
    fireEvent.click(screen.getByRole("button", { name: "Удалить слайд" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("supports deleting a non-active slide and restoring it", () => {
    useEditorStore.getState().addSlide();
    useEditorStore.getState().setActiveSlide(useEditorStore.getState().presentation.slides[0]!.id);
    renderStrip();

    fireEvent.click(screen.getByRole("button", { name: "Удалить слайд 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Отменить удаление" }));
    expect(useEditorStore.getState().presentation.slides).toHaveLength(2);
  });

  it("uses roving tabIndex on slide tabs", () => {
    useEditorStore.getState().addSlide();
    renderStrip();

    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveAttribute("tabindex", "-1");
    expect(tabs[1]).toHaveAttribute("tabindex", "0");
  });

  it("focuses the newly active slide tab on arrow keys", () => {
    useEditorStore.getState().addSlide();
    renderStrip();

    const tablist = screen.getByRole("tablist", { name: "Миниатюры слайдов" });
    const firstTab = screen.getByRole("tab", { name: "Слайд 1" });

    fireEvent.keyDown(tablist, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(firstTab);
    expect(firstTab).toHaveAttribute("tabindex", "0");
  });

  it("focuses remaining tab after deleting via per-thumbnail delete button", () => {
    useEditorStore.getState().addSlide();
    useEditorStore.getState().setActiveSlide(useEditorStore.getState().presentation.slides[0]!.id);
    renderStrip();

    const deleteButton = screen.getByRole("button", { name: "Удалить слайд 2" });
    act(() => {
      deleteButton.focus();
    });
    fireEvent.click(deleteButton);

    const remainingTab = screen.getByRole("tab", { name: "Слайд 1" });
    expect(document.activeElement).toBe(remainingTab);
  });

  it("keeps toolbar delete focused after moving from slide tab", () => {
    useEditorStore.getState().addSlide();
    renderStrip();

    const activeTab = screen.getByRole("tab", { name: "Слайд 2" });
    act(() => {
      activeTab.focus();
    });

    const toolbarDelete = screen.getByRole("button", { name: "Удалить слайд" });
    act(() => {
      toolbarDelete.focus();
    });
    fireEvent.click(toolbarDelete);

    expect(document.activeElement).toBe(toolbarDelete);
  });

  it("does not steal focus when deleting from toolbar while toolbar is focused", () => {
    useEditorStore.getState().addSlide();
    renderStrip();

    const toolbarDelete = screen.getByRole("button", { name: "Удалить слайд" });
    act(() => {
      toolbarDelete.focus();
    });
    fireEvent.click(toolbarDelete);

    expect(document.activeElement).toBe(toolbarDelete);
  });

  it("focuses remaining tab after deleting non-active slide via per-thumbnail button", () => {
    useEditorStore.getState().addSlide();
    useEditorStore.getState().setActiveSlide(useEditorStore.getState().presentation.slides[0]!.id);
    renderStrip();

    const deleteButton = screen.getByRole("button", { name: "Удалить слайд 2" });
    act(() => {
      deleteButton.focus();
    });
    fireEvent.click(deleteButton);

    const remainingTab = screen.getByRole("tab", { name: "Слайд 1" });
    expect(document.activeElement).toBe(remainingTab);
    expect(useEditorStore.getState().activeSlideId).toBe(
      useEditorStore.getState().presentation.slides[0]!.id,
    );
  });

  it("normalizes roving focus when the focused slide is deleted", () => {
    useEditorStore.getState().addSlide();
    renderStrip();

    const tablist = screen.getByRole("tablist", { name: "Миниатюры слайдов" });
    fireEvent.keyDown(tablist, { key: "ArrowLeft" });

    fireEvent.click(screen.getByRole("button", { name: "Удалить слайд" }));

    const remainingTab = screen.getByRole("tab", { name: "Слайд 1" });
    expect(remainingTab).toHaveAttribute("tabindex", "0");
  });

  it("reorders slides via drag and drop", () => {
    useEditorStore.getState().addSlide();
    useEditorStore.getState().addSlide();
    renderStrip();

    const [firstId, , thirdId] = useEditorStore.getState().presentation.slides.map(
      (slide) => slide.id,
    );

    dragSlide(screen.getByRole("tab", { name: "Слайд 3" }), screen.getByRole("tab", { name: "Слайд 1" }));

    const order = useEditorStore.getState().presentation.slides.map((slide) => slide.id);
    expect(order[0]).toBe(thirdId);
    expect(order).toContain(firstId);
  });
});
