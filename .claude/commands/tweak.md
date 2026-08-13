---
description: Modify an existing asset, preserving theme constraints (asset-master).
argument-hint: [Filename] [Feedback]
---

Run the asset-master **/tweak** workflow for: **$ARGUMENTS**

Follow the full workflow in the project's `SKILL.md` (asset-master skill). Summary:

1. Modify `./assets/[Filename]` per the feedback, preserving every
   `THEME_RULE.md` constraint (palette, canvas, stroke, naming).
2. Update `dateModified` on the matching `./assets/registry.json` entry with a
   fresh ISO 8601 timestamp. Leave `dateCreated` unchanged.
