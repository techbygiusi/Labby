> **Disclaimer:** Labby is a vibe-coded project built mainly with Codex from OpenAI and Claude from Anthropic.

# 🧪 Labby - Map Your Homelab

Labby is a lightweight, self-hosted homelab inventory, rack and topology tool with persistent, browser-independent storage.

Track your hardware, VMs, LXCs, apps, networks, rack layouts, live status and relationships in one clean dashboard. Self-host it with Docker and keep your homelab map available from every browser and device.

<p align="center">
  <a href="https://www.my-labby.com/" target="_blank" rel="noopener noreferrer">
    <img alt="Use it now" src="https://img.shields.io/badge/%F0%9F%9A%80%20Use%20it%20now-Open%20Labby-1F1F1F?style=for-the-badge&labelColor=F6F0E6">
  </a>
</p>

<p align="center">
  <sub>⚠️ Demo site. Changes are saved in your browser only. Self-host Labby for permanent shared storage.</sub>
</p>

---

## 📸 Screenshots

### Desktop

<table>
  <tr>
    <td align="center">
      <img width="1920" height="1080" alt="Labby topology dashboard" src="https://github.com/user-attachments/assets/f8d9602b-c235-4626-ac31-2f3c032c8983" />
      <br/>
      <sub><b>Topology Dashboard</b></sub>
    </td>
  </tr>
</table>

### Mobile

<table>
  <tr>
    <td width="33%" align="center">
      <img alt="Labby mobile dashboard" src="https://github.com/user-attachments/assets/11011471-9d29-4b33-9fa3-9593db03120d" />
      <br/>
      <sub><b>Dashboard</b></sub>
    </td>
    <td width="33%" align="center">
      <img alt="Labby mobile IP view" src="https://github.com/user-attachments/assets/d9622afb-64c7-4fd9-8605-3e62d12e72af" />
      <br/>
      <sub><b>IP View</b></sub>
    </td>
    <td width="33%" align="center">
      <img alt="Labby mobile config" src="https://github.com/user-attachments/assets/278bf683-9747-4ae4-9774-20f70ac46d57" />
      <br/>
      <sub><b>Config</b></sub>
    </td>
  </tr>
</table>

---

## ✨ Features

### Core

- 🖥️ **Resource tracking** for Hardware, VMs, LXCs, Apps and Networks
- 🌐 **Topology dashboard** with searchable, expandable resource cards
- 🌳 **Relationship Tree** for hierarchy and hosting relationships
- 🕸️ **Graph View** on desktop for visual relationship mapping
- 🗄️ **Rack View** with locations, racks, front/rear layouts and linked devices
- 🌐 **IP View** for used addresses, subnets, ports and gateways
- 🎨 **Theme system** with built-in themes, Matrix theme and custom theme editor
- 🤖 **Agent API Keys** for automation and monitoring agents
- 🧠 **Automatic network matching** by IP/CIDR
- 🧭 **Built-in tutorial** available from Config
- 🗄️ **Persistent server-side storage** saved in JSON on the backend and shared across browsers/devices

---

## 🖥️ Resources & Metadata

Labby tracks the important details of your homelab resources without requiring a large CMDB setup.

- Resource types: Hardware, VM, LXC, App and Network
- Hardware types: Server, Router/Gateway, Switch, Hypervisor, NAS, Backup, PC and more
- Rich metadata: OS, manufacturer, CPU, RAM, disks, notes and links
- NAS/Backup details for shares and RAID groups
- App details with IP, port and web URL
- Status field per resource: Online, Offline or Maintenance
- Optional live checks for IP and URL status
- Copy-to-clipboard buttons for IPs and URLs
- Clickable web URLs directly from cards
- Relationship metadata for hosted resources and connected devices

---

## 🌐 Topology Dashboard

The Topology dashboard is the main working view.

- Search resources by name, IP, port, notes or metadata
- Filter by resource type
- Expand cards inline to see details
- Edit or delete resources from their card actions
- Copy IPs and URLs from the card
- Open web URLs directly
- See hosted VMs/LXCs, connected devices and app relationships
- Empty live/action areas stay hidden when no related data is configured

