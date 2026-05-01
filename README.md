> **Disclaimer:** Labby is a vibe-coded project built mainly with Codex from OpenAI and Claude from Anthropic.

# 🧪 Labby - Next Gen | Map Your Homelab

Labby is a lightweight homelab inventory and topology tool with persistent, browser-independent storage.
Track your infrastructure, visualize relationships, and keep everything organized.

---

## 📸 Screenshots

### Desktop
<table>
  <tr>
    <td width="50%"><img width="100%" src="https://github.com/user-attachments/assets/acab3547-1cfe-4494-91a6-9183eaec4673" /><br/><sub><b>Dashboard & Resource Management</b></sub></td>
    <td width="50%"><img width="100%" src="https://github.com/user-attachments/assets/e340406f-5483-41eb-9a66-81dfb055bd2c" /><br/><sub><b>IP View — Subnets & Used IPs</b></sub></td>
  </tr>
</table>

### Mobile
<table>
  <tr>
    <td width="33%" align="center"><img width="100%" src="https://github.com/user-attachments/assets/ff9c2daa-e122-4462-9d8b-377465e23881" /><br/><sub><b>Topology View</b></sub></td>
    <td width="33%" align="center"><img width="100%" src="https://github.com/user-attachments/assets/e83a6ba5-486b-4fcb-a4a9-8205f6fe1971" /><br/><sub><b>Config</b></sub></td>
    <td width="33%" align="center"><img width="100%" src="https://github.com/user-attachments/assets/8d9f54fd-6a4d-46a3-b4d3-8ebbe82ec48d" /><br/><sub><b>Relationship View</b></sub></td>
  </tr>
</table>

---

## ✨ Features

### Core
- 🖥️ **Resource tracking** for Hardware, VMs, LXCs, Apps and Networks
- 🌐 **Topology mapping** with Tree and Graph relationship views
- 🎨 **Light & Dark mode**
- 🧠 **Automatic network matching** by IP/CIDR
- 🗄️ **Persistent server-side storage** — data saved in JSON on the backend, accessible from any browser or device

### Resources & Metadata
- 🔧 Rich metadata: OS, Manufacturer, CPU, RAM, Disks, Notes, Links
- 💾 NAS/Backup: Shares and RAID group tracking
- 🟢 **Status field** per resource: Online / Offline / Maintenance — with colored badge and visual indicator on cards
- 📋 **Copy-to-clipboard** for IPs and URLs directly on cards
- 🔗 **Clickable web URLs** open apps directly from their card

### IP View
- 🌐 Dedicated IP View showing all used IP addresses
- Sorted by subnet with network color coding
- Port display for apps (e.g. `10.20.0.21:2283`)
- Live search by IP, hostname, or port

### Navigation & UX
- 📱 **Mobile & Tablet optimized** — full-screen views for each section via bottom navigation bar
- 🖥️ **Desktop** — classic two-panel layout unchanged
- Bottom nav: Topology / Add / IP View / Tree / Config
- Add and Edit resources open as full-screen panels on mobile

### Config & Data
- **Export / Import JSON** for backups and migration
- Data stored server-side
- Old localStorage exports can be imported directly

---

## 🚀 Installation

### Requirements
- Docker
- Docker Compose

### Start
```bash
docker compose up --build -d
```

Open: [http://localhost:8080](http://localhost:8080)

### Stop
```bash
docker compose down
```

> Data is preserved in a Docker volume (`labby-data`) and survives container restarts.

### Change port

Edit `docker-compose.yml`:
```yaml
ports:
  - "9090:80"
```

Then restart:
```bash
docker compose up --build -d
```

---

## 🧭 Quick Start

1. ➕ Add **Networks** first (subnet, gateway, color)
2. 🖥️ Add **Hardware**, **VMs** and **LXCs**
3. ⚙️ Add **Apps** with IP:Port and Web URL
4. 🔗 Set hosting relationships (VM on Hardware, App on VM/LXC)
5. 🌳 Open **Tree View** or **Graph** to visualize topology
6. 🌐 Open **IP View** to see all used IPs sorted by subnet
7. 💾 Use **Export Config** to back up your data

> **Tip:** Use custom emojis as icons for devices. Great resource: [semo.lol](https://semo.lol/)

---

## 🗂️ Project Structure

```text
app/
  index.html          # UI markup
  styles.css          # Styling and layout
  script.js           # App logic, rendering, mobile nav
backend/
  server.js           # Express API + JSON file storage
  package.json
  Dockerfile
nginx/
  default.conf        # Reverse proxy /api/* to backend
Dockerfile            # Frontend (nginx)
docker-compose.yml
```

---

## 🗄️ Data & Backup

All data is stored in a JSON file inside a named Docker volume (`labby-data`).

**Create a backup:**
```bash
docker run --rm \
  -v labby-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/labby-backup.tar.gz /data
```

**Restore from backup:**
```bash
docker run --rm \
  -v labby-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/labby-backup.tar.gz -C /
```

---

## 📝 Notes

- Data is stored server-side. All browsers and devices share the same data
- Old localStorage exports (from pre-Next Gen versions) can be imported via Config → Import Config
- For multi-user or team setups, consider running behind a reverse proxy with authentication

---

## 📝 License

MIT License  
© [TechByGiusi](https://techbygiusi.com/)
