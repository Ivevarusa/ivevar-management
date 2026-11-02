# Ivevar Management

Office / ERP web app for Ivevar — single-file Cloudflare Worker (D1 + R2 + Workers AI).

## Structure
- `1_shell.html` — HTML shell + CSS
- `2_core.js` … `6_more.js` — app JavaScript (concatenated, inlined into the page)
- `server/worker.src.js` — the Cloudflare Worker (API + static serving); `__APP_HTML__` is replaced at build time
- `build.py` — concatenates the source into `dist/` (`index.html`, `app.js`, `worker.js`)
- `wrangler.toml` — worker name + bindings (D1 `DB`, R2 `FILES`, AI `AI`)

## Build
```
python3 build.py
```
Produces `dist/worker.js` (the deployable worker with the app HTML inlined).

## Deploy
Pushing to the connected GitHub repo triggers an automatic Cloudflare deploy
(Workers Builds), which runs `npx wrangler deploy` and ships `dist/worker.js`.

## Bindings (must stay in sync with Cloudflare)
| Type        | Binding | Resource            |
|-------------|---------|---------------------|
| D1 database | `DB`    | `ivevar-office-db`  |
| R2 bucket   | `FILES` | `ivevar-files`      |
| Workers AI  | `AI`    | —                   |
