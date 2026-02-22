diff --git a/README.md b/README.md
index 277433c6512666de45fb67e736951dc8046fc4a9..c35f1f0ab1f9ca6a428f32c9e7f126c860dd7d93 100644
--- a/README.md
+++ b/README.md
@@ -1,2 +1,60 @@
 # Labby
-Little Homelabbing documentation tool
+
+Labby is a small Dockerized web app to document your homelab with connected resources:
+- Hardware
+- VMs
+- Apps
+- Networks
+
+## Features
+
+- Clean and responsive UI
+- Light + dark mode
+- Add, edit, and delete resources
+- Link resources together using a multi-select connection picker
+- Search and type filtering
+- Demo dataset loader
+- Import/export topology as JSON
+- Local persistence in browser `localStorage`
+
+## Run with Docker Compose
+
+```bash
+docker compose up --build
+```
+
+Open: `http://localhost:8080`
+
+## Run with Docker
+
+```bash
+docker build -t labby .
+docker run --rm -p 8080:80 labby
+```
+
+## Usage
+
+1. Add your hardware, VMs, apps, and networks.
+2. Use the **Connections** list to link resources.
+3. Use search/filter tools to find items quickly.
+4. Use **Export JSON** for backups and **Import JSON** to restore.
+5. Toggle light/dark mode in the header.
+
+## Notes
+
+- Data is saved in your browser (`localStorage`).
+- If you want data shared across devices, connect this UI to a backend in a later version.
+
+## Push your changes
+
+If your remote still shows only `Initial commit`, push your branch:
+
+```bash
+git push -u origin <your-branch>
+```
+
+Or, if you are working directly on `main`:
+
+```bash
+git push origin main
+```
