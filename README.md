# 🧪 Labby - Live Demo

This branch powers the static landing page and browser-only demo at **[my-labby.com](https://www.my-labby.com/)**.

For the full project, documentation and self-hosting instructions visit the [main branch](https://github.com/techbygiusi/Labby).

---

## Public demo safety

The public demo is browser-only. CLI/SSH and Agent API are disabled in the public demo even when credentials, IP addresses or visual API keys are entered. The Console shows a static safety message and demo API keys are placeholders only. Backup Config is available as a read-only preview; real backup runs, SMB connection tests, restore and delete actions require the self-hosted Main version.

## Backup documentation

The self-hosted version can write encrypted backups to `/data/backups` or connect directly to an SMB/NAS share from inside the Labby container. No `/config-backup` bind mount or host-side CIFS mount is required. The complete setup, permissions, retention and recovery-key notes are documented in the **Data & Backup** page of the website wiki.

## 📝 License

GNU Affero General Public License v3.0  © [TechByGiusi](https://techbygiusi.com/)
