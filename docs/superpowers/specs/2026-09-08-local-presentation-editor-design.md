# Local Presentation Editor — Design Specification

**Date:** 2026-09-08

**Status:** Approved for implementation

**Target:** Local-first browser application for editing and exporting presentations

**Initial content:** The nine-slide Belarus energy-management presentation preserved in `legacy/`

## 1. Product intent

The application is a local-first presentation editor that runs as a Vite React TypeScript single-page application. It lets a user create and edit slide decks without an account or server. The initial deck will be migrated from the existing Reveal.js presentation into typed seed data in a later task.

The editor prioritizes predictable direct manipulation, durable local drafts, strict portable JSON, and high-fidelity image export. It is not a collaborative document service and does not depend on a cloud backend in the MVP.

## 2. Goals

- Provide a desktop-oriented slide-editing workspace in the browser.
- Render slides on a DOM canvas with a fixed logical size of 1920 × 1080.
- Support typed, serializable presentation documents rather than stored HTML.
- Keep all document and uploaded-asset data on the user's device by default.
- Make edits undoable and redoable through a bounded history.
- Import and export a strict, versioned JSON document format.
- Export individual slides or a complete deck as high-resolution images.
- Allow AI-generated JSON to be pasted and validated manually in the MVP.
- Preserve the existing presentation as a reliable migration reference.

## 3. Non-goals

The MVP does not include:

- Real-time collaboration, comments, accounts, permissions, or cloud sync.
- PowerPoint, Keynote, PDF, or Reveal.js round-trip import.
- Server-side rendering or a Next.js runtime.
- Fabric.js or a second scene graph in parallel with the DOM.
- Arbitrary HTML, CSS, JavaScript, SVG scripts, or executable plugins in imported documents.
- Video/audio editing, animation timelines, speaker notes, presenter mode, or transitions.
- Master slides, reusable component libraries, charts backed by live data, or data binding.
- Automated calls to AI providers, API-key storage, or prompt orchestration.
- Pixel-perfect font embedding across machines; the editor uses available browser fonts and records font-family preferences.

## 4. Technology and architecture

### 4.1 Runtime stack

- Vite, React, and TypeScript provide the SPA runtime and build.
- Tailwind CSS provides application-shell styling and design tokens.
- Lucide React provides interface icons.
- Zustand owns editor and document state.
- zundo adds temporal undo/redo history to the editable document slice.
- React Moveable provides selection handles, drag, resize, and rotation interactions.
- React Selecto provides marquee and multi-selection.
- Zod defines runtime schemas for imported documents and boundary validation.
- html-to-image renders slide DOM nodes to PNG or SVG-compatible image output.
- IndexedDB stores documents and binary assets; a small adapter isolates storage details.

### 4.2 Module boundaries

The planned source structure is:

```text
src/
  app/              application shell, routing-free view composition, providers
  components/       reusable application UI
  editor/           canvas, selection, moveable/selecto adapters, keyboard commands
  model/            TypeScript document types, Zod schemas, migrations, seed data
  state/            Zustand stores, actions, selectors, undo configuration
  persistence/      IndexedDB repositories, autosave coordinator, asset URLs
  export/           JSON and image export services
  import/           strict JSON parsing and manual AI JSON workflow
  styles/           global styles and theme tokens
  test/             shared test setup and fixtures
```

The model and persistence layers must not import React. Interaction libraries are isolated behind editor adapters so document actions remain unit-testable. Components read state through narrow selectors and invoke named store actions instead of mutating model objects.

### 4.3 DOM canvas

Every slide is rendered as a positioned DOM tree inside a logical 1920 × 1080 canvas. The viewport scales the canvas uniformly to fit available workspace space:

```text
scale = min(workspaceWidth / 1920, workspaceHeight / 1080)
```

Element coordinates and sizes are always stored in logical pixels. Pointer deltas from Moveable and Selecto are converted back to logical coordinates before state updates. Zoom changes presentation only and never rewrite element geometry.

Elements use absolute positioning within the slide. The renderer is model-driven: React creates DOM from typed elements; imported markup is never injected with `dangerouslySetInnerHTML`.

## 5. User experience

### 5.1 Visual language

The editor uses a dark Slate interface with Indigo as the primary accent. The chrome must remain visually separate from the slide, which can use any background color.

- Application background: Slate 950.
- Panels: Slate 900/800 with subtle Slate borders.
- Primary actions and active states: Indigo 500/400.
- Text: Slate 100 primary, Slate 400 secondary.
- Destructive actions: Rose.
- Focus indicators: visible Indigo rings with sufficient contrast.

