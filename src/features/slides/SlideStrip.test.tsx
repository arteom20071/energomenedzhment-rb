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
    expect(tabs[0]).toHaveAccessibleName("Слайд 1");
    expect(tabs[1]).toHaveAccessibleName("Слайд 2");
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

  it("deletes the active slide and restores it with scoped undo", () => {
    useEditorStore.getState().addSlide();
    renderStrip();

    const initialCount = useEditorStore.getState().presentation.slides.length;
    const deletedId = useEditorStore.getState().presentation.slides[1]!.id;

    fireEvent.click(screen.getByRole("button", { name: "Удалить слайд" }));

    expect(useEditorStore.getState().presentation.slides).toHaveLength(initialCount - 1);
    expect(screen.getByRole("status")).toHaveTextContent("Слайд удалён");

    fireEvent.click(screen.getByRole("button", { name: "Отменить удаление" }));
    expect(useEditorStore.getState().presentation.slides).toHaveLength(initialCount);
    expect(useEditorStore.getState().presentation.slides.some((slide) => slide.id === deletedId)).toBe(
      true,
    );
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
    expect(useEditorStore.getState().presentation.slides[0]?.elements).toHaveLength(0);

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
    const firstSlideId = useEditorStore.getState().presentation.slides[0]!.id;
    useEditorStore.getState().setActiveSlide(firstSlideId);
    renderStrip();

    fireEvent.click(screen.getByRole("button", { name: "Удалить слайд 2" }));

    expect(useEditorStore.getState().presentation.slides).toHaveLength(1);
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

  it("moves selection with ArrowLeft and ArrowRight keys", () => {
    useEditorStore.getState().addSlide();
    renderStrip();

    const tablist = screen.getByRole("tablist", { name: "Миниатюры слайдов" });
    const firstSlideId = useEditorStore.getState().presentation.slides[0]!.id;
    const secondSlideId = useEditorStore.getState().presentation.slides[1]!.id;

    expect(useEditorStore.getState().activeSlideId).toBe(secondSlideId);

    fireEvent.keyDown(tablist, { key: "ArrowLeft" });
    expect(useEditorStore.getState().activeSlideId).toBe(firstSlideId);

    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    expect(useEditorStore.getState().activeSlideId).toBe(secondSlideId);
  });

  it("reorders slides via drag and drop", () => {
    useEditorStore.getState().addSlide();
    useEditorStore.getState().addSlide();
    renderStrip();

    const [firstId, , thirdId] = useEditorStore.getState().presentation.slides.map(
      (slide) => slide.id,
    );

    const thirdTab = screen.getByRole("tab", { name: "Слайд 3" });
    const firstTab = screen.getByRole("tab", { name: "Слайд 1" });

    dragSlide(thirdTab, firstTab);

    const order = useEditorStore.getState().presentation.slides.map((slide) => slide.id);
    expect(order[0]).toBe(thirdId);
    expect(order).toContain(firstId);
  });
});
