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
      <img width="1920" height="1080" alt="Labby topology dashboard" src="https://github.com/user-attachments/assets/1df3a23b-14ce-4a67-ae5a-73d48adb2237" />
      <br/>
      <sub><b>Topology Dashboard</b></sub>
    </td>
  </tr>
</table>

### Mobile

<table>
  <tr>
    <td width="33%" align="center">
      <img alt="Labby mobile dashboard" src="https://github.com/user-attachments/assets/a485c373-dc5b-4a66-af78-461450831d90" />
      <br/>
      <sub><b>Dashboard</b></sub>
    </td>
    <td width="33%" align="center">
      <img alt="Labby mobile IP view" src="https://github.com/user-attachments/assets/4e8b2eb8-bde8-4cd4-aad2-e898a72c8b43" />
      <br/>
      <sub><b>IP View</b></sub>
    </td>
    <td width="33%" align="center">
      <img alt="Labby mobile config" src="https://github.com/user-attachments/assets/dcb54b1a-d0f5-4cc0-9431-4c180b761c20" />
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

<img width="1920" height="1080" alt="Labby graph view" src="https://github.com/user-attachments/assets/7b72df1e-aae7-4409-b650-93be698d7cf6" />

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

### Mobile card actions

On mobile, resource cards are optimized for touch:

- Tap a card to expand details
- Swipe right to edit
- Swipe left to delete with confirmation
- Buttons use mobile-friendly tap targets

---

## 🌳 Tree & Graph View

### Tree View

- Groups infrastructure by type and hosting relationship
- Shows hardware, guests, apps and networks in a readable hierarchy
- Works on desktop and mobile
- Mobile Tree View is available through the More menu

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
- Supports servers, switches, routers, patch panels, cable management, UPS, PDU, KVM and blank panels
- Context menu for opening, editing and deleting racks
- Rack data is included in normal config export/import

### Desktop Rack View

Desktop Rack View is designed as a workspace:

- Location and rack overview
- Fast rack selection
- Open Rack Editor from the rack overview
- Front and rear rack grids shown side by side in the editor
- Component palette available in the editor

### Mobile Rack View

Mobile Rack View is touch optimized:

- Dedicated Rack tab in bottom navigation
- Front/Rear switching
- Floating component picker
- Component picker opens only when needed
- Rack can be scrolled and managed on smaller screens

<img width="1920" height="1080" alt="Labby rack editor" src="https://github.com/user-attachments/assets/056a501e-fbe8-4504-b427-f61896576c03" />

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

<img width="1920" height="1080" alt="Labby theme picker" src="https://github.com/user-attachments/assets/a1ba0df4-9a7c-457c-b060-487ec7b9e6a5" />

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

<img alt="labby-api-key" src="https://github.com/user-attachments/assets/67c854d4-a935-4871-bcfd-aa2d14101c99" />

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

API key records are included in Labby config exports only inside the encrypted secrets bundle. Full one-time tokens are never exported as readable plain text.

- API key records are exported only encrypted
- API key records are restored only when the correct export key is provided during import
- One-time API tokens cannot be recovered from an export
- Credentials, SSH private keys and API-key metadata share the same encrypted export flow

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

The Config menu contains backup, import/export, customization, API keys and tutorial actions.

### Export includes

```text
items
locations
racks
agentStatus
customThemes
activeTheme
tutorialSeen
```

### Export excludes

```text
agentKeys
```

API keys are deliberately excluded and cannot be exported or imported.

### Import restores

- Resources
- Locations
- Racks
- Agent status values
- Custom themes
- Active theme
- Tutorial status
- Legacy localStorage exports

<img width="1920" height="1080" alt="Labby config" src="https://github.com/user-attachments/assets/a81a9cdc-a2d8-42db-a9d7-4fbdc64f5aa6" />

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
  server.js           # Express API, JSON file storage and Agent API
  package.json
  Dockerfile

nginx/
  default.conf        # Reverse proxy /api/* to backend

Dockerfile            # Frontend nginx container
docker-compose.yml
CONTRIBUTING.md       # Contributor notes and code conventions
README.md
```

---

## 🗄️ Data & Backup

All data is stored in a JSON file inside a named Docker volume:

```text
labby-data
```

### Create a Docker volume backup

```bash
docker run --rm \
  -v labby-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/labby-backup.tar.gz /data
```

### Restore from backup

```bash
docker run --rm \
  -v labby-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/labby-backup.tar.gz -C /
```

### App-level backup

Inside Labby:

```text
Config → Export Config
```

This exports a JSON file containing resources, locations, racks, agent status values, custom themes and the active theme. If saved credentials or API key records exist, they are included only in the encrypted secrets bundle and require the export key during import.

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
- Rack data, custom themes, active theme and agent status are included in JSON export/import
- API key records and credentials are included in JSON export/import only as encrypted secrets when an export key is used

---

## 📄 License

MIT License  
© [TechByGiusi](https://techbygiusi.com/)


## Backup Config and SMB target

Labby can create encrypted configuration backups from **Config → Backup Config**. Local backups are written below the Labby data volume. To offer an SMB/NAS location in the UI, mount a host folder into the backend container as `/config-backup`.

Example `docker-compose.yml` volume section:

```yaml
services:
  backend:
    volumes:
      - ./data:/data
      - /mnt/your-smb-share/labby-backups:/config-backup
```

Mount the SMB share on the Docker host first, then bind that mounted path into the container. The container path must be exactly `/config-backup`; Labby detects it automatically and shows it as the SMB backup target. Backups are encrypted with a key stored in the Labby data volume and should be restored from **Config → Backup Config**.


### Backup Config export/import

The regular **Config → Export Config** JSON export also includes the Backup Config schedule and recent backup logs. Importing a Labby JSON config restores those Backup Config settings together with the normal map, racks, command snippets and UI configuration. Encrypted `.labbybackup` files themselves are not embedded in the JSON export; restore those from the Backup Config screen so the server-side key in the Labby data volume can decrypt them.
