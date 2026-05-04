> **Disclaimer:** Labby is a vibe-coded project built mainly with Codex from OpenAI and Claude from Anthropic.

# 🧪 Labby - Map Your Homelab

Labby is a lightweight homelab inventory and topology tool with persistent, browser-independent storage.
Track your infrastructure, visualize relationships, and keep everything organized.

<p align="center">
  <a href="https://www.my-labby.com/" target="_blank" rel="noopener noreferrer">
    <img alt="Use it now" src="https://img.shields.io/badge/%F0%9F%9A%80%20Use%20it%20now-Open%20Labby-1F1F1F?style=for-the-badge&labelColor=F6F0E6">
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
    <img width="3840" height="2160" alt="2" src="https://github.com/user-attachments/assets/9503a0df-fbf4-4093-8627-117e6098e369" />
  </tr>
</table>

### Mobile
<table>
  <tr >
    <td width="33%" align="center"><img width="100%" src="https://github.com/user-attachments/assets/5429d9b7-b67c-470d-af13-6e10d2856eb0" /><br/><sub><b>Dashboard</b></sub></td>
    <td width="33%" align="center"><img width="100%" src="https://github.com/user-attachments/assets/b6e9f0cb-9c4b-446b-b6fc-3188958c0921" /><br/><sub><b>IP View</b></sub></td>
    <td width="33%" align="center"><img width="100%" src="https://github.com/user-attachments/assets/764cbc83-0ea4-4306-addd-59ae244583e9" /><br/><sub><b>Config View</b></sub></td>
  </tr>
</table>

---

## ✨ Features

### Core
- 🖥️ **Resource tracking** for Hardware, VMs, LXCs, Apps and Networks
- 🌐 **Topology mapping** with Tree and Graph relationship views
- 🎨 **Light & Dark mode**
- 🧠 **Automatic network matching** by IP/CIDR
- 🗄️ **Persistent server-side storage** data saved in JSON on the backend, accessible from any browser or device

<img width="3840" height="2160" alt="1" src="https://github.com/user-attachments/assets/e119b364-c3fe-408d-a37e-1ae3f30e8435" />

### Resources & Metadata
- 🔧 Rich metadata: OS, Manufacturer, CPU, RAM, Disks, Notes, Links
- 💾 NAS/Backup: Shares and RAID group tracking
- 🟢 **Status field** per resource: Online / Offline / Maintenance
- 📋 **Copy-to-clipboard** for IPs and URLs directly on cards
- 🔗 **Clickable web URLs** open apps directly from their card

<img width="3840" height="2160" alt="4" src="https://github.com/user-attachments/assets/16bd5002-06e5-455c-88eb-c54fe544f6a4" />


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

<img width="3840" height="2160" alt="5" src="https://github.com/user-attachments/assets/fe8a4c7e-cc30-4533-a5af-888c0b3148be" />

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
