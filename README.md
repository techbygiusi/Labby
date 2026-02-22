# Labby

Labby is a simple web app to document your homelab.

You can track:
- Hardware
- VMs
- LXCs
- Apps
- Networks

It runs fully in the browser and saves data in `localStorage`.

## Why Labby?

- Clean 3-panel layout (Add Resource, Topology, Config)
- Light and dark mode
- Fast add/edit/delete workflow
- Automatic network matching by IP/CIDR
- Tree View for infrastructure + network relationships
- Export/Import JSON backups

## Installation

### Option 1: Docker Compose (recommended)

**Requirements**
- Docker
- Docker Compose

```bash
docker compose up --build
```

Open: [http://localhost:8080](http://localhost:8080)

To stop:

```bash
docker compose down
```

### Option 2: Docker only

**Requirements**
- Docker

Build image:

```bash
docker build -t labby .
```

Run container:

```bash
docker run --rm -p 8080:80 --name labby labby
```

Open: [http://localhost:8080](http://localhost:8080)

## Quick Start

1. Create one or more **Network** entries (`subnet`, `gateway`, color).
2. Add **Hardware**, **VM**, and **LXC** items with IP addresses.
3. Add **Apps** with `IP + Port` and optional `Web URL`.
4. Set hosting:
   - VM/LXC hosted on Hardware
   - App hosted on VM/LXC
5. Open **Tree View** to inspect infrastructure and network mapping.
6. Use **Export Config** to back up and **Import Config** to restore.

## Notes

- Network links are inferred automatically from IP and subnet (CIDR).
- App URLs are clickable in Tree View.
- Data is browser-local unless exported.
