---
description: Boot the asset-master studio — install deps, start the API + web servers, open the UI.
allowed-tools: Bash
---

Bootstrap the **asset-master** studio. The app (`server.js`, `src/`) lives in the
**plugin directory**, not the user's current project — so all commands below must
run from `${CLAUDE_PLUGIN_ROOT}`.

Do this in order:

1. **Install deps.** `cd "${CLAUDE_PLUGIN_ROOT}" && npm i` — skip only if
   `node_modules` already exists there and `package-lock.json` is unchanged.
2. **Start the servers in the background.**
   `cd "${CLAUDE_PLUGIN_ROOT}" && npm start` (Express API on `:3001`, Vite web on
   `:3005`). Launch detached so it keeps running across turns — do NOT block the
   session on it.
3. **Wait until the UI is up.** Poll `http://localhost:3005`
   (`curl -sf -o /dev/null http://localhost:3005`) in a short loop, up to ~60s,
   until it responds.
4. **Open the UI.** `open http://localhost:3005` (macOS).
5. **Report + expose commands.** Tell the user the studio is running, then list:
   - `/asset-master:draft [Name] [Description]` — create and register a new asset
   - `/asset-master:tweak [Filename] [Feedback]` — modify an existing asset
   - `/asset-master:integrate [Filename]` — wire an asset into the host project

If `:3005` already responds on the first poll, skip install/start and just open
the UI and list the commands.