The target is a desktop layout at widths of 1024 px and above. Smaller widths show a clear unsupported-layout notice rather than a broken editor.

### 5.2 Workspace layout

- **Top toolbar:** document title, undo, redo, zoom, preview, import, export, and save status.
- **Left sidebar:** ordered slide thumbnails, add slide, duplicate slide, delete slide, and drag-to-reorder.
- **Center workspace:** scaled slide canvas, paste target, selection bounds, and safe overflow clipping.
- **Right inspector:** contextual properties for the current slide or selected elements.
- **Status area:** current slide number, zoom percentage, selection count, and persistence state.

Panels have stable dimensions so selecting an element does not shift the canvas. The center workspace may scroll when zoom exceeds the fit level.

### 5.3 Core interactions

- Click selects one element; Shift-click toggles membership in a multi-selection.
- Dragging empty canvas clears selection and may begin a marquee selection.
- Selected elements can move, resize, and rotate through Moveable.
- Arrow keys nudge by 1 logical pixel; Shift+Arrow nudges by 10.
- Delete/Backspace deletes selected elements unless focus is in an editable input.
- Ctrl/Cmd+D duplicates selection.
- Ctrl/Cmd+Z undoes and Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y redoes.
- Ctrl/Cmd+C, X, and V use an internal serialized element clipboard where browser support permits.
- Double-clicking a text element opens text editing; Escape exits text editing or clears selection.
- New elements receive unique IDs, remain inside the slide when created, and become selected.
- Multi-element transforms preserve relative positions.

Keyboard handlers must ignore typing targets, including inputs, textareas, selects, and content-editable elements.

### 5.4 Inspector behavior

The slide inspector edits slide name and background. Element controls edit position, size, rotation, opacity, stacking order, and lock state. Text controls edit content, font family, size, weight, color, alignment, line height, and letter spacing. Shape controls edit fill, border, radius, and basic shape kind. Image controls edit fit mode, crop-independent positioning, alt text, and asset replacement.

Mixed values in multi-selection display an indeterminate state. Inspector edits produce one history entry per committed interaction, not one entry per pointer event or keystroke.

### 5.5 Accessibility

- All toolbar and panel actions have accessible names and visible focus states.
- Icon-only buttons use tooltips and `aria-label`.
- Panels and the slide list are keyboard navigable.
- Selected state is exposed with appropriate ARIA state where applicable.
- Color controls retain textual or numeric values.
- The canvas supports keyboard operations for all transforms available from pointers, except marquee selection.
- User-authored images carry an editable `alt` field; decorative images can use an empty alt value.

## 6. Data model

### 6.1 Versioned document

All persisted and exported documents conform to a discriminated, versioned schema:

```ts
type PresentationDocument = {
  schemaVersion: 1
  id: string
  title: string
  createdAt: string
  updatedAt: string
  canvas: { width: 1920; height: 1080 }
  theme: PresentationTheme
  slides: Slide[]
  assetRefs: string[]
}
```

Dates are ISO 8601 strings. IDs are opaque UUID-style strings. Arrays preserve explicit display order. Unknown keys are rejected at import boundaries.

### 6.2 Slides

```ts
type Slide = {
  id: string
  name: string
  background: Paint
  elements: SlideElement[]
}
```

Element array order defines back-to-front stacking order. Reordering modifies the array rather than introducing conflicting z-index values.

### 6.3 Elements

All elements share:

```ts
type ElementBase = {
  id: string
  type: "text" | "shape" | "image"
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  locked: boolean
  name?: string
}
```

MVP variants:

- `TextElement`: plain text content plus font family, font size, font weight, italic, underline, color, horizontal alignment, vertical alignment, line height, and letter spacing.
- `ShapeElement`: rectangle, rounded rectangle, ellipse, or line; fill paint, optional stroke, stroke width, and corner radius where applicable.
- `ImageElement`: `assetId`, fit mode (`cover`, `contain`, or `fill`), alt text, and optional focal point.

Paint is either a solid RGBA color or `none`. Gradients, shadows, masks, groups, tables, and embedded media are outside the MVP schema.

### 6.4 Validation invariants

Zod schemas enforce:

- Exact `schemaVersion: 1` for MVP imports.
- Canvas dimensions of exactly 1920 × 1080.
- One or more slides and bounded collection sizes.
- Non-empty, unique IDs across document, slides, and elements.
- Finite numeric values; positive element dimensions; opacity from 0 to 1.
- Bounded text and title lengths.
- Supported enum values only.
- Asset references that use application asset IDs, never arbitrary executable URLs.
- No unknown keys at any object level.

