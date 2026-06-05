> **Disclaimer:** Labby is a vibe-coded project built mainly with Codex from OpenAI and Claude from Anthropic.

# 🧪 Labby - Map Your Homelab

Labby is a lightweight homelab inventory, rack and topology tool with persistent, browser-independent storage.

Track your hardware, VMs, LXCs, apps, networks, rack layouts and relationships in one clean dashboard.  
Self-host it with Docker and keep your homelab map available from every browser and device.

<p align="center">
  <a href="https://www.my-labby.com/" target="_blank" rel="noopener noreferrer">
    <img alt="Test it now" src="https://img.shields.io/badge/%F0%9F%9A%80%20Use%20it%20now-Open%20Labby-1F1F1F?style=for-the-badge&labelColor=F6F0E6">
  </a>
</p>

<p align="center">
  <sub>⚠️ Demo site. Changes are saved in your browser only. Self-host Labby for permanent storage.</sub>
</p>

---

## 📸 Screenshots

### Desktop

<table>
  <tr>
    <td align="center">
      <img width="1920" height="1080" alt="labby-topology" src="https://github.com/user-attachments/assets/1df3a23b-14ce-4a67-ae5a-73d48adb2237" />
      <br/>
      <sub><b>Dashboard</b></sub>
    </td>
  </tr>
</table>

### Mobile

<table>
  <tr>
    <td width="33%" align="center">
      <img alt="labby-mobile-startscreen" src="https://github.com/user-attachments/assets/a485c373-dc5b-4a66-af78-461450831d90" />
      <br/>
      <sub><b>Dashboard</b></sub>
    </td>
    <td width="33%" align="center">
      <img alt="labby-mobile-ip-view" src="https://github.com/user-attachments/assets/4e8b2eb8-bde8-4cd4-aad2-e898a72c8b43" />
      <br/>
      <sub><b>IP View</b></sub>
    </td>
    <td width="33%" align="center">
      <img alt="labby-mobile-config" src="https://github.com/user-attachments/assets/dcb54b1a-d0f5-4cc0-9431-4c180b761c20" />
      <br/>
      <sub><b>Config View</b></sub>
    </td>
  </tr>
</table>

---

## ✨ Features

### Core

- 🖥️ **Resource tracking** for Hardware, VMs, LXCs, Apps and Networks
- 🌐 **Topology mapping** with Tree and Graph relationship views
- 🗄️ **Rack View** with locations, racks, front/rear rack layouts and device linking
- 🎨 **Theme system** with multiple built-in themes and custom theme editor
- 🧠 **Automatic network matching** by IP/CIDR
- 🧭 **Config tutorial** built directly into the Config dialog
- 🗄️ **Persistent server-side storage** saved in JSON on the backend and shared across browsers/devices

<img width="3840" height="2160" alt="Labby" src="https://github.com/user-attachments/assets/00ac2519-b25b-447f-bc51-a2aab0a66cfe" />

---

### Resources & Metadata

- 🔧 Rich metadata: OS, Manufacturer, CPU, RAM, Disks, Notes and Links
- 🧩 Hardware types: Server, Router/Gateway, Switch, Hypervisor, NAS, Backup, PC and more
- 💾 NAS/Backup tracking for Shares and RAID groups
- 🟢 **Status field** per resource: Online / Offline / Maintenance
- 📡 Optional live checks for IP and URL status
- 📋 **Copy-to-clipboard** for IPs and URLs directly on cards
- 🔗 **Clickable web URLs** open apps and devices directly from their card
- 🧷 Relationship metadata for hosted resources and connected devices

<img width="1920" height="1080" alt="labby-graph-view" src="https://github.com/user-attachments/assets/7b72df1e-aae7-4409-b650-93be698d7cf6" />

---

### Relationship Tree & Graph View

- 🌳 **Tree View** groups infrastructure by type and hosting relationship
- 🕸️ **Graph View** visualizes relationships as connected bubbles
- 🔎 Graph View auto-zooms and centers on the main component cluster
- 🏷️ Graph nodes show names permanently below the bubble
- ✏️ Hovering a Graph node shows **Edit**
- 🖱️ Clicking a Graph node opens that resource for editing
- 📐 IP View, Tree View and Graph View use consistent dialog sizing

---

### Rack View

