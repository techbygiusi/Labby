# Labby — Neue Webseite

Unified deployment that serves everything under **my-labby.com**:

| Path | Content |
|---|---|
| `/` | Landing page + Wiki (neue Webseite) |
| `/wiki.html` | Labby Wiki |
| `/demo/` | Demo-App (localStorage only, kein Backend) |
| `/app/` | Volle Labby-App (server-seitige persistente Daten) |
| `/api/` | Node.js Backend |

## Voraussetzungen

Dieses Projekt nutzt einen **gemeinsamen Docker-Build-Context** über das übergeordnete `Labby/`-Verzeichnis.
Die Verzeichnisstruktur muss so aussehen:

```
Labby/
├── Labby Website/          ← Quellordner für Landing-Page + Wiki
├── Labby-main/             ← Quellordner für die volle App
├── Labby-my-labby.com/     ← Quellordner für den Demo-App
└── Labby Neue Webseite/    ← DIESER Ordner
    ├── Dockerfile
    ├── docker-compose.yml
    ├── nginx/
    ├── website/            ← Überschreibt index.html aus "Labby Website"
    └── backend/            ← SSO-fähiges Backend (neu)
```

## Schnellstart

```bash
cd "Labby/Labby Neue Webseite"
docker compose up --build -d
```

Dann aufrufen: http://localhost

## Port ändern

In `docker-compose.yml` den Port bei `labby-frontend` anpassen:
```yaml
ports:
  - "8080:80"   # statt 80:80
```

## SSO / Authentifizierung

Das Backend unterstützt SSO out-of-the-box. Umgebungsvariablen in `docker-compose.yml`:

| Variable | Standard | Beschreibung |
|---|---|---|
| `AUTH_ENABLED` | `false` | SSO aktivieren |
| `AUTH_USER_HEADER` | `x-auth-request-user` | Header mit dem Benutzernamen |
| `AUTH_ALLOWED_USERS` | *(leer = alle)* | Kommagetrennte Liste erlaubter User |

### Unterstützte SSO-Systeme

- **oauth2-proxy** → setzt `X-Auth-Request-User` Header
- **Authentik** → setzt `X-Auth-Request-User` Header
- **Authelia** → setzt `X-Auth-Request-User` Header
- **Keycloak / OIDC** → `Authorization: Bearer <jwt>` (liest `preferred_username` / `email` / `sub`)

### Beispiel mit oauth2-proxy

1. `AUTH_ENABLED=true` in `docker-compose.yml` setzen
2. Den auskommentierten `oauth2-proxy`-Service in `docker-compose.yml` einkommentieren und anpassen
3. Den auskommentierten nginx-SSO-Block in `nginx/default.conf` aktivieren

## Daten & Backup

Labby-Daten liegen im Docker-Volume `labby-data`. Backup:
```bash
docker run --rm -v labby-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/labby-backup.tar.gz /data
```

## Produktion (my-labby.com)

Stelle einen Reverse-Proxy (Traefik, Caddy, nginx, Cloudflare Tunnel) davor und leite HTTPS auf Port 80 des Containers um.

Beispiel mit Caddy:
```
my-labby.com {
    reverse_proxy labby-frontend:80
}
```
