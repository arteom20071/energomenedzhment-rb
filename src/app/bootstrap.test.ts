import { beforeEach, describe, expect, it } from "vitest";

import { createPresentation } from "../domain/factories";
import {
  FakeIdbFacade,
  clearLocalPreferences,
  setActiveProjectId,
} from "../services/persistence";
import { bootstrapEditor, createEditorRuntime } from "./bootstrap";
import { cloneSeedPresentation } from "./cloneSeed";

beforeEach(() => {
  clearLocalPreferences();
});

describe("bootstrapEditor", () => {
  it("opens the seed presentation when no active project exists", async () => {
    const runtime = createEditorRuntime(new FakeIdbFacade());
    const result = await bootstrapEditor(runtime, "/repo/");

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") {
      return;
    }
    expect(result.presentation.title).toBe(cloneSeedPresentation().title);
    expect(result.presentation.slides).toHaveLength(11);
    expect(result.presentation.slides[0]?.elements.some((element) =>
      element.type === "text" && element.content?.includes("Белорусский государственный медицинский университет"),
    )).toBe(true);
    expect(result.presentation.slides.some((slide) =>
      slide.elements.some((element) =>
        element.type === "text" && element.content?.includes("Зачем предприятию энергоменеджмент"),
      ),
    )).toBe(true);
    expect(
      result.presentation.slides[0]?.elements.some((element) => element.type === "image"),
    ).toBe(true);
  });

  it("loads a stored document when the active project is valid", async () => {
    const runtime = createEditorRuntime(new FakeIdbFacade());
    const presentation = createPresentation("Сохранённый проект");
    await runtime.documents.save({
      id: presentation.id,
      presentation,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    setActiveProjectId(presentation.id);

    const result = await bootstrapEditor(runtime);
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") {
      return;
    }
    expect(result.presentation.title).toBe("Сохранённый проект");
    expect(result.documentId).toBe(presentation.id);
  });

  it("does not overwrite a damaged document and exposes a recovery payload", async () => {
    const idb = new FakeIdbFacade();
    await idb.open();
    await idb.put("documents", "broken-doc", { id: "broken-doc", presentation: { nope: true } });
    setActiveProjectId("broken-doc");

    const runtime = createEditorRuntime(idb);
    const result = await bootstrapEditor(runtime);

    expect(result.kind).toBe("recovery");
    if (result.kind !== "recovery") {
      return;
    }
    expect(result.documentId).toBe("broken-doc");
    expect(result.rawPayload).toContain("broken-doc");
    const stored = await idb.get("documents", "broken-doc");
    expect(stored).toEqual({ id: "broken-doc", presentation: { nope: true } });
  });

  it("replaces stored em-pres drafts that still use baked SVG diagrams", async () => {
    const runtime = createEditorRuntime(new FakeIdbFacade());
    const stale = cloneSeedPresentation();
    stale.slides[0]!.elements.push({
      id: "legacy-svg",
      type: "image",
      x: 10,
      y: 10,
      width: 100,
      height: 80,
      rotation: 0,
      zIndex: 9999,
      content: "assets/images/slide-1-schema.svg",
      styles: { alt: "legacy diagram" },
    });
    await runtime.documents.save({
      id: stale.id,
      presentation: stale,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    setActiveProjectId(stale.id);

    const result = await bootstrapEditor(runtime, "/repo/");
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") {
      return;
    }
    expect(result.presentation.slides[0]?.elements.some((element) => element.id === "legacy-svg")).toBe(
      false,
    );
    expect(
      result.presentation.slides.some((slide) =>
        slide.elements.some(
          (element) =>
            element.type === "text" && element.content?.includes("Зачем предприятию энергоменеджмент"),
        ),
      ),
    ).toBe(true);
  });

  it("replaces stored em-pres drafts that still lack the title slide", async () => {
    const runtime = createEditorRuntime(new FakeIdbFacade());
    const stale = cloneSeedPresentation();
    stale.slides = stale.slides.filter((slide) => slide.id !== "em-slide-00");
    await runtime.documents.save({
      id: stale.id,
      presentation: stale,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    setActiveProjectId(stale.id);

    const result = await bootstrapEditor(runtime, "/repo/");
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") {
      return;
    }
    expect(result.presentation.slides[0]?.id).toBe("em-slide-00");
    expect(result.presentation.slides).toHaveLength(11);
  });
});
