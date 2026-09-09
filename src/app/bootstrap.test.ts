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
    expect(result.presentation.slides).toHaveLength(9);
    expect(result.presentation.slides[0]?.elements.some((element) =>
      element.type === "image" && element.content?.startsWith("/repo/assets/"),
    )).toBe(true);
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
});