Semantic validation runs after schema parsing to check uniqueness and cross-references. Import is atomic: no part of an invalid document enters the active store.

## 7. State management and history

The Zustand store contains the active document, active slide ID, selection, viewport settings, UI panel state, and persistence status. Only the document subtree participates in zundo history. Ephemeral selection, zoom, open dialogs, and save indicators are excluded.

Store actions represent user intent, including `addSlide`, `reorderSlides`, `updateElements`, `duplicateSelection`, and `deleteSelection`. Continuous transforms update a transient interaction preview and commit one document action when the interaction ends. Text edits are grouped into a history entry on blur or after a short idle boundary.

History is bounded to prevent unbounded memory use. Loading or importing a document clears prior undo history because earlier states belong to another document.

## 8. Persistence and assets

### 8.1 IndexedDB layout

IndexedDB is the authoritative local persistence layer. The database is versioned and contains:

- `documents`: document ID, metadata, and validated JSON document.
- `assets`: asset ID, Blob, MIME type, byte size, original filename, width, height, and creation time.
- `settings`: last opened document ID and non-document preferences.

Binary image data is never placed in Zustand history, localStorage, or exported document JSON. Runtime object URLs are created by an asset URL service, cached, and revoked when unused.

### 8.2 Autosave

Document changes trigger a debounced autosave. Save states are `idle`, `saving`, `saved`, and `error`. A final flush runs on visibility change and before unload when possible. The UI does not promise that `beforeunload` is guaranteed; JSON export is the durable user-controlled backup.

Writes use a transaction and update `updatedAt` with the committed snapshot. A failed write leaves the in-memory document intact and displays a persistent retry action. Storage quota and unavailable IndexedDB are distinguishable errors.

### 8.3 Asset lifecycle

Accepted MVP uploads are PNG, JPEG, WebP, GIF, and safe SVG after SVG sanitation or rejection of active content. File size and decoded dimensions are checked before storage. Unsupported or corrupt images are rejected without mutating the document.

Deleting an image element does not immediately delete its asset because undo may restore it. Orphan cleanup runs only after a successful document save and excludes assets referenced by retained undo states. JSON export can either omit binaries by design or use a future package format; MVP JSON records stable asset metadata/references and reports missing local assets on another device.

## 9. Import

### 9.1 JSON import

The importer:

1. Reads a UTF-8 `.json` file or pasted text with an explicit size limit.
2. Parses JSON with clear syntax-error location where available.
3. Applies the strict Zod schema.
4. Applies semantic invariants and asset-reference checks.
5. Shows a summary of the incoming title, slide count, element count, and asset warnings.
6. Replaces the active document only after user confirmation.
7. Persists the new document and clears undo/redo history.

Invalid imports retain the current document unchanged. Errors identify a field path and human-readable reason. Unknown schema versions are rejected with an upgrade-oriented message.

### 9.2 Manual AI JSON import

The MVP offers a text area where users paste JSON produced by any AI system. The application provides a copyable schema/example prompt, but it does not send prompts or documents to a provider. Pasted AI JSON follows the same strict parser and confirmation flow as file import. No relaxed repair, eval, markdown execution, or silent coercion is allowed.

## 10. Export

### 10.1 JSON

JSON export serializes a validated document snapshot with deterministic formatting and `schemaVersion`. Ephemeral UI state, history, object URLs, and IndexedDB implementation details are excluded. The filename derives from a sanitized document title and includes `.presentation.json`.

Before download, export validates the snapshot. A validation failure blocks download and reports the invalid path rather than producing a corrupt backup.

### 10.2 Slide images

Image export renders the actual 1920 × 1080 slide DOM without editor chrome, selection UI, or transform handles. html-to-image receives explicit dimensions and a solid fallback background. The renderer waits for fonts and local images to decode before capture.

Users can export the current slide as PNG and export all slides sequentially. MVP multi-slide export may download separate numbered PNG files; ZIP packaging is optional only if implemented without adding an unnecessary runtime dependency. Export progress is visible and cancellable between slides.

Cross-origin images are not accepted into documents by URL in the MVP, avoiding tainted canvas failures. Export errors identify the affected slide and leave the document unchanged.

## 11. Error handling

Errors are classified and presented near the action that caused them:

- **Validation:** path-specific import/export schema errors.
- **Persistence:** IndexedDB unavailable, transaction failure, or quota exceeded.
- **Asset:** unsupported type, oversized file, decode failure, missing blob, or unsafe SVG.
- **Export:** font/image readiness timeout or DOM capture failure.
- **Interaction:** recoverable adapter errors with selection reset, without document loss.

