# Human Intervention Guide — v1toProd Remaining Steps

**Created:** 2026-07-10  
**Purpose:** Step-by-step instructions for all v1toProd items that require human action (cannot be automated by the AI agent).

---

## 1. GitHub PAT — Enable `workflow` Scope for CI

**Why:** The current PAT cannot push `.github/workflows/` files. CI pipeline exists locally but isn't on remote.

**Steps:**
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo`, `workflow`
4. Copy the new PAT
5. Update the git remote URL:
   ```bash
   cd /path/to/ischool
   git remote set-url origin https://ridwanullahh:<NEW_PAT>@github.com/ridwanullahh/ischool.git
   ```
6. Push the CI file:
   ```bash
   git add .github/workflows/ci.yml
   git commit -m "Add CI workflow"
   git push origin master
   ```
7. Verify the Actions tab on GitHub shows the workflow

**Alternative:** Add the file manually via GitHub web UI:
1. Go to https://github.com/ridwanullahh/ischool
2. Click "Add file" → "Create new file"
3. Name: `.github/workflows/ci.yml`
4. Copy contents from `src/pages/api/dashboard/../../.github/workflows/ci.yml` (local copy)

---

## 2. SSL Certificate Setup (Let's Encrypt)

**Why:** Production requires HTTPS for security headers, cookies, and CBT proctoring.

**Prerequisites:**
- A domain name pointing to your server IP
- Nginx or Caddy installed on the server

**Steps (Nginx + Certbot):**
```bash
# Install certbot
sudo apt update && sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

**For Caddy (auto-SSL):**
```caddyfile
your-domain.com {
    reverse_proxy localhost:4321
}
```
Caddy handles SSL automatically.

---

## 3. Production Environment Variables

**Why:** The app requires secrets for Cloudinary, Gmail, AI, and payment gateways.

**Steps:**
1. Copy `.env.example` to `.env` on the production server:
   ```bash
   cp .env.example .env
   ```
