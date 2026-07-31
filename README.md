# Hosting Portal

Hosting Portal is a self-hosted customer portal for Proxmox environments. It combines service administration, secure user access, automated LXC provisioning and public service publishing in one responsive web interface. The application uses a React frontend, an Express backend and SQLite storage.

## Features

### Administration

- Manage portal users, groups and administrator permissions.
- Connect and manage multiple Proxmox clusters.
- Assign existing virtual machines and containers to users or groups.
- Configure service names, descriptions, tags and access permissions.
- Manage SMTP settings, password resets, maintenance tasks and audit logs.
- Validate required Proxmox API token permissions directly from the portal.

### User Portal

- View assigned services and their current Proxmox status.
- Start, stop, restart and delete services according to the assigned permissions.
- Open service details, task progress and a full-page browser console.
- Store service credentials and management-page access information.
- Change the portal account password from the Settings page.
- Use a responsive interface with English and German translations and light or dark themes.

### Self-Service LXC Provisioning

- Allow users to create LXC containers from approved Proxmox CT archives or prepared LXC templates.
- Create prepared templates as full clones while preserving the configured portal tags.
- Assign the next available VMID and IPv4 address from administrator-defined pools.
- Apply configurable CPU, memory, disk and storage limits.
- Configure hostname, root password, network, gateway and firewall rules during provisioning.
- Show live provisioning progress and automatically clean up completed jobs.

### Public Access

- Publish services through the Pangolin Integration API.
- Create multiple HTTP, TCP and UDP publications for the same service.
- Use configurable port policies for HTTP, TCP and UDP publications.
- Map any internal TCP or UDP service port to a separate administrator-controlled public port.
- Select the backend protocol Pangolin uses to reach an HTTP service.
- Manage public website and management-page links from one service dialog.
- Use a manual public website link when Pangolin publishing is unavailable.

### Wiki

- Provide an administrator-managed knowledge base inside the user portal.
- Organize articles in nested folders and move them between folders with a dedicated drag handle.
- Write English and German Markdown articles with independent publication states.
- Use a full-page editor with formatting tools, split preview and keyboard shortcuts, then return directly to the Wiki administration tab.
- Upload or paste images and control their alignment in an article.
- Keep wiki articles and uploaded images in persistent backend storage.
- Search published articles and automatically fall back to the available language.

### Security

- Encrypt Proxmox API tokens, passwords and stored secrets at rest.
- Restrict actions according to portal roles and assigned service permissions.
- Apply individual isolation rules to newly provisioned containers without changing the global Proxmox datacenter firewall.
- Keep console credentials and backend connection details on the server side.
- Record administrative and user actions in the audit log.
