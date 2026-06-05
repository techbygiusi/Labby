FROM nginx:1.27-alpine

# ── Routing configuration ──────────────────────────────────────
COPY ["Labby Neue Webseite/nginx/default.conf", "/etc/nginx/conf.d/default.conf"]

# ── Website: landing page + wiki (from Labby Website folder) ──
COPY ["Labby Website/", "/usr/share/nginx/html/website/"]

# ── Override index.html with updated version (demo/app links) ─
COPY ["Labby Neue Webseite/website/index.html", "/usr/share/nginx/html/website/index.html"]

# ── Demo app (localStorage-only, from Labby-my-labby.com) ─────
COPY ["Labby-my-labby.com/app/", "/usr/share/nginx/html/demo/"]

# ── Full Labby app (server-side storage, from Labby-main) ─────
COPY ["Labby-main/app/", "/usr/share/nginx/html/app/"]

EXPOSE 80
