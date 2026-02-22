# Labby

Labby is a Dockerized homelab documentation app with a playful card-based UI.

Track and connect:
- Hardware
- VMs
- LXCs
- Apps
- Networks

## Features

- Visual 3-panel layout (inventory, topology, config)
- Light/dark mode (dark uses high-contrast neon-green accents)
- Add, edit, delete resources
- Multi-select connection mapping
- Network fields: subnet + gateway (required for network entries)
- IP fields for Hardware/VM/LXC
- Hosting mapping: VM/LXC can be assigned to hardware hosts
- Hardware cards show which VM/LXC is running on them
- Search + filter
- **Export Config** / **Import Config** (JSON)
- Local browser persistence via `localStorage`

## Run with Docker Compose

```bash
docker compose up --build
```

Open: `http://localhost:8080`

## Run with Docker

```bash
docker build -t labby .
docker run --rm -p 8080:80 labby
```

## Usage

1. Add resources from the left panel.
2. For network resources, fill subnet and gateway.
3. For VM/LXC resources, set Hosted on hardware.
4. Use topology filters/search in the center panel.
5. Use **Export Config** for backups and **Import Config** to restore.
