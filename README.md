# 🧪 Labby — Map Your Homelab

Labby is a lightweight, browser-based homelab inventory and topology tool.
Track your infrastructure, visualize relationships, and keep everything in one place.

---

## 📸 Screenshots

### Dashboard + Resource Management
<img width="1905" height="941" alt="image" src="https://github.com/user-attachments/assets/fe7726cb-f1a2-4ff3-a883-99731420d019" />
<img width="3816" height="1897" alt="image" src="https://github.com/user-attachments/assets/1199df43-9c30-45ef-9cef-5b56c5faa308" />

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
- 🎯 **Quick add/edit/delete workflow**
- 🎨 **Light & Dark mode**
- 🧠 **Automatic network matching** by IP/CIDR
- 🧾 **Rich metadata support**
  - OS field for Hardware/VM/LXC
  - Manufacturer, CPU, RAM, disks, notes, links, etc.
- 💾 **Backup-friendly storage details**
  - Shares + RAID groups for NAS and Backup hardware types
- 📦 **Export / Import JSON** for backups and migration
- 🔒 **Runs fully client-side** (data in browser `localStorage` unless exported)

---

## 🚀 Installation

## Option 1: Docker Compose (recommended)

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

### Use a different port with Docker Compose

Default mapping in `docker-compose.yml` is:

```yaml
ports:
  - "8080:80"
```

If you want another host port (example `9090`), change it to:

```yaml
ports:
  - "9090:80"
```

Then restart:

```bash
docker compose up --build -d
```

Open: [http://localhost:9090](http://localhost:9090)

---

## Option 2: Docker only

### Requirements
- Docker

### Build image
```bash
docker build -t labby .
```

### Run (default port)
```bash
docker run --rm -d -p 8080:80 --name labby labby
```

Open: [http://localhost:8080](http://localhost:8080)

### Run on another port
Example with host port `9090`:

```bash
docker run --rm -d -p 9090:80 --name labby labby
```

Open: [http://localhost:9090](http://localhost:9090)

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

---

## 🗂️ Project Structure

```text
app/
  index.html      # UI markup
  styles.css      # Styling and layout
  script.js       # App logic, state handling, rendering
Dockerfile
docker-compose.yml
```

---

## 📝 Notes

- Data is local to your browser by default.
- Clearing browser storage removes local data if not exported.
- For shared/team usage, run behind your own reverse proxy + auth.

---

## 📝 License

MIT License  
© [TechByGiusi]([https://onebitlabs.net](https://techbygiusi.com/))