<img width="1920" height="1080" alt="Labby topology view" src="https://github.com/user-attachments/assets/32db796b-ff68-47ce-a0ca-3d9cbd7d6111" />


### Mobile card actions

On mobile, resource cards are optimized for touch:

- Tap a card to expand details
- Swipe right to edit
- Swipe left to delete with confirmation
- Buttons use mobile-friendly tap targets

---

## 🌳 Relationship Tree & Graph View

### Tree View

- Groups infrastructure by type and hosting relationship
- Shows hardware, guests, apps and networks in a readable hierarchy
- Works on desktop and mobile
- Mobile Tree View is available through the More menu

<img width="1920" height="1080" alt="Labby tree view" src="https://github.com/user-attachments/assets/2c265b47-7073-47fe-aac8-c9eb09351cfd" />


### Graph View

- Desktop-only relationship graph
- Visualizes resources as connected nodes
- Supports zooming and panning on desktop
- Nodes can be selected and edited
- Uses a consistent dialog layout with other desktop views

> Mobile Graph View is currently in development. On mobile, use Tree View for relationship navigation.

---

## 🗄️ Rack View

Labby includes a rack inventory and editor for mapping physical infrastructure.

- Create locations
- Create racks with configurable rack units and size/form factor
- Front and rear rack layouts
- Drag components into rack slots
- Link rack components to existing Labby resources
- Supports 1U, 2U, 3U and 4U rack components, including servers, UPS units, PDUs, KVMs, blank panels, switches, routers, patch panels and cable management
- Context menu for opening, editing and deleting racks
- Rack data is included in normal config export/import

<img width="1920" height="1080" alt="Labby rack editor" src="https://github.com/user-attachments/assets/8ef17f50-3d62-466c-b387-3e2b46ab555c" />

---

## 🌐 IP View

IP View gives a subnet-oriented overview of your used addresses.

- Dedicated IP View showing all used IP addresses
- Sorted by subnet
- Network color coding
- Gateway and subnet awareness
- Port display for apps, for example `192.168.20.21:2283`
- Live search by IP, hostname, resource name or port
- Works with current server-side storage and imported legacy data

---

## 🎨 Themes & UI

Labby has a built-in theme system with classic light themes, dark themes and custom themes.

- Built-in themes: Light, Ocean, Forest, Rose, Solar, Dark, Midnight, Carbon, Nord and Matrix
- Custom theme editor
- Theme color fields for background, panels, text, borders, status colors and resource colors
- Custom themes are stored and included in config export/import
- Active theme is included in exported config and restored on import
- Theme picker and custom editor use a consistent desktop/mobile layout
- On mobile, theme selection uses a dedicated full-screen view

<img width="1920" height="1080" alt="Labby theme picker" src="https://github.com/user-attachments/assets/ba982865-0059-4e52-a73a-793f238acfb5" />

---

## 🤖 Agent API Access

Labby can create scoped API keys for trusted automation and monitoring agents such as Hermes, OpenClaw or custom scripts.

API keys are useful for:

- Reading inventory data
- Creating or updating inventory through automation
- Updating live status from an external monitoring agent
- Running ping checks through the backend
- Synchronizing data from other tools

### API key scopes

Available scopes:

```text
inventory:read
inventory:write
rack:read
rack:write
status:read
status:write
ping:run
config:read
```

### API key expiration

<img width="1920" height="1080" alt="Labby API menu" src="https://github.com/user-attachments/assets/83258d44-8cd0-47d6-8ca1-27f2aea53918" />

Every API key must have an expiration:

- 1 day
- 1 week
- 1 month
- 1 year

Expired keys are rejected by the backend.

### One-time token display

API keys are shown only once when created. Copy the token immediately.

After closing the API Key view, the full token cannot be recovered. Revoke the old key and create a new one if the token is lost.

### API key backup policy

API key records are included in Labby config exports only inside the encrypted secrets bundle.

