# Labby for Unraid

This repository contains the official Unraid Community Applications template for Labby.

## Container image

```text
techbygiusi/labby:1.0.7
```

## Default configuration

- Web interface: host port `8080` to container port `80`
- Persistent data: `/mnt/user/appdata/labby` to `/data`
- Network mode: `bridge`
- Privileged mode: disabled

Labby stores its configuration, resources, encrypted credentials, local backups and backup key in `/data`.

## Links

- Project: https://github.com/techbygiusi/Labby
- Website: https://my-labby.com
- Support: https://github.com/techbygiusi/Labby/issues
- Docker Hub: https://hub.docker.com/r/techbygiusi/labby

## License

Labby is licensed under the GNU Affero General Public License v3.0.
