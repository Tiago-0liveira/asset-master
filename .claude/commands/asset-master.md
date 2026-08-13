---
description: Boot the asset-master studio — install deps, start the API + web servers, open the UI.
allowed-tools: Bash
---

Bootstrap the **asset-master** studio in this project, then hand control back to the user.

Do this in order:

1. **Install deps.** Run `npm i` in the project root. Skip only if `node_modules`
   already exists and `package-lock.json` is unchanged.
2. **Start the servers in the background.** Run `npm start` (Express API on
   `:3001`, Vite web on `:3005`) detached so it keeps running across turns — do
   NOT block the session on it.
3. **Wait until the UI is up.** Poll `http://localhost:3005` (e.g.
   `curl -sf -o /dev/null http://localhost:3005`) in a short loop, up to ~60s,
   until it responds.
4. **Open the UI.** Once ready, run `open http://localhost:3005` (macOS).
5. **Report + expose commands.** Tell the user the studio is running, then list
   the available sub-commands:
   - `/asset-master:draft [Name] [Description]` — create and register a new asset
   - `/asset-master:tweak [Filename] [Feedback]` — modify an existing asset
   - `/asset-master:integrate [Filename]` — wire an asset into the host project

If the servers are already running (`:3005` responds on the first poll), skip the
install/start steps and just open the UI and list the commands.