Expected user errors do not use uncaught exceptions. Unexpected failures are logged to the browser console with context and shown as a non-destructive generic message. Dialogs keep the user's pasted JSON after a failed validation. Destructive actions require confirmation when they would remove a slide or replace an unsaved active document.

If the persisted document cannot be parsed at startup, the app does not overwrite it. It offers to export the raw recovery payload and open the typed seed presentation instead.

## 12. Testing strategy

### 12.1 Unit tests

Vitest covers:

- Zod schemas, strict-key rejection, numeric bounds, and semantic validation.
- Document actions such as add, duplicate, reorder, update, and delete.
- Undo/redo boundaries and exclusion of ephemeral UI state.
- Coordinate conversion between viewport and logical canvas.
- JSON serialization, deterministic output, and filename sanitation.
- Persistence adapters with an IndexedDB-compatible test double.
- Asset-reference and orphan-cleanup rules.

### 12.2 Component tests

React Testing Library with jsdom covers:

- App shell regions and accessible toolbar names.
- Slide selection and thumbnail actions.
- Inspector values for single and mixed selections.
- Keyboard command guards while typing.
- Import validation and atomic confirmation behavior.
- Save/error indicators.

Moveable, Selecto, IndexedDB, and html-to-image boundaries are mocked in jsdom tests. Adapter-level tests verify the events converted into store actions.

### 12.3 Browser tests

Later end-to-end coverage should verify drag, resize, rotate, marquee selection, autosave/reload, image upload, and PNG dimensions in a real Chromium browser. Visual regression snapshots should cover the migrated nine-slide seed deck at 1920 × 1080 and common workspace sizes.

The baseline CI/local gate is lint, typecheck, unit/component tests, and production build.

## 13. Performance and safety

- Components subscribe through narrow Zustand selectors to avoid canvas-wide rerenders.
- Pointer movement is rendered through the interaction adapter and committed at interaction end.
- Thumbnails use scaled DOM or generated previews and avoid cloning full editor state.
- Object URLs are reused and revoked.
- Imports have explicit byte, slide-count, element-count, and text-length limits.
- Imported content is data only. URLs, event handlers, scripts, and raw HTML are forbidden.
- The application makes no network request for user documents or assets.

## 14. MVP delivery boundaries

The MVP is complete when it can:

1. Start locally through npm and build as a static SPA.
2. Open the migrated nine-slide typed seed document.
3. Add, duplicate, delete, select, and reorder slides.
4. Add and edit text, basic shapes, and uploaded images.
5. Move, resize, rotate, lock, layer, and multi-select elements.
6. Undo and redo document changes.
7. Autosave documents and assets locally in IndexedDB.
8. Strictly import/export version-1 JSON.
9. Validate manually pasted AI JSON.
10. Export one or all slides as 1920 × 1080 PNG images.

Task 1 intentionally delivers only the project scaffold, complete specification, and legacy preservation. It does not claim any editor capability in this list beyond a compiling placeholder shell.

## 15. Phase 2 AI connectors

Phase 2 may add opt-in connectors behind a provider-neutral interface:

```ts
interface PresentationAiConnector {
  id: string
  generate(request: GenerationRequest, signal: AbortSignal): Promise<unknown>
}
```

Connectors may target OpenAI-compatible APIs, Anthropic, Google, or a user-hosted endpoint. Every response remains untrusted input and passes through the same strict schema and semantic validation as manual JSON. Generated content is previewed as a proposed replacement or insertion and requires explicit acceptance.

Phase 2 requirements:

- Provider configuration is isolated from document state.
- API keys are never exported with presentations or written to logs.
- Prefer session-only credentials; persistent credential storage requires an explicit security design and user consent.
- Requests show what document content will leave the device.
- Abort, timeout, rate-limit, authentication, and malformed-response errors have distinct messages.
- The connector contract supports test doubles and contains no provider logic in UI components.
- AI output cannot provide executable HTML, JavaScript, remote asset URLs, or schema extensions.
- The manual JSON path remains available when connectors are disabled or offline.

AI connectors do not change the local-first persistence model and are not a prerequisite for the MVP.

## 16. Migration and compatibility

The existing Reveal.js implementation is preserved in `legacy/index.html`, `legacy/css/custom.css`, and `legacy/js/editor.js`; it continues to reference the unchanged root `assets/` directory. The preserved implementation is a visual and content reference, not a runtime dependency of the React editor.

A later migration task will transcribe all nine slides into version-1 typed seed data, retain Russian text and image references, and compare rendered results against the legacy deck. Legacy source remains available until that migration is verified.
