# Contributing to Labby

Labby is intentionally simple: static HTML, CSS and vanilla JavaScript for the UI, plus a small optional Node/Express backend for persistence and Agent API access.

## File map

```text
app/index.html      App shell, dialogs, templates and mobile views
app/styles.css      Theme variables, desktop layout, mobile UX and rack styles
app/script.js       UI state, rendering, import/export, rack editor and Agent API UI
backend/server.js   JSON persistence, Agent API keys, scoped agent endpoints
website/            Public demo website and wiki pages, demo package only
```

## Coding pattern

Use clear feature sections and keep comments useful:

```js
// ── Feature: short description ─────────────────────────────────────────────
function doOneThing() {
  // Explain why, not what, when the reason is not obvious.
}
```

## Rules for changes

- Keep the frontend framework-free and build-tool-free.
- Keep desktop behavior stable when adding mobile improvements.
- Put mobile-specific CSS behind `@media (max-width: 1100px)`.
- Preserve unknown inventory fields during imports or Agent API updates.
- Do not export or import API keys. Recreate keys after a restore.
- Prefer small helper functions over adding more logic to large render blocks.

## Manual test checklist

- Add, edit and delete at least one inventory item.
- Open Config, Themes, API Keys, Tree and Rack views on desktop.
- Test Bottom Navigation, More sheet, Themes and Rack editor on mobile width.
- Export and import a config file.
- Confirm API keys are shown once, have an expiration, and are not exported.
