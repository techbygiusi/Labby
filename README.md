# 🧪 Labby - Live Demo

This branch powers the static landing page and browser-only demo at **[my-labby.com](https://www.my-labby.com/)**.

For the full project, documentation and self-hosting instructions visit the [main branch](https://github.com/techbygiusi/Labby).

---

## Public demo safety

The public demo is browser-only. CLI/SSH and Agent API are disabled in the public demo even when credentials, IP addresses or visual API keys are entered. The Console shows a static safety message and demo API keys are placeholders only. Use the self-hosted Main version for real SSH sessions and real automation API access.

## 📝 License

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