- 🗄️ Create locations and racks
- 📏 Configure rack height units and form factor
- 🔁 Front and rear rack layout views
- 🧲 Drag rack components into rack slots
- 🔗 Link rack components to existing Labby resources
- 🖥️ Supports servers, switches, routers, patch panels, cable management, UPS, PDU, KVM and blank panels
- 🧰 Context menu for opening, editing and deleting racks
- 💾 Rack data is included in import/export backups

<img width="1920" height="1080" alt="Screenshot 2026-06-04 121558" src="https://github.com/user-attachments/assets/056a501e-fbe8-4504-b427-f61896576c03" />

---

### IP View

- 🌐 Dedicated IP View showing all used IP addresses
- Sorted by subnet with network color coding
- Gateway and subnet awareness
- Port display for apps, for example `192.168.20.21:2283`
- Live search by IP, hostname or port
- Works with imported legacy data and current server-side storage

---

### Themes & UI

- 🎨 Built-in themes such as Light, Ocean, Forest, Rose, Solar, Dark, Midnight, Carbon, Nord and Grape
- 🧪 Custom theme editor
- 💾 Custom themes are stored and included in config export/import
- 🧭 Saving a custom theme returns to the Themes tab
- 🖼️ Theme picker and custom editor use a consistent dialog layout
- 📦 Active theme is included in exported config and restored on import

<img width="1920" height="1080" alt="Screenshot 2026-06-04 121533" src="https://github.com/user-attachments/assets/a1ba0df4-9a7c-457c-b060-487ec7b9e6a5" />

---

### Navigation & UX

- 📱 **Mobile & Tablet optimized** with full-screen views
- 🖥️ **Desktop** keeps the classic two-panel layout
- Bottom navigation on mobile/tablet:
  - Topology
  - Add
  - IP View
  - Tree
  - Config
- Add and Edit resources open as full-screen panels on mobile
- Dialogs and overlays are tuned so hidden views do not block taps
- Desktop quick buttons for IP View, Tree View and Rack View

---

### Config & Data

- 💾 **Export / Import JSON** for backups and migration
- 🧩 Export includes:
  - Resources
  - Locations
  - Racks
  - Custom themes
  - Active theme
- 🔁 Import restores the full Labby setup
- 🗄️ Data stored server-side in the main self-hosted version
- 📦 Old localStorage exports can be imported directly

<img width="1920" height="1080" alt="labby-config" src="https://github.com/user-attachments/assets/a81a9cdc-a2d8-42db-a9d7-4fbdc64f5aa6" />

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
4. ⚙️ Add **Apps** with IP:Port and Web URL
5. 🔗 Set hosting relationships, for example VM on Hardware or App on VM/LXC
6. 🌳 Open **Tree View** or **Graph View** to visualize topology
7. 🗄️ Open **Rack View** and place devices in racks
8. 🌐 Open **IP View** to see all used IPs sorted by subnet
9. 🎨 Pick or create a theme
10. 💾 Use **Export Config** to back up your full setup

> **Tip:** Use custom emojis as icons for devices. Great resource: [semo.lol](https://semo.lol/)

---

## 🗂️ Project Structure

```text
app/
  index.html          # UI markup
  styles.css          # Styling, themes, dialogs, mobile layout
  script.js           # App logic, rendering, graph, rack view, mobile nav

backend/
  server.js           # Express API + JSON file storage
  package.json
  Dockerfile

nginx/
  default.conf        # Reverse proxy /api/* to backend

Dockerfile            # Frontend nginx container
docker-compose.yml
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

This exports a JSON file containing resources, locations, racks, custom themes and the active theme.

---

## 🧪 Demo Site

The public demo is available here:

```text
https://www.my-labby.com/
```

The demo version is intentionally different from the self-hosted main version:

- Demo data is saved in the browser only
- Demo entries are seeded automatically
- The tutorial opens automatically on demo load
- Self-hosting is required for permanent shared storage

---

## 📝 Notes

- Main/self-hosted Labby stores data server-side
- All browsers and devices connected to the same instance share the same data
- Old localStorage exports from older Labby versions can be imported via **Config → Import Config**
- For multi-user or team setups, run Labby behind a reverse proxy with authentication
- Rack data, custom themes and active theme are included in JSON export/import

---

## 📝 License

MIT License  
© [TechByGiusi](https://techbygiusi.com/)

