# Labby
Little Homelabbing documentation tool

Labby is a Dockerized homelab documentation app with a playful card-based UI inspired by mobile dashboard designs.

Track and connect:
- Hardware
- VMs
- Apps
- Networks

## Features

- Visual 3-panel layout (inventory, topology, config)
- Light and dark mode
- Add, edit, delete resources
- Multi-select connection mapping
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
2. Connect them via the **Connections** selector.
3. Browse and filter topology in the center panel.
4. Use **Export Config** for backups.
5. Use **Import Config** to restore a saved topology.
