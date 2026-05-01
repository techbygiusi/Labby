> **Disclaimer:** Labby is a vibe-coded project built mainly with Codex from OpenAI.

# 🧪 Labby - Map Your Homelab

Labby is a lightweight homelab inventory and topology tool.
Track your infrastructure, visualize relationships, and keep everything in one place.

<p align="center">
  <a href="https://www.my-labby.com/" target="_blank" rel="noopener noreferrer">
    <img alt="Use it now" src="https://img.shields.io/badge/%F0%9F%9A%80%20Use%20it%20now-Open%20Labby-1F1F1F?style=for-the-badge&labelColor=F6F0E6">
  </a>
</p>

> **P.S.:** I'm looking for someone to design a nice logo for the application. If you're interested (or know someone), please reach out.

---

## 📸 Screenshots

### Dashboard + Resource Management
<img width="3830" height="1893" alt="image" src="https://github.com/user-attachments/assets/b99c4fbd-8d37-4199-bc6f-5287f1dd298a" />
<img width="3833" height="1895" alt="image" src="https://github.com/user-attachments/assets/b2e3c69d-cc18-4a43-ac25-593687687592" />

### Tree / Graph Relationship View
<img width="2605" height="1387" alt="image" src="https://github.com/user-attachments/assets/2a70cbf9-b77c-46ec-b4a4-2251a32b6f20" />
<img width="2607" height="1303" alt="image" src="https://github.com/user-attachments/assets/c099fa0c-1f15-4354-87ed-6c4b5109570f" />

---

## ✨ Features

- 🖥️ **Resource tracking** for:
  - Hardware
  - VMs
  - LXCs
  - Apps
  - Networks
- 🌐 **Topology mapping** with relationship Tree and Graph views
- 🎨 **Light & Dark mode**
- 🧠 **Automatic network matching** by IP/CIDR
- 🧾 **Rich metadata support**
  - OS field for Hardware/VM/LXC
  - Manufacturer, CPU, RAM, disks, notes, links, etc.
- 💾 **Backup-friendly storage details**
  - Shares + RAID groups for NAS and Backup hardware types
- 📦 **Export / Import JSON** for backups and migration
- 🗄️ **Persistent storage** — data is saved server-side in SQLite, accessible from any browser

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

### Use a different port

Default mapping in `docker-compose.yml` is:

```yaml
ports:
  - "8080:80"
```

Change to your preferred port (e.g. `9090`):

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

1. ➕ Add one or more **Networks** (subnet, gateway, color).
2. 🖥️ Add **Hardware**, **VM**, and **LXC** resources.
3. ⚙️ Add **Apps** with `IP:Port` and optional Web URL.
4. 🔗 Define hosting relationships:
   - VM/LXC hosted on Hardware
   - App hosted on VM/LXC
5. 🌳 Open **Tree View** and switch to **Graph** for topology checks.
6. 💾 Use **Export Config** to back up, **Import Config** to restore.

> **P.S.:** Want your **Graph View** to look extra clean? Try assigning custom icons per device. If you're hunting for matching emojis, I recommend [semo.lol](https://semo.lol/).

---

## 🗂️ Project Structure

```text
app/
  index.html          # UI markup
  styles.css          # Styling and layout
  script.js           # App logic, state handling, rendering
backend/
  server.js           # Express API + SQLite storage
  package.json
  Dockerfile
nginx/
  default.conf        # Reverse proxy /api/* to backend
Dockerfile
docker-compose.yml
```

---

## 🗄️ Data & Backup

All data is stored in a SQLite database inside a named Docker volume (`labby-data`).

To create a backup:

```bash
docker run --rm \
  -v labby-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/labby-backup.tar.gz /data
```

To restore:

```bash
docker run --rm \
  -v labby-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/labby-backup.tar.gz -C /
```

---

## 📝 Notes

- Data is stored server-side — all browsers and devices share the same data.
- For team or multi-user setups, run behind a reverse proxy with authentication.

---

## 📝 License

MIT License  
© [TechByGiusi](https://techbygiusi.com/)