- The correct export key is required to restore API key records
- Raw one-time API tokens are never exported or shown again
- An already copied token can continue to work after import because its stored key record is restored
- Imported keys still follow their original expiration and enabled state
- Credentials, SSH private keys and API key records use the same encrypted export flow
---

## 🔌 Agent API Endpoints

Agent requests use the API key as a Bearer token:

```http
Authorization: Bearer labby_xxxxxxxxxxxxxxxxx
```

Main endpoints:

```text
GET  /api/agent/inventory
PUT  /api/agent/inventory
GET  /api/agent/status
POST /api/agent/status
POST /api/agent/ping
```

Example agent prompt:

```text
You are an automation agent for my Labby homelab inventory.

Labby base URL: https://your-labby.example.com
API key: <paste the one-time Labby API key here>

Use the API key only in this header:
Authorization: Bearer <API key>

First call GET /api/agent/inventory to read the current inventory.
When creating or updating inventory, preserve existing fields that you do not need to change.
Use PUT /api/agent/inventory only when the key has inventory:write.
Use POST /api/agent/status to update live status when the key has status:write.
Use POST /api/agent/ping only when the key has ping:run.

Never print the API key in logs, messages or reports.
Do not make destructive changes unless I explicitly approve them.
Summarize all planned changes before writing them.
```

---

## 📱 Navigation & UX

### Desktop

Desktop keeps the classic working layout:

- Add/Edit form on the left
- Topology board on the right
- Quick buttons for IP View, Tree View and Rack View
- Dialogs for Config, Themes, API Keys and Rack Editor

### Mobile and tablet

Mobile is designed as a focused app-like layout:

- Bottom navigation:
  - Boards
  - Add
  - Rack
  - IP
  - More
- More menu contains Tree, Config, Themes and other secondary actions
- Add and Edit resources open as full-screen views
- Config, Themes and API Keys use dedicated mobile views
- Inputs use mobile-safe sizing to avoid unwanted browser zoom
- Touch targets are sized for comfortable use
- Rack and Tree views are adjusted for small screens

---

## ⚙️ Config & Data

The Config menu provides manual export/import, encrypted backups, themes, API keys and tutorial actions.

### Manual config export includes

- Resources, metadata and relationships
- Locations and racks
- Agent status values
- Saved command snippets
- Custom themes and the active theme
- Tutorial status
- Backup Config settings and recent backup logs
- Credentials, SSH private keys and API key records inside the encrypted secrets bundle

Backup Config export includes the schedule, retention, selected target and non-secret SMB settings such as server, share, folder, username, domain, port, encryption and guest access.

### Not included in the manual export

- The saved SMB password
- `/data/backup.key`
- Existing `.labbybackup` files
- Raw one-time API tokens

### Import behavior

Import restores the exported resources, racks, themes, command snippets, Agent API key records, Backup Config settings and recent backup logs.

Encrypted credentials and API key records require the export key shown when the file was created. Raw API tokens cannot be displayed or recovered, but an already copied token can continue to work after import while its restored key record is enabled and not expired.

The SMB password must be entered again after import. Existing encrypted `.labbybackup` files still require the original `/data/backup.key`.

Legacy localStorage exports from older Labby versions are also supported.

<img width="1920" height="1080" alt="Labby config menu" src="https://github.com/user-attachments/assets/a284e857-a55c-4c7b-b91e-06180188cabd" />

---

## 🚀 Installation

### Requirements

- Docker
- Docker Compose

### Start

```bash
docker compose up --build -d
```

Open:

```text
http://localhost:8080
```

### Single-container deployment

The included Docker image runs the Labby frontend, nginx reverse proxy and Node.js backend together in one container.

```yaml
services:
  labby:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: labby
    ports:
      - "8080:80"
    environment:
      - DATA_DIR=/data
    volumes:
      - labby-data:/data
    restart: unless-stopped

volumes:
  labby-data:
    driver: local
```

### Built-in local and SMB/NAS backups

