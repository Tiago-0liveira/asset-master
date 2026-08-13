---
description: Draft a new asset and register it in the catalog (asset-master).
argument-hint: [Asset Name] [Description]
---

Run the asset-master **/draft** workflow for: **$ARGUMENTS**

Follow the full workflow and guardrails in the project's `SKILL.md` (asset-master
skill). Summary:

1. Ensure first-run rules exist. If `THEME_RULE.md` or `INTEGRATION_RULE.md` is
   missing, generate it by analyzing this host codebase — or ASK the user if the
   conventions can't be determined. Never assume.
2. **Read `THEME_RULE.md` first** and respect its palette, canvas/viewBox, stroke,
   and naming conventions.
3. **Pick the category dynamically** from the categories already in
   `./assets/registry.json`; reuse one when it fits, add a new one only when the
   asset genuinely differs.
4. **Write** the asset to `./assets/<kebab-case-name>`.
5. **Register** it in `./assets/registry.json` (`id`, `name`, `filename`,
   `category`, `format`, `attributes` incl. `dimensions`, `dateCreated`,
   `dateModified`). Prefer `POST http://localhost:3001/api/assets/register` when
   the server is running.
