# Ivevar Management — working notes for Claude

Office/ERP web app for Ivevar. Single-file Cloudflare Worker (serves the app HTML + JSON API).

## Deploy (IMPORTANT — this is how code goes live)
- **Deploy = `git push origin main`.** Cloudflare Workers Builds is connected to this repo
  and auto-deploys every push to `main` (runs `npx wrangler deploy`, ~1–2 min). No browser
  paste, no manual Cloudflare step.
- The worker reads the **prebuilt `dist/worker.js`** (build command is OFF in Cloudflare).
  So you MUST rebuild and commit `dist/` before pushing:
  ```
  python3 build.py        # regenerates dist/worker.js (+ index.html, app.js)
  git add -A && git commit -m "..." && git push origin main
  ```
- Verify after deploy by fetching the live URL and grepping for a marker you added.

## Pushing from a fresh session (no token needed)
GitHub access here goes through the session's git proxy. To get push rights:
call the `add_repo` tool → `{owner: "Ivevarusa", repo: "ivevar-management", access: "push"}`,
then `git push`. **No personal access token is required** — the proxy mints credentials.
(Raw GitHub auth/login endpoints are blocked by the proxy; don't try PAT/device-flow.)

## Build
`build.py` concatenates `1_shell.html` + `2_core.js`…`6_more.js` into the page HTML,
then injects it into `server/worker.src.js` (replacing `__APP_HTML__`) → `dist/worker.js`.
App JS is INLINED in the page, so `document.body.innerHTML` contains the source —
when testing in a browser, check `#view` innerText, not body, to avoid false positives.

## Cloudflare resources (data lives here, never in GitHub)
- Account: `168d4efa4cfd94b5c2ecbea548bba1c9` (Webdigital450@gmail.com)
- Worker: `ivevar-management` · live: https://ivevar-management.webdigital450-68d.workers.dev
- Bindings (kept in sync via `wrangler.toml` — do not change without updating Cloudflare):
  | Type        | Binding | Resource                                        |
  |-------------|---------|-------------------------------------------------|
  | D1 database | `DB`    | `ivevar-office-db` (`48393769-634c-40ac-9a12-682ce925e2f8`) |
  | R2 bucket   | `FILES` | `ivevar-files`                                  |
  | Workers AI  | `AI`    | —                                               |
- Compatibility date: `2026-10-27`. Secrets (if any) persist across deploys (same worker name).

## RBAC quick reference
- Roles: `admin` + `office`. Office users have a `title` and a `modules` list (checkboxes =
  source of truth). Sales preset = Quotations, Orders, Inventory, Packing & Dispatch.
- Order numbering is server-side continuous: `IVM01`, `IVM02`, …

## Local testing
`cd deploy` harnesses exist. `npx wrangler dev --local` — wipe `.wrangler/state` and kill
stray `workerd` PIDs between runs. Full UI harness can hang in sandbox; prefer focused probes.