Labby can write encrypted `.labbybackup` files either to the local `/data/backups` directory or directly to an SMB/NAS share configured in **Config → Backup Config**.

To configure a network destination:

1. Open **Config → Backup Config**.
2. Select **Direct SMB share** as the storage target.
3. Enter the server name or IP address, share name, optional folder, SMB account, optional domain/workgroup and port. Port `445` is the normal default.
4. Enable **Require SMB encryption** when the server supports encrypted SMB 3 sessions, or enable guest access only for a deliberately anonymous share.
5. Select **Save settings**, then run **Test SMB connection** before enabling the schedule.

The connection test uploads and removes a temporary file. The backup account therefore needs permission to list, create, read and delete files in the selected destination. The Labby container must also be able to resolve and reach the SMB server over the configured port.

The SMB password is encrypted and stored only in the persistent `/data` volume. It is never returned by the API and is not included in configuration exports. Keep `/data/backup.key` in a separate secure backup: encrypted `.labbybackup` files cannot be restored after a complete data-volume loss without that key.

### Stop

```bash
docker compose down
```

> Data is preserved in a Docker volume named `labby-data` and survives container restarts.

---

## 🔄 Update Existing Installation

From your Labby folder:

```bash
cd ~/Labby
git pull
docker compose down
docker compose up --build -d
```

Check running containers:

```bash
docker compose ps
```

Full clean rebuild:

```bash
cd ~/Labby
git pull
docker compose down --remove-orphans
docker compose build --no-cache
docker compose up -d
```

---

## 🔌 Change Port

Edit `docker-compose.yml`:

```yaml
ports:
  - "9090:80"
```

Then restart:

```bash
docker compose up --build -d
```

Open:

```text
http://localhost:9090
```

---

## 🧭 Quick Start

1. ➕ Add **Networks** first with subnet, gateway and color
2. 🖥️ Add **Hardware**, such as router, switch, hypervisor, NAS or backup server
3. 🧱 Add **VMs** and **LXCs**
4. ⚙️ Add **Apps** with IP, port and web URL
5. 🔗 Set hosting relationships, for example VM on Hardware or App on VM/LXC
6. 🌳 Open **Tree View** or **Graph View** to visualize relationships
7. 🗄️ Open **Rack View** and place devices in racks
8. 🌐 Open **IP View** to see all used IPs sorted by subnet
9. 🎨 Pick or create a theme
10. 🤖 Create API keys for trusted automation agents when needed
11. 💾 Use **Export Config** to back up your Labby setup

