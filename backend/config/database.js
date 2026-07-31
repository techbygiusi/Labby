const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/hosting.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db = null;

/**
 * Get or create database connection
 */
function getDatabase() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('Database connection established');
      }
    });
    
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');
  }
  return db;
}

/**
 * Initialize database with all required tables
 */
async function initDatabase() {
  return new Promise((resolve, reject) => {
    const database = getDatabase();

    database.serialize(() => {
      // Users table
      database.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
          preferred_language TEXT DEFAULT 'en',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Customer Groups table
      database.run(`
        CREATE TABLE IF NOT EXISTS customer_groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // User to Group mapping
      database.run(`
        CREATE TABLE IF NOT EXISTS user_groups (
          user_id INTEGER NOT NULL,
          group_id INTEGER NOT NULL,
          PRIMARY KEY (user_id, group_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (group_id) REFERENCES customer_groups(id) ON DELETE CASCADE
        )
      `);

      // Proxmox Clusters
      database.run(`
        CREATE TABLE IF NOT EXISTS proxmox_clusters (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          url TEXT NOT NULL,
          api_token TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Container Assignments
      database.run(`
        CREATE TABLE IF NOT EXISTS container_assignments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          container_id TEXT NOT NULL,
          cluster_id INTEGER NOT NULL,
          assigned_to_type TEXT NOT NULL CHECK(assigned_to_type IN ('group', 'user')),
          assigned_to_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (cluster_id) REFERENCES proxmox_clusters(id) ON DELETE CASCADE
        )
      `);



      // v3.1.80: Wiki - admin-curated folder structure with multi-language articles.
      // Folders form a tree via parent_id; titles live in the translation tables so
      // the same structure can be presented in every portal language.
      database.run(`
        CREATE TABLE IF NOT EXISTS wiki_folders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          parent_id INTEGER,
          slug TEXT NOT NULL,
          position INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_id) REFERENCES wiki_folders(id) ON DELETE CASCADE
        )
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS wiki_folder_translations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          folder_id INTEGER NOT NULL,
          language TEXT NOT NULL,
          title TEXT NOT NULL,
          UNIQUE (folder_id, language),
          FOREIGN KEY (folder_id) REFERENCES wiki_folders(id) ON DELETE CASCADE
        )
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS wiki_articles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          folder_id INTEGER,
          slug TEXT NOT NULL UNIQUE,
          position INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_by INTEGER,
          FOREIGN KEY (folder_id) REFERENCES wiki_folders(id) ON DELETE SET NULL,
          FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
        )
      `);

      // One row per language. is_published is per language so an article can go
      // live in English while its German translation is still being written.
      database.run(`
        CREATE TABLE IF NOT EXISTS wiki_article_translations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          article_id INTEGER NOT NULL,
          language TEXT NOT NULL,
          title TEXT NOT NULL,
          summary TEXT,
          body TEXT DEFAULT '',
          format TEXT DEFAULT 'markdown' CHECK(format IN ('markdown', 'text')),
          is_published INTEGER DEFAULT 0,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (article_id, language),
          FOREIGN KEY (article_id) REFERENCES wiki_articles(id) ON DELETE CASCADE
        )
      `);

      // Uploaded screenshots/images. token is an unguessable public identifier so
      // <img> tags inside rendered articles can load without an auth header.
      database.run(`
        CREATE TABLE IF NOT EXISTS wiki_images (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          token TEXT NOT NULL UNIQUE,
          filename TEXT NOT NULL,
          original_name TEXT,
          mime_type TEXT NOT NULL,
          byte_size INTEGER DEFAULT 0,
          uploaded_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
        )
      `);

      database.run(`CREATE INDEX IF NOT EXISTS idx_wiki_folders_parent ON wiki_folders(parent_id)`, () => {});
      database.run(`CREATE INDEX IF NOT EXISTS idx_wiki_articles_folder ON wiki_articles(folder_id)`, () => {});
      database.run(`CREATE INDEX IF NOT EXISTS idx_wiki_article_tr ON wiki_article_translations(article_id, language)`, () => {});

      // v3.1.89: the wiki is Markdown-only. Convert translations still stored as
      // plain text, otherwise they would keep rendering their Markdown literally
      // with no way to change the format in the UI. Idempotent.
      database.run(`UPDATE wiki_article_translations SET format = 'markdown' WHERE format != 'markdown'`, () => {});

      // Managed resources shown in the portal
      database.run(`
        CREATE TABLE IF NOT EXISTS resources (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          container_id TEXT NOT NULL,
          cluster_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          web_url TEXT,
          public_url TEXT,
          admin_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (cluster_id) REFERENCES proxmox_clusters(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      database.run(`ALTER TABLE resources ADD COLUMN public_url TEXT`, () => {});
      database.run(`ALTER TABLE resources ADD COLUMN admin_url TEXT`, () => {});
      // v3.1.61: user-managed fallback website link when Pangolin publishing is unavailable.
      database.run(`ALTER TABLE resources ADD COLUMN manual_public_url TEXT`, () => {});
      // v3.1.62: manually configured service IP and SSH port for guests whose
      // address cannot be discovered through the Proxmox guest agent.
      database.run(`ALTER TABLE resources ADD COLUMN manual_ip TEXT`, () => {});
      database.run(`ALTER TABLE resources ADD COLUMN ssh_port INTEGER DEFAULT 22`, () => {});
      // v3.1.63: remember the Proxmox resource type so manual IP eligibility
      // remains restricted to administrator-assigned QEMU VMs.
      database.run(`ALTER TABLE resources ADD COLUMN resource_type TEXT`, () => {});

      // v2.0: shared access via groups (owner stays user_id, group_id grants shared access)
      database.run(`ALTER TABLE resources ADD COLUMN group_id INTEGER REFERENCES customer_groups(id) ON DELETE SET NULL`, () => {});

      // v2.0: provisioning configuration per cluster
      database.run(`ALTER TABLE proxmox_clusters ADD COLUMN allow_provisioning INTEGER DEFAULT 0`, () => {});
      // v3.1.43: Pangolin publishing can be controlled independently per cluster.
      // Existing clusters stay enabled during migration.
      database.run(`ALTER TABLE proxmox_clusters ADD COLUMN allow_publishing INTEGER DEFAULT 1`, () => {});
      // v3.1: optional geo location for cluster dashboard map
      database.run(`ALTER TABLE proxmox_clusters ADD COLUMN location_label TEXT`, () => {});
      database.run(`ALTER TABLE proxmox_clusters ADD COLUMN location_lat REAL`, () => {});
      database.run(`ALTER TABLE proxmox_clusters ADD COLUMN location_lon REAL`, () => {});
      database.run(`ALTER TABLE proxmox_clusters ADD COLUMN vmid_min INTEGER`, () => {});
      database.run(`ALTER TABLE proxmox_clusters ADD COLUMN vmid_max INTEGER`, () => {});
      database.run(`ALTER TABLE proxmox_clusters ADD COLUMN ip_start TEXT`, () => {});
      database.run(`ALTER TABLE proxmox_clusters ADD COLUMN ip_end TEXT`, () => {});
      database.run(`ALTER TABLE proxmox_clusters ADD COLUMN ip_prefix INTEGER DEFAULT 24`, () => {});
      database.run(`ALTER TABLE proxmox_clusters ADD COLUMN gateway TEXT`, () => {});
      database.run(`ALTER TABLE proxmox_clusters ADD COLUMN bridge TEXT DEFAULT 'vmbr0'`, () => {});
      database.run(`ALTER TABLE proxmox_clusters ADD COLUMN storage TEXT DEFAULT 'local'`, () => {});
      database.run(`ALTER TABLE proxmox_clusters ADD COLUMN template_storage TEXT DEFAULT 'local'`, () => {});
      database.run(`ALTER TABLE proxmox_clusters ADD COLUMN max_cores INTEGER DEFAULT 2`, () => {});
      database.run(`ALTER TABLE proxmox_clusters ADD COLUMN max_memory_mb INTEGER DEFAULT 2048`, () => {});
      database.run(`ALTER TABLE proxmox_clusters ADD COLUMN max_disk_gb INTEGER DEFAULT 20`, () => {});
      // v2.1: which resource types may be self-service provisioned: 'ct', 'vm', or 'both'
      database.run(`ALTER TABLE proxmox_clusters ADD COLUMN allow_types TEXT DEFAULT 'ct'`, () => {});
      // v2.1: ISO storage for VM provisioning
      database.run(`ALTER TABLE proxmox_clusters ADD COLUMN iso_storage TEXT DEFAULT 'local'`, () => {});
      // v2.3: admin-selected templates/ISOs users may choose from (JSON arrays of volids)
      database.run(`ALTER TABLE proxmox_clusters ADD COLUMN allowed_templates TEXT`, () => {});
      database.run(`ALTER TABLE proxmox_clusters ADD COLUMN allowed_isos TEXT`, () => {});
      // v2.1: default root password stored (encrypted) for newly provisioned machines
      database.run(`ALTER TABLE proxmox_clusters ADD COLUMN default_password_encrypted TEXT`, () => {});

      // v2.1: admin-managed credential vault (cluster default logins + free entries)
      database.run(`
        CREATE TABLE IF NOT EXISTS admin_credentials (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          label TEXT NOT NULL,
          username TEXT,
          secret_encrypted TEXT,
          url TEXT,
          notes TEXT,
          cluster_id INTEGER,
          user_id INTEGER,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (cluster_id) REFERENCES proxmox_clusters(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // v2.0: encrypted credentials attached to resources
      database.run(`
        CREATE TABLE IF NOT EXISTS resource_credentials (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          resource_id INTEGER NOT NULL,
          label TEXT NOT NULL,
          username TEXT,
          secret_encrypted TEXT,
          url TEXT,
          notes TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
        )
      `);

      // v2.2: track whether a resource credential was added by admin or user
      database.run(`ALTER TABLE resource_credentials ADD COLUMN created_by_role TEXT DEFAULT 'user'`, () => {});
      // v2.6: shared credential slot for the management/admin page of a resource
      database.run(`ALTER TABLE resource_credentials ADD COLUMN purpose TEXT DEFAULT 'general'`, () => {});
      database.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_resource_management_credential ON resource_credentials(resource_id, purpose) WHERE purpose = 'management'`, () => {});

      // v2.0: audit log
      database.run(`
        CREATE TABLE IF NOT EXISTS audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          user_email TEXT,
          action TEXT NOT NULL,
          target TEXT,
          details TEXT,
          ip TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // v2.0: IPs allocated via self-service provisioning
      database.run(`
        CREATE TABLE IF NOT EXISTS provisioned_machines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cluster_id INTEGER NOT NULL,
          vmid INTEGER NOT NULL,
          ip TEXT,
          hostname TEXT,
          source_template TEXT,
          user_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (cluster_id) REFERENCES proxmox_clusters(id) ON DELETE CASCADE
        )
      `);
      // v3.1.55: remember the exact LXC template used by self-service provisioning
      database.run(`ALTER TABLE provisioned_machines ADD COLUMN source_template TEXT`, () => {});

      // v3.1.71: administrator-managed template catalog per Proxmox cluster.
      database.run(`
        CREATE TABLE IF NOT EXISTS template_profiles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cluster_id INTEGER NOT NULL,
          volid TEXT NOT NULL,
          storage TEXT,
          display_name TEXT NOT NULL,
          os_family TEXT,
          os_version TEXT,
          profile_type TEXT NOT NULL DEFAULT 'base' CHECK(profile_type IN ('base', 'docker', 'nginx', 'custom')),
          description TEXT,
          tags TEXT,
          enabled INTEGER NOT NULL DEFAULT 0,
          present INTEGER NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(cluster_id, volid),
          FOREIGN KEY (cluster_id) REFERENCES proxmox_clusters(id) ON DELETE CASCADE
        )
      `);
      database.run(`CREATE INDEX IF NOT EXISTS idx_template_profiles_cluster ON template_profiles(cluster_id, enabled, present)`, () => {});
      // v3.1.73: distinguish normal CT archives from prepared Proxmox LXC templates.
      database.run(`ALTER TABLE template_profiles ADD COLUMN source_type TEXT NOT NULL DEFAULT 'archive'`, () => {});
      database.run(`ALTER TABLE template_profiles ADD COLUMN source_node TEXT`, () => {});
      database.run(`ALTER TABLE template_profiles ADD COLUMN source_vmid INTEGER`, () => {});
      database.run(`ALTER TABLE template_profiles ADD COLUMN min_disk_gb INTEGER NOT NULL DEFAULT 4`, () => {});

      // v3.1.71: persistent self-service provisioning jobs and user-safe logs.
      database.run(`
        CREATE TABLE IF NOT EXISTS provisioning_jobs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          cluster_id INTEGER NOT NULL,
          template_profile_id INTEGER,
          status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued', 'running', 'success', 'failed')),
          phase TEXT NOT NULL DEFAULT 'queued',
          progress INTEGER NOT NULL DEFAULT 0,
          hostname TEXT NOT NULL,
          requested_cores INTEGER NOT NULL,
          requested_memory_mb INTEGER NOT NULL,
          requested_disk_gb INTEGER NOT NULL,
          root_password_encrypted TEXT NOT NULL,
          vmid INTEGER,
          ip TEXT,
          node TEXT,
          resource_id INTEGER,
          error_message TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          started_at DATETIME,
          finished_at DATETIME,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (cluster_id) REFERENCES proxmox_clusters(id) ON DELETE CASCADE,
          FOREIGN KEY (template_profile_id) REFERENCES template_profiles(id) ON DELETE SET NULL,
          FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE SET NULL
        )
      `);
      database.run(`CREATE INDEX IF NOT EXISTS idx_provisioning_jobs_user ON provisioning_jobs(user_id, created_at DESC)`, () => {});
      database.run(`CREATE INDEX IF NOT EXISTS idx_provisioning_jobs_status ON provisioning_jobs(status, created_at)`, () => {});
      database.run(`
        CREATE TABLE IF NOT EXISTS provisioning_job_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          job_id INTEGER NOT NULL,
          level TEXT NOT NULL DEFAULT 'info',
          phase TEXT NOT NULL,
          message_en TEXT NOT NULL,
          message_de TEXT NOT NULL,
          technical_message TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (job_id) REFERENCES provisioning_jobs(id) ON DELETE CASCADE
        )
      `);
      database.run(`CREATE INDEX IF NOT EXISTS idx_provisioning_job_events_job ON provisioning_job_events(job_id, id)`, () => {});

      // v3.0: per-user notification preferences
      database.run(`ALTER TABLE users ADD COLUMN notify_resource_down INTEGER DEFAULT 0`, () => {});
      database.run(`ALTER TABLE users ADD COLUMN notify_resource_recovered INTEGER DEFAULT 0`, () => {});
      database.run(`ALTER TABLE users ADD COLUMN notify_maintenance INTEGER DEFAULT 1`, () => {});
      // v3.1.23: persisted portal/e-mail language per user
      database.run(`ALTER TABLE users ADD COLUMN preferred_language TEXT`, () => {});

      // v3.0: scheduled maintenance windows / announcements
      database.run(`
        CREATE TABLE IF NOT EXISTS maintenance_windows (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          message TEXT,
          severity TEXT DEFAULT 'info' CHECK(severity IN ('info', 'warning', 'critical')),
          starts_at DATETIME NOT NULL,
          ends_at DATETIME NOT NULL,
          notify_users INTEGER DEFAULT 0,
          notified_at DATETIME,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        )
      `);

      // v3.0: resource status transitions detected by the monitoring service
      database.run(`
        CREATE TABLE IF NOT EXISTS status_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cluster_id INTEGER NOT NULL,
          container_id TEXT NOT NULL,
          resource_name TEXT,
          old_status TEXT,
          new_status TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (cluster_id) REFERENCES proxmox_clusters(id) ON DELETE CASCADE
        )
      `);
      database.run(`CREATE INDEX IF NOT EXISTS idx_status_events_created ON status_events(created_at DESC)`, () => {});

      // v3.1.57: Pangolin-managed public resources. A service may have
      // several HTTP, TCP and UDP publications at the same time.
      database.run(`
        CREATE TABLE IF NOT EXISTS resource_publications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          resource_id INTEGER NOT NULL,
          pangolin_resource_id INTEGER,
          pangolin_target_id INTEGER,
          protocol TEXT NOT NULL DEFAULT 'http' CHECK(protocol IN ('http', 'tcp', 'udp')),
          subdomain TEXT,
          public_port INTEGER,
          target_port INTEGER NOT NULL,
          target_method TEXT,
          public_url TEXT,
          status TEXT NOT NULL DEFAULT 'active',
          last_error TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
        )
      `);

      // Older installations used UNIQUE(resource_id), which limited every
      // service to one publication. Rebuild the table once while preserving
      // all existing Pangolin IDs and URLs.
      database.get(
        `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'resource_publications'`,
        (schemaError, schemaRow) => {
          if (schemaError) {
            reject(schemaError);
            return;
          }

          const legacySinglePublicationSchema = /resource_id\s+INTEGER\s+NOT\s+NULL\s+UNIQUE/i.test(schemaRow?.sql || '');
          const finishInitialization = () => {
            database.exec(`
              DROP INDEX IF EXISTS idx_resource_publications_subdomain;
              CREATE INDEX IF NOT EXISTS idx_resource_publications_protocol
                ON resource_publications(protocol);
              CREATE INDEX IF NOT EXISTS idx_resource_publications_resource
                ON resource_publications(resource_id, updated_at DESC);
              CREATE UNIQUE INDEX IF NOT EXISTS idx_resource_publications_http_subdomain
                ON resource_publications(subdomain)
                WHERE protocol = 'http' AND subdomain IS NOT NULL AND subdomain != '';
              CREATE INDEX IF NOT EXISTS idx_resource_publications_raw_port
                ON resource_publications(protocol, public_port)
                WHERE protocol IN ('tcp', 'udp') AND public_port IS NOT NULL;
            `, (indexError) => {
              if (indexError) {
                reject(indexError);
                return;
              }

              // Preserve legacy manual links only for resources that do not already
              // have a Pangolin publication. New fallback links use their own column so
              // Pangolin synchronization cannot overwrite them.
              database.run(`
                UPDATE resources
                SET manual_public_url = COALESCE(
                  NULLIF(manual_public_url, ''),
                  NULLIF(public_url, ''),
                  NULLIF(web_url, '')
                )
                WHERE NOT EXISTS (
                  SELECT 1 FROM resource_publications rp WHERE rp.resource_id = resources.id
                )
              `, (manualUrlMigrationError) => {
                if (manualUrlMigrationError) {
                  reject(manualUrlMigrationError);
                  return;
                }

                // Settings (key-value store)
                database.run(`
                  CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                  )
                `, (settingsError) => {
                  if (settingsError) {
                    reject(settingsError);
                  } else {
                    console.log('✓ All tables initialized');
                    resolve();
                  }
                });
              });
            });
          };

          if (!legacySinglePublicationSchema) {
            finishInitialization();
            return;
          }

          database.exec(`
            PRAGMA foreign_keys = OFF;
            BEGIN TRANSACTION;
            DROP INDEX IF EXISTS idx_resource_publications_protocol;
            DROP INDEX IF EXISTS idx_resource_publications_subdomain;
            ALTER TABLE resource_publications RENAME TO resource_publications_single_legacy;
            CREATE TABLE resource_publications (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              resource_id INTEGER NOT NULL,
              pangolin_resource_id INTEGER,
              pangolin_target_id INTEGER,
              protocol TEXT NOT NULL DEFAULT 'http' CHECK(protocol IN ('http', 'tcp', 'udp')),
              subdomain TEXT,
              public_port INTEGER,
              target_port INTEGER NOT NULL,
              target_method TEXT,
              public_url TEXT,
              status TEXT NOT NULL DEFAULT 'active',
              last_error TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
            );
            INSERT INTO resource_publications (
              id, resource_id, pangolin_resource_id, pangolin_target_id, protocol,
              subdomain, public_port, target_port, target_method, public_url,
              status, last_error, created_at, updated_at
            )
            SELECT
              id, resource_id, pangolin_resource_id, pangolin_target_id, protocol,
              subdomain, public_port, target_port, target_method, public_url,
              status, last_error, created_at, updated_at
            FROM resource_publications_single_legacy;
            DROP TABLE resource_publications_single_legacy;
            COMMIT;
            PRAGMA foreign_keys = ON;
          `, (migrationError) => {
            if (migrationError) {
              database.exec('ROLLBACK; PRAGMA foreign_keys = ON;', () => reject(migrationError));
              return;
            }
            finishInitialization();
          });
        }
      );
    });
  });
}

/**
 * Run a query with parameters
 */
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

/**
 * Get single row
 */
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

/**
 * Get all rows
 */
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

/**
 * Close database connection
 */
function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    } else {
      resolve();
    }
  });
}

module.exports = {
  getDatabase,
  initDatabase,
  run,
  get,
  all,
  closeDatabase
};
