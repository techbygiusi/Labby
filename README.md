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
- Notes field for every resource
- Multi-select connection mapping
- Network fields: subnet + gateway (required for network entries)
- Network color selector (12 colors) to color-code a subnet
- IP fields for Hardware/VM/LXC
- Hosting mapping: VM/LXC can be assigned to hardware hosts
- Hardware cards show which VM/LXC is running on them
- Cards inherit border color from connected subnet network
- Floating bottom-right **Tree View** button to inspect all created resources and relationships
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

1. Add networks with subnet, gateway, and a color.
2. Add hardware/VM/LXC/app resources and optional notes.
3. Connect resources to networks so subnet color appears on related cards.
4. For VM/LXC resources, set Hosted on hardware.
5. Use **Tree View** (bottom-right) to inspect the full relationship structure.
6. Use **Export Config** for backups and **Import Config** to restore.