> **Tip:** Use custom emojis as icons for devices. Great resource: [semo.lol](https://semo.lol/)

---

## 🗂️ Project Structure

```text
app/
  index.html          # UI markup
  styles.css          # Styling, themes, dialogs, mobile layout
  script.js           # App logic, rendering, graph, rack view, mobile nav
  logo.svg            # App logo
  images/             # App images and shared assets

backend/
  server.js           # Express API, JSON file storage, SSH bridge and Agent API
  package.json
  Dockerfile          # Optional backend-only development image

docker/
  start-labby.sh      # Starts backend and nginx inside the combined container

nginx/
  default.conf        # Reverse proxy /api/* to the local backend

Dockerfile            # Combined frontend and backend image
docker-compose.yml    # Single-container deployment
CONTRIBUTING.md       # Contributor notes and code conventions
README.md
```

---

## 🗄️ Data & Backup

Labby stores its persistent application data, encryption key and backup configuration in the Docker volume mounted at `/data`.

### Backup Config

Open:

```text
Config → Backup Config
```

Backup Config creates encrypted `.labbybackup` files and supports:

- Hourly, daily or weekly schedules
- A configurable execution time and weekday
- Local storage under `/data/backups`
- Direct SMB/NAS storage without an additional Docker mount
- A retention limit from 1 to 100 backup files
- Manual backup runs
- Restore and individual delete actions
- Logs for recent backup operations

For a direct SMB destination, configure the server or IP address, share, optional subfolder, username and password, optional domain/workgroup, port and SMB encryption requirement. Use **Test SMB connection** to verify authentication and write access before enabling scheduled backups.

The SMB account should have list, create, read and delete permissions. Labby automatically creates the configured subfolder when the account is allowed to do so.

### Recovery key

All scheduled backups are encrypted with the key stored at:

```text
/data/backup.key
```

Keep a secure copy of this file or back up the complete `labby-data` volume. A remote `.labbybackup` file alone cannot be decrypted after the original `/data` volume has been lost.

### Manual JSON export

For a portable manual snapshot, use:

```text
Config → Export Config
```

The JSON export contains resources, locations, racks, networks, themes, command snippets, Agent API key records, Backup Config settings and recent backup logs. Credentials, SSH private keys and API key records are included only inside the encrypted secrets bundle and require the displayed export key during import.

Backup Config includes the schedule, retention, storage target and non-secret SMB connection settings. The saved SMB password, `/data/backup.key` and existing `.labbybackup` files are not included.


### Full Docker volume backup

A full volume backup preserves Labby's database, backup key and encrypted SMB credential:

```bash
docker run --rm \
  -v labby-data:/data \
  -v "$(pwd)":/backup \
  alpine tar czf /backup/labby-data-backup.tar.gz /data
```

Restore the volume while Labby is stopped:

```bash
docker compose down

docker run --rm \
  -v labby-data:/data \
  -v "$(pwd)":/backup \
  alpine sh -c 'rm -rf /data/* && tar xzf /backup/labby-data-backup.tar.gz -C /'

docker compose up -d
```

---

## 🔐 External Reachability

Labby is an internal administration tool and does **not** include a built-in user login system. If you make Labby reachable from outside your trusted private network, protect it first.

Recommended options:

- Put Labby behind **Cloudflare Access** or a similar identity-aware proxy
- Expose Labby only through a private overlay network such as **Tailscale**
- Use a reverse proxy with strong authentication in front of Labby
- Use HTTPS for any access outside localhost or a fully trusted LAN
- Keep Agent API keys scoped tightly and use short expiration times

Example layouts:

```text
Internet → Cloudflare Access → Reverse Proxy → Labby
```

```text
Your devices → Tailscale Network → Labby
```

Do not publish an unprotected Labby instance directly to the internet. Labby may contain infrastructure details, IP addresses, URLs, encrypted credentials, API-key records and console access.

---

## 🧪 Demo Site

The public demo is available here:

```text
https://www.my-labby.com/
```

The demo version is intentionally different from the self-hosted main version:

- Demo data is saved in the browser only
- Demo entries are seeded automatically
- Demo controls are available for reloading sample data
- The demo banner explains that permanent storage requires self-hosting
- Self-hosting is required for shared storage across browsers/devices

---

## 🤝 Contributing

Labby is intentionally simple to work on:

- Vanilla HTML, CSS and JavaScript
- No frontend framework
- No frontend build step
- Express backend
- JSON storage
- Docker-based deployment

Read `CONTRIBUTING.md` before larger changes.

General rules:

- Keep desktop behavior stable when changing mobile behavior
- Keep mobile changes behind responsive CSS or width checks
- Do not add dependencies unless clearly needed
- Preserve import/export compatibility
- Keep API tokens and raw secrets out of logs, source code and screenshots
- Add clear comments for new complex UI flows

---

## 📝 Notes

- Main/self-hosted Labby stores data server-side
- All browsers and devices connected to the same instance share the same data
- Old localStorage exports from older Labby versions can be imported via **Config → Import Config**
- For multi-user or team setups, run Labby behind a reverse proxy with authentication
- Rack data, command snippets, custom themes, active theme, agent status, Backup Config settings and recent backup logs are included in JSON export/import
- Credentials, SSH private keys and API key records are included only as encrypted secrets when an export key is used
- The SMB password, backup key, backup files and raw API tokens are not included in manual config exports

---

## 📝 License

GNU Affero General Public License v3.0  © [TechByGiusi](https://techbygiusi.com/)
