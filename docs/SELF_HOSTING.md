# CampusShield Self-Hosting & University IT Deployment Guide

CampusShield is designed for painless deployment on university-owned bare-metal servers or cloud virtual machines (AWS, GCP, Azure, Hetzner, or DigitalOcean) with **zero software licensing costs**.

---

## 1. Hardware & System Requirements

### Recommended Minimum Specifications (up to 10,000 active students)
- **CPU:** 4 vCPUs (x86_64 or ARM64)
- **RAM:** 8 GB
- **Disk:** 50 GB NVMe SSD (for PostgreSQL database, PostGIS spatial indexes, and Redis persistence)
- **Operating System:** Ubuntu 22.04 / 24.04 LTS, Debian 12, or AlmaLinux / RHEL 9
- **Container Runtime:** Docker Engine 24.0+ & Docker Compose v2.20+

---

## 2. One-Command Docker Compose Deployment

### Step 1: Clone the Repository
```bash
git clone https://github.com/campus-shield/campus-shield.git
cd campus-shield
```

### Step 2: Generate Cryptographic Secrets
Generate a 64-character hexadecimal key (32 bytes) for AES-256-GCM vault encryption:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Generate a random 32-character string for JWT signing:
```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"
```

### Step 3: Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Edit `.env` and fill in the values generated above:
```ini
POSTGRES_USER=campusshield
POSTGRES_PASSWORD=your_strong_db_password_here
POSTGRES_DB=campusshield
DATABASE_URL=postgresql://campusshield:your_strong_db_password_here@postgres:5432/campusshield

REDIS_URL=redis://redis:6379

API_PORT=3001
API_HOST=0.0.0.0

JWT_SECRET=your_jwt_secret_string_here
JWT_EXPIRES_IN=7d

VAULT_ENCRYPTION_KEY=your_64_char_hex_key_here

NEXT_PUBLIC_API_URL=https://safety.university.edu/api
NEXT_PUBLIC_WS_URL=wss://safety.university.edu
CORS_ORIGIN=https://safety.university.edu

OVERPASS_API_URL=https://overpass-api.de/api/interpreter
GRACE_PERIOD_SECONDS=60
DEFAULT_CHECKIN_INTERVAL_HOURS=48
```

### Step 4: Launch the Containers
```bash
docker compose -f infra/docker-compose.yml up --build -d
```

Verify that all 4 containers are healthy:
```bash
docker compose -f infra/docker-compose.yml ps
```

---

## 3. Production Reverse Proxy Setup (Caddy or NGINX)

We recommend using **Caddy** for automatic Let's Encrypt SSL/TLS certificates and native WebSocket proxying.

### Sample `Caddyfile` (`/etc/caddy/Caddyfile`)
```caddy
safety.university.edu {
    # University Security Web Panel
    reverse_proxy localhost:3000

    # API Server & WebSocket stream
    handle /api/* {
        reverse_proxy localhost:3001
    }

    handle /socket.io/* {
        reverse_proxy localhost:3001
    }
}
```

Reload Caddy:
```bash
sudo systemctl reload caddy
```

---

## 4. Initial Staff Account Setup

To bootstrap your initial security dispatcher and administrator accounts:

Connect to the PostgreSQL container:
```bash
docker exec -it cs-postgres psql -U campusshield -d campusshield
```

Create an administrative user (replace password hash with your own generated using Argon2id):
```sql
-- Generate an Argon2id hash using: node -e "require('argon2').hash('YourPasswordHere').then(console.log)"
INSERT INTO staff_users (email, password_hash, role, display_name)
VALUES (
    'admin@university.edu',
    '$argon2id$v=19$m=65536,t=3,p=4$...',
    'ADMIN',
    'Campus Police Chief'
);
```

---

## 5. Automated Backups & Disaster Recovery

### Nightly Backup Script (`/opt/campusshield/backup.sh`)
```bash
#!/usr/bin/env bash
set -eo pipefail

BACKUP_DIR="/var/backups/campusshield"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# Dump PostgreSQL database (includes PostGIS geometries and immutable audit logs)
docker exec cs-postgres pg_dump -U campusshield -F c campusshield > "$BACKUP_DIR/campusshield_$TIMESTAMP.dump"

# Retain last 30 daily backups
find "$BACKUP_DIR" -type f -name "*.dump" -mtime +30 -delete

echo "Backup completed: campusshield_$TIMESTAMP.dump"
```

Add to cron:
```bash
0 3 * * * /opt/campusshield/backup.sh >> /var/log/campusshield_backup.log 2>&1
```

### Restoring from Backup
```bash
docker exec -i cs-postgres pg_restore -U campusshield -d campusshield --clean < /path/to/backup.dump
```

---

## 6. Overpass API & Offline Mapping Options

CampusShield uses the free **OpenStreetMap Overpass API** by default (`https://overpass-api.de/api/interpreter`) to discover nearby police stations during emergencies.

For large university deployments or offline campus networks:
1. You may host a local Overpass API Docker container: `wiktorn/overpass-api`.
2. Update `OVERPASS_API_URL` in `.env` to point to your local instance (e.g. `http://overpass:80/api/interpreter`).

---

## 7. Monitoring & Health Checks

- **API Health Endpoint:** `GET /health` returns `{ "status": "OK", "service": "campus-shield-api" }`
- **Docker Healthcheck Status:**
  ```bash
  docker inspect --format='{{json .State.Health.Status}}' cs-api-server
  ```
- **Live Logs:**
  ```bash
  docker compose -f infra/docker-compose.yml logs -f api-server
  ```