2. Fill in each variable:
   - `SESSION_SECRET`: Generate with `openssl rand -hex 32`
   - `ENCRYPTION_KEY`: Generate with `openssl rand -hex 16`
   - `CLOUDINARY_*`: Get from https://cloudinary.com/console
   - `GMAIL_USER` + `GMAIL_APP_PASSWORD`: Use a Google App Password (https://myaccount.google.com/apppasswords)
   - `AI_API_KEY`: Get from your AI provider dashboard
   - `STRIPE_*`: Get from https://dashboard.stripe.com/apikeys
   - `PAYSTACK_*`: Get from https://dashboard.paystack.com/settings/credentials
3. Restart the application after saving

**Critical:** Never commit `.env` to git. It's already in `.gitignore`.

---

## 4. Automated Database Backups

**Why:** Data loss prevention. SQLite database must be backed up daily.

**Steps:**
1. Create a backup script:
   ```bash
   sudo nano /opt/ischool/backup.sh
   ```
2. Content:
   ```bash
   #!/bin/bash
   BACKUP_DIR="/opt/ischool/backups"
   DB_PATH="/opt/ischool/ischool.db"
   TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
   mkdir -p $BACKUP_DIR
   
   # Create backup using SQLite's .backup command (safe for concurrent access)
   sqlite3 $DB_PATH ".backup '$BACKUP_DIR/ischool_$TIMESTAMP.db'"
   
   # Compress
   gzip $BACKUP_DIR/ischool_$TIMESTAMP.db
   
   # Delete backups older than 30 days
   find $BACKUP_DIR -name "*.db.gz" -mtime +30 -delete
   
   echo "Backup completed: ischool_$TIMESTAMP.db.gz"
   ```
3. Make executable:
   ```bash
   sudo chmod +x /opt/ischool/backup.sh
   ```
4. Add to crontab:
   ```bash
   sudo crontab -e
   ```
5. Add this line for daily backup at 2 AM:
   ```
   0 2 * * * /opt/ischool/backup.sh >> /opt/ischool/logs/backup.log 2>&1
   ```
6. **Test the backup:**
   ```bash
   /opt/ischool/backup.sh
   ls -la /opt/ischool/backups/
   ```
7. **Test restore:**
   ```bash
   cp /opt/ischool/backups/ischool_XXXXXXXX.db.gz /tmp/
   gunzip /tmp/ischool_XXXXXXXX.db.gz
   sqlite3 /tmp/ischool_XXXXXXXX.db "PRAGMA integrity_check;"
   ```

**Off-site backup (optional but recommended):**
- Upload to S3: `aws s3 cp /opt/ischool/backups/ s3://your-bucket/ischool/ --recursive`
- Or use `rclone` to sync to Google Drive / Dropbox

---

## 5. Sentry / Error Tracking Setup

**Why:** Catch production errors that users encounter.

**Steps:**
1. Create a Sentry account at https://sentry.io (free tier: 5K events/month)
2. Create a new project → Select "Node.js"
3. Get the DSN from project settings
4. Add to `.env`:
   ```
   SENTRY_DSN=https://xxxxx@oxxxxx.ingest.sentry.io/xxxxx
   ```
5. Install Sentry SDK:
   ```bash
   npm install @sentry/node
   ```
6. Add to `src/lib/error-logger.ts`:
   ```typescript
   import * as Sentry from '@sentry/node';
   if (process.env.SENTRY_DSN) {
     Sentry.init({ dsn: process.env.SENTRY_DSN });
   }
   ```
7. Replace `console.error` in the global error handler with `Sentry.captureException(error)`

**Alternative (self-hosted):** Deploy GlitchTip (open-source Sentry alternative) via Docker.

---

## 6. Uptime Monitoring

**Why:** Know when the platform is down before users report it.

**Steps:**
1. Sign up for UptimeRobot (free: 50 monitors, 5-minute checks) at https://uptimerobot.com
2. Add a new monitor:
   - Type: HTTP(s)
   - URL: `https://your-domain.com/api/health`
   - Interval: 5 minutes
3. Set up alert contacts (email, Slack, Discord, SMS)
4. Create a status page at `status.your-domain.com` (optional)

**Alternative:** BetterStack (https://betterstack.com) — better UI, free tier available.

---

## 7. Penetration Testing

**Why:** Identify security vulnerabilities before launch.

**Option A — Automated scanning (free):**
1. Run OWASP ZAP: https://www.zaproxy.org/download/
2. Target: `https://your-domain.com`
3. Run a full scan
4. Fix all High/Critical findings

**Option B — External firm (recommended for enterprise):**
1. Hire a security firm for a penetration test
2. Provide them with:
   - Test accounts (admin, teacher, student, parent)
   - API documentation (API_DOCS.md)
   - Scope: all endpoints under `/api/dashboard/` and `/api/portal/`
3. Remediate all findings before launch

**Minimum self-checks:**
- [ ] OWASP Top 10 scan passed
- [ ] SSL Labs rating A+ (https://www.ssllabs.com/ssltest/)
- [ ] Security headers verified (https://securityheaders.com)
- [ ] No hardcoded secrets in git history
- [ ] `npm audit` shows no critical vulnerabilities
- [ ] Rate limiting works (test with rapid requests)
- [ ] RBAC works (test cross-school access with different accounts)

---

## 8. Load Testing

**Why:** Ensure the platform handles real user traffic.

**Steps:**
1. Install k6: https://k6.io/docs/getting-started/installation/
2. Create a test script:
   ```javascript
   import http from 'k6/http';
   export let options = {
     stages: [
       { duration: '30s', target: 20 },
       { duration: '1m', target: 50 },
       { duration: '30s', target: 100 },
       { duration: '1m', target: 100 },
       { duration: '30s', target: 0 },
     ],
   };
   export default function() {
     http.get('https://your-domain.com/api/health');
     http.get('https://your-domain.com/');
   }
   ```
3. Run: `k6 run test.js`
4. Target metrics:
   - p95 response time < 500ms
   - Error rate < 1%
   - 100 concurrent users without crashes

---

## 9. GDPR Compliance Review

**Why:** Legal requirement for processing personal data of EU/UK users.

**Steps:**
1. Create a Privacy Policy page (add to public CMS)
2. Create a Cookie Consent banner
3. Document data retention policy:
   - Student records: retained while enrolled + 7 years
   - Financial records: 7 years
   - Audit logs: 2 years
   - Session data: 24 hours
4. Implement data export endpoint (already have CSV exports)
5. Implement data deletion endpoint (right to be forgotten)
6. Review with legal counsel
7. Register with your local data protection authority if required

---

## 10. DNS and Domain Configuration

**Why:** Users access the platform via a domain name.

**Steps:**
1. Purchase a domain (e.g., via Namecheap, Cloudflare)
2. Set DNS A record:
   ```
   A    @         YOUR_SERVER_IP
   A    www       YOUR_SERVER_IP
   A    status    YOUR_SERVER_IP  (optional, for status page)
   ```
3. Wait for DNS propagation (check with `dig your-domain.com`)
4. Configure reverse proxy (Nginx or Caddy) to forward to the Node.js app
5. Verify SSL certificate is working

---

## 11. Process Management (PM2 or systemd)

**Why:** Keep the app running, auto-restart on crash, start on boot.

**Option A — PM2 (recommended):**
```bash
# Install PM2
npm install -g pm2

# Start the app
pm2 start dist/server/entry.mjs --name ischool

# Save process list
pm2 save

# Enable auto-start on boot
pm2 startup
# Follow the instructions printed by the above command
```

**Option B — systemd:**
```bash
sudo nano /etc/systemd/system/ischool.service
```
Content:
```ini
[Unit]
Description=iSchool Platform
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/ischool
ExecStart=/usr/bin/node dist/server/entry.mjs
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```
Enable:
```bash
sudo systemctl enable ischool
sudo systemctl start ischool
```

---

## 12. CI/CD Deployment Pipeline

**Why:** Automate deployment on push to master.

**Steps (GitHub Actions — after enabling workflow scope):**
1. Add deployment secrets to GitHub repo settings:
   - `SSH_HOST`: Your server IP
   - `SSH_USER`: SSH username
   - `SSH_KEY`: SSH private key
2. Update `.github/workflows/ci.yml` to add a deploy job:
   ```yaml
   deploy:
     needs: build
     runs-on: ubuntu-latest
     if: github.ref == 'refs/heads/master'
     steps:
       - uses: appleboy/ssh-action@master
         with:
           host: ${{ secrets.SSH_HOST }}
           username: ${{ secrets.SSH_USER }}
           key: ${{ secrets.SSH_KEY }}
           script: |
             cd /opt/ischool
             git pull origin master
             npm ci
             npm run build
             pm2 restart ischool
   ```

---

## Pre-Launch Final Checklist

Before going live, verify ALL of the following:

- [ ] Domain resolves to server IP
- [ ] SSL certificate active (https:// works)
- [ ] SSL Labs rating A+
- [ ] Security headers verified (securityheaders.com)
- [ ] `.env` configured with all required secrets
- [ ] Database migrated (`npm run db:migrate`)
- [ ] Database seeded (`npm run db:seed`)
- [ ] App running via PM2/systemd
- [ ] App starts on boot
- [ ] Daily backups configured and tested
- [ ] Backup restore tested
- [ ] Uptime monitoring configured
- [ ] Error tracking (Sentry) configured
- [ ] Rate limiting verified (test with rapid login attempts)
- [ ] RBAC verified (student cannot access admin endpoints)
- [ ] File upload limits work (test with large file)
- [ ] Email sending works (test password reset)
- [ ] Payment gateway works (test with test card)
- [ ] CBT exam taking works (test full exam flow)
- [ ] Dark mode toggle works
- [ ] Mobile responsive (test on phone)
- [ ] Load test passed (100 concurrent users)
- [ ] `npm audit` shows no critical vulnerabilities
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie consent banner implemented

---

*May Allah make this effort beneficial. BismiLLAH.*
