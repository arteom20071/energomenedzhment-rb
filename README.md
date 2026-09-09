# Local Presentation Editor

A local-first slide editor for the Belarus energy-management deck. The app
runs as a static Vite SPA: documents and uploaded photos stay in the browser
(IndexedDB), with no account or server.

**Live site:** https://arteom20071.github.io/energomenedzhment-rb/

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
`dist/`. GitHub Pages deploys that output from `main` via
`.github/workflows/pages.yml` with base path `/energomenedzhment-rb/`.

The editor is built for viewports at least 1024px wide. Drafts are stored on
the visitor's device, not in the GitHub repository.

## Application layout

- `src/` contains the editor shell, canvas, media library, persistence, and
  export.
- `public/assets/images/` holds the nine SVG infographics used by the seed
  deck.
- `legacy/` preserves the previous Reveal.js presentation.

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
