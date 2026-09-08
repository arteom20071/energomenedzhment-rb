# Local Presentation Editor

This repository is being migrated from a static Reveal.js presentation to a
local-first presentation editor. The root application is currently a Vite,
React, and TypeScript scaffold with a placeholder desktop layout. Editing,
persistence, typed seed slides, import, and export will be implemented in later
tasks.

The product design is documented in
`docs/superpowers/specs/2026-09-08-local-presentation-editor-design.md`.

## Local setup

Requirements:

- A current Node.js LTS release
- npm

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Vite prints the local URL, normally `http://localhost:5173`.

Available quality checks:

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
```

`npm run test` starts Vitest in watch mode. Production output is written to
`dist/`.

## Current scaffold

- `src/` contains the minimal React application shell and smoke test.
- `vite.config.ts` configures React, Tailwind CSS, and Vitest.
- `assets/images/` retains the nine original SVG infographics shared by the
  legacy deck and future seed migration.
- `tools/generate_svg.py` rebuilds SVG infographics as UTF-8.

The intended editor stack includes Tailwind CSS, Lucide React, Zustand with
zundo, React Moveable, React Selecto, Zod, html-to-image, IndexedDB, Vitest,
jsdom, and React Testing Library. Their presence in the scaffold does not imply
that the later editor features are implemented.

## Legacy Reveal.js presentation

The complete nine-slide static implementation is preserved at
`legacy/index.html`, with its styles and editor script in `legacy/css/` and
`legacy/js/`. It continues to use the unchanged images in `assets/images/`.

To view it from a local server started at the repository root:

```bash
python -m http.server 8080
```

Open `http://localhost:8080/legacy/`. The Reveal.js runtime and Inter font are
loaded from public CDNs, so the legacy view needs network access for those
resources.

The legacy deck covers energy management and energy auditing in the legal and
economic context of the Republic of Belarus, including Law No. 239-Z and GOST
ISO 50001-2021. Before publication, verify legal wording against current
official sources.
