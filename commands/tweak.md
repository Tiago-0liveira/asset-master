---
description: Modify an existing asset, preserving theme constraints (asset-master).
argument-hint: [Filename] [Feedback]
---

Run the asset-master **/tweak** workflow for: **$ARGUMENTS**

Follow the full workflow in the `asset-master` skill. Summary:

1. Modify `${CLAUDE_PLUGIN_ROOT}/assets/[Filename]` per the feedback, preserving
   every `THEME_RULE.md` constraint (palette, canvas, stroke, naming).
2. Update `dateModified` on the matching
   `${CLAUDE_PLUGIN_ROOT}/assets/registry.json` entry with a fresh ISO 8601
   timestamp. Leave `dateCreated` unchanged.
