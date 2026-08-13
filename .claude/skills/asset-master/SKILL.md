---
name: asset-master
description: Universal, project-agnostic asset creation, management, and integration. Use when the user runs /draft, /tweak, or /integrate, or asks to create, modify, or wire an asset (icon, sprite, ui-component, background, illustration, etc.) into ANY codebase.
---

# asset-master — Claude Code Skill

Universal asset studio. Works for web apps, games, mobile, design systems, CLI
tools — any project. Nothing here is hardcoded to a domain; rules and
categories are derived from the HOST project at runtime.

Paths are relative to the project root (where `server.js` lives).
`registry.json` must always remain valid JSON.

## First-Run Behavior (MANDATORY before /draft or /integrate proceed)
On the first invocation in a project, check whether `THEME_RULE.md` and
`INTEGRATION_RULE.md` exist.

If **either is missing**, you MUST generate it by analyzing the host codebase —
do not copy a template blindly:
1. Inspect the project: framework/config files (`package.json`,
   `vite.config`, `tsconfig`, `Cargo.toml`, `pyproject.toml`, mobile
   manifests…), existing asset folders, naming conventions, color tokens /
   design-system files, and how assets are currently imported.
2. Write `THEME_RULE.md` describing the project's real visual conventions
   (canvas/viewBox or output format, color palette/tokens actually used,
   stroke/spacing conventions, naming).
3. Write `INTEGRATION_RULE.md` describing the project's real integration
   workflow with the three explicit steps below.

**Crucial rule:** if you cannot DEFINITIVELY determine the integration
workflow from the codebase, you MUST ASK the user for their preferences.
**Never assume anything.**

## Command: `/draft [Asset Name] [Description]`
1. Ensure first-run rules exist (generate/ask as above).
2. **Read `THEME_RULE.md` FIRST** and respect its palette, canvas, and naming.
3. **Determine the category dynamically** from the prompt context and the
   categories already present in `./assets/registry.json` (e.g. icon,
   ui-component, sprite, background, illustration). Reuse an existing category
   when it fits; introduce a new one only when the asset genuinely differs.
4. **Write the asset** to `./assets/[filename]` (kebab-case of the name).
5. **Register** it in `./assets/registry.json` by appending to the `assets`
   array with: `id`, `name`, `filename`, `category`, `format`, `attributes`
   (include `dimensions`), `dateCreated`, `dateModified`.
   Prefer `POST /api/assets/register` when the server is running.

## Command: `/tweak [Filename] [Feedback]`
1. Modify `./assets/[Filename]` per `[Feedback]`, preserving all
   `THEME_RULE.md` constraints.
2. Update `dateModified` on the matching registry entry (fresh ISO 8601).
   Leave `dateCreated` unchanged.

## Command: `/integrate [Filename]`
1. **Read `INTEGRATION_RULE.md`.**
2. **Check for explicit, multi-step instructions**, specifically:
   - a destination folder for the asset file,
   - a registry/index/manifest file to update, and
   - whether a component/class/module must be generated.
3. **IF instructions are missing, unclear, or `INTEGRATION_RULE.md` is empty:**
   Immediately STOP and ask the user, verbatim:
   > "How should this asset be integrated? Please specify the folder path,
   > any registry files to update, and if a component class needs to be
   > created."
   Do not proceed with assumptions. Optionally, offer to persist their answers
   back into `INTEGRATION_RULE.md` so future integrations are seamless.
4. **IF instructions are clear:** execute the integration seamlessly —
   copy/emit the asset into the destination folder, update the named registry
   file, and generate the component/class if required.

## Guardrails
- Never fabricate a domain (games, biology, etc.). Rules come from the real
  host project or from the user.
- Categories are read dynamically from `registry.json`; never hardcode a fixed
  category list.
- When in doubt about integration, ASK. Do not assume.
