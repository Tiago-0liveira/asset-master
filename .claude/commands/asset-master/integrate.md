---
description: Wire an asset into the host project per INTEGRATION_RULE.md (asset-master).
argument-hint: [Filename]
---

Run the asset-master **/integrate** workflow for: **$ARGUMENTS**

Follow the full workflow in the project's `SKILL.md` (asset-master skill). Summary:

1. **Read `INTEGRATION_RULE.md`.**
2. Check for explicit, multi-step instructions:
   - a destination folder for the asset file,
   - a registry/index/manifest file to update, and
   - whether a component/class/module must be generated.
3. **If instructions are missing, unclear, or the rule is empty:** STOP and ask,
   verbatim: "How should this asset be integrated? Please specify the folder
   path, any registry files to update, and if a component class needs to be
   created." Do not assume. Optionally offer to persist the answers back into
   `INTEGRATION_RULE.md`.
4. **If instructions are clear:** integrate seamlessly — copy/emit the asset into
   the destination folder, update the named registry file, and generate the
   component/class if required.
