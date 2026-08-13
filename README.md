# asset-master

Universal, project-agnostic asset studio. Create, manage, and integrate visual
assets (icons, sprites, UI components, backgrounds, illustrations) into **any**
codebase — web, games, mobile, design systems, CLI tools.

It ships as a **Claude Code plugin** bundling three things:

1. **Commands + a skill** — `/asset-master:start`, `:draft`, `:tweak`,
   `:integrate`, backed by the `asset-master` skill (`skills/asset-master/`).
   Nothing is hardcoded to a domain; rules are derived from the host project at
   runtime.
2. **An Express backend** (`server.js`) — a small JSON-registry API on port
   `3001`.
3. **A React + Vite frontend** (`src/`) — a browsable asset gallery on port
   `3005`.

---

## What it does

- Stores every asset as a file on disk plus a metadata entry in
  `assets/registry.json` (the single source of truth).
- Serves a searchable, filterable gallery of those assets with live SVG
  previews.
- Generates its own conventions per project — a `THEME_RULE.md` (palette,
  canvas, naming) and an `INTEGRATION_RULE.md` (where files go, what registry to
  update, whether to emit a component) — by analyzing the host codebase, or by
  asking you when it cannot be sure.
- Produces ready-to-paste integration code (e.g. a React component wrapping the
  SVG) when the integration rule is complete.
- Lets you create, tweak, integrate, and **delete** assets.

---

## Architecture

```
┌─────────────────────┐        /api proxy         ┌──────────────────────┐
│  Vite + React SPA   │  ───────────────────────► │  Express API         │
│  localhost:3005     │                           │  localhost:3001      │
│  (gallery UI)       │ ◄───────────────────────  │                      │
└─────────────────────┘        JSON + SVG          └──────────┬───────────┘
                                                              │
                                                   reads / writes
                                                              │
                                          ┌───────────────────▼──────────────┐
                                          │ assets/registry.json  (metadata) │
                                          │ assets/*.svg          (files)     │
                                          │ THEME_RULE.md                     │
                                          │ INTEGRATION_RULE.md               │
                                          └───────────────────────────────────┘
```

Vite proxies `/api/*` to the Express server, so the SPA and API feel like one
origin in development.

---

## Install as a Claude Code plugin

Add this repo as a marketplace, then install the plugin:

```
/plugin marketplace add Tiago-0liveira/asset-master
/plugin install asset-master@asset-master
```

Then, inside any project:

```
/asset-master:start          # install deps, boot API + web, open the UI
/asset-master:draft   [Name] [Description]
/asset-master:tweak   [Filename] [Feedback]
/asset-master:integrate [Filename]
```

`/asset-master:start` runs `npm i && npm start` **in the plugin directory**
(`${CLAUDE_PLUGIN_ROOT}`), waits for `:3005`, and opens the UI. The asset catalog
lives with the plugin; `:integrate` targets the host project you're working in.

> Plugins always namespace commands by plugin name — there is no bare
> `/asset-master`; the entrypoint is `/asset-master:start`.

## Run standalone (development)

Clone the repo and run the servers directly:

```bash
npm install
npm start        # runs API (:3001) and web (:3005) together
```

Open http://localhost:3005.

Other scripts:

| Script            | Does                                              |
|-------------------|---------------------------------------------------|
| `npm start`       | API + web concurrently (dev)                      |
| `npm run server`  | Express API only, with `--watch`                  |
| `npm run dev`     | Vite dev server only                              |
| `npm run build`   | Production build of the SPA                       |
| `npm run preview` | Preview the built SPA on :3005                    |

---

## HTTP API

Base URL: `http://localhost:3001`

| Method   | Route                     | Purpose                                                        |
|----------|---------------------------|----------------------------------------------------------------|
| `GET`    | `/api/assets`             | List all assets, each with inlined raw SVG.                    |
| `GET`    | `/api/categories`         | Unique category list derived from the registry.               |
| `POST`   | `/api/assets/register`    | Append a new asset (writes the SVG file + registry entry).    |
| `DELETE` | `/api/assets/:id`         | Remove an asset by `id` or `filename`; unlinks its file.      |
| `GET`    | `/api/rules/theme`        | Read `THEME_RULE.md` (with an `exists` flag).                 |
| `PUT`    | `/api/rules/theme`        | Save `THEME_RULE.md`.                                          |
| `GET`    | `/api/rules/integration`  | Read `INTEGRATION_RULE.md` + completeness analysis.           |
| `PUT`    | `/api/rules/integration`  | Save `INTEGRATION_RULE.md`.                                    |
| `POST`   | `/api/assets/integrate`   | Return an integration plan, or a `needs-input` prompt.        |

### The registry

`assets/registry.json` holds one record per asset:

```json
{
  "id": "arrow-right",
  "name": "Arrow Right",
  "filename": "arrow-right.svg",
  "category": "icon",
  "format": "svg",
  "attributes": { "dimensions": "100x100", "tags": ["navigation"] },
  "dateCreated": "2026-08-13T09:00:00.000Z",
  "dateModified": "2026-08-13T09:00:00.000Z"
}
```

Categories are **read dynamically** from this file — never hardcoded.

---

## The gallery UI

- **Search + filter** by name, category, or tag.
- **Asset cards** with a live SVG preview and metadata badges (category, date,
  dimensions, format).
- **Copy Raw SVG** — grab the markup for any asset.
- **⚡ Integrate into Project** — opens a modal that reads `INTEGRATION_RULE.md`.
  If the rule is complete it shows generated component + registry-entry code;
  if not, it asks you the missing questions and can save your answers back into
  `INTEGRATION_RULE.md`.
- **🗑 Delete** — confirm prompt, then `DELETE /api/assets/:id`; removes the file
  and registry entry and drops the card from the grid.
- **Rule Inspector** — edit `THEME_RULE.md` / `INTEGRATION_RULE.md` in a drawer.

---

## The plugin commands

`commands/*.md` define the slash commands; `skills/asset-master/SKILL.md` holds
the shared workflow they follow.

### First run (mandatory)

On first use in a project, the skill checks for `THEME_RULE.md` and
`INTEGRATION_RULE.md`. If either is missing it **analyzes the host codebase**
(framework/config files, existing asset folders, naming, color tokens, how
assets are imported) and writes them. If the integration workflow can't be
determined for certain, it **asks you** — it never assumes.

### Commands

- **`/asset-master:start`** — install deps, boot the API + web servers, open the
  UI. The entrypoint.
- **`/asset-master:draft [Asset Name] [Description]`** — read `THEME_RULE.md`,
  pick the category dynamically from the registry, write the asset to `assets/`,
  and register it (prefers `POST /api/assets/register` when the server runs).
- **`/asset-master:tweak [Filename] [Feedback]`** — modify an existing asset
  within the theme constraints and bump `dateModified`.
- **`/asset-master:integrate [Filename]`** — read `INTEGRATION_RULE.md` and, if
  the three steps (destination folder, registry file, component) are explicit,
  integrate seamlessly; otherwise stop and ask.

### Guardrails

- Never fabricate a domain — rules come from the real host project or from you.
- Categories always read from `registry.json`.
- When integration is unclear, **ASK**.

---

## Notes

- The backend has no authentication — intended for local, single-user use.
  Don't expose it publicly as-is; `DELETE` and the rule `PUT` routes are
  unauthenticated.
- `registry.json` must always stay valid JSON.
