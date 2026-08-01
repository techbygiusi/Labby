# Labby for Unraid

This directory provides the official Unraid Community Applications template for Labby.

## Container

- Image: `techbygiusi/labby:1.0.6`
- Web interface: container port `80`, default host port `8080`
- Persistent data: `/mnt/user/appdata/labby` mapped to `/data`
- Network mode: `bridge`
- Privileged mode: disabled

After installation, open the Labby WebUI from the Unraid Docker page.

## Persistent data

Keep the `/data` mapping when updating or recreating the container. It contains the Labby configuration, resources, encrypted SMB credentials, local backups and the backup encryption key.

## Support

Report template or application issues in the Labby GitHub repository:

`https://github.com/techbygiusi/Labby/issues`
