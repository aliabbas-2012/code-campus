# Deploying Code Campus to code-campus.countonrobert.com

Target: a Debian/Ubuntu server with Apache2, reverse-proxying to the Next.js
app (run via systemd), with a free Let's Encrypt TLS certificate via
`certbot`. Every command below runs **on your server** (SSH in first) unless
marked otherwise — this guide isn't something that gets executed for you, it's
the exact sequence to run yourself.

**Before you start:**
- DNS: an `A` (and `AAAA` if you have IPv6) record for
  `code-campus.countonrobert.com` already pointing at this server's public IP.
  Certbot's HTTP-01 challenge (used below) fails if this isn't propagated yet —
  check with `dig +short code-campus.countonrobert.com`.
- Ports 80 and 443 reachable from the internet (cloud firewall / security group,
  in addition to the server's own firewall configured in Step 8).
- Root or sudo access.

---

## 1. System packages

```bash
sudo apt update
sudo apt install -y apache2 postgresql postgresql-contrib git build-essential curl certbot python3-certbot-apache
```

Skip `postgresql postgresql-contrib` if you're pointing `DATABASE_URL` at a
Postgres instance you already run elsewhere (matches this project's normal
dev setup — see `CLAUDE.md`, there's no bundled docker-compose Postgres).

Enable the Apache modules the vhost needs:

```bash
sudo a2enmod proxy proxy_http headers rewrite ssl
sudo systemctl restart apache2
```

## 2. Create a dedicated system user

Don't run the app as root or your own login user — it should own nothing
outside its own directory.

```bash
sudo useradd --system --create-home --shell /bin/bash codecampus
sudo su - codecampus
```

Run the rest of Steps 3–6 as this `codecampus` user (you're now in its shell).

## 3. Install Node.js 24.20+ via nvm

This repo pins Node 24.20+ (`.nvmrc`) — `jsdom`/other deps need it; don't
substitute your distro's older packaged Node.

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 24.20.0
node -v   # confirm v24.20.0
```

Note the absolute path for later: `~/.nvm/versions/node/v24.20.0/bin/node` —
systemd services don't source `~/.bashrc`/nvm's shell hook, so
`deploy/systemd/code-campus.service` references this path directly rather
than relying on `node` being on `$PATH`.

## 4. Clone the repo

```bash
cd ~
git clone <your-repo-url> code-campus
# or, if you'd rather it live at /var/www/code-campus (matches the systemd
# unit's WorkingDirectory as shipped):
sudo mkdir -p /var/www/code-campus
sudo chown codecampus:codecampus /var/www/code-campus
git clone <your-repo-url> /var/www/code-campus
cd /var/www/code-campus
```

If you clone somewhere else, update `WorkingDirectory` and `ExecStart` in
`deploy/systemd/code-campus.service` to match before Step 7.

## 5. Configure environment

```bash
cp deploy/.env.production.example .env.local
cp .env.local .env   # Prisma CLI only reads .env, not .env.local — CLAUDE.md
```

Edit both (`nano .env.local`) and fill in real values:

- `DATABASE_URL` — real Postgres credentials (Step 6 creates the DB/user if
  self-hosting).
- `NEXTAUTH_SECRET` — generate a **fresh** one, don't reuse a dev secret:
  `openssl rand -hex 32`
- `NEXTAUTH_URL=https://code-campus.countonrobert.com` — must be `https://`
  and match the final domain exactly; NextAuth builds callback/redirect URLs
  from this.

Leave `DEV_EXPOSE_RESET_LINK` unset — see the comment in the example file.
Once you're logged in as an admin, configure real outbound email under
**Admin → SMTP Settings** in the app itself instead.

## 6. Database setup (skip if using a remote/existing Postgres)

```bash
sudo -u postgres psql <<'SQL'
CREATE USER code_campus WITH PASSWORD 'CHANGE_ME_DB_PASSWORD';
CREATE DATABASE code_campus OWNER code_campus;
SQL
```

Use the same password in `DATABASE_URL` from Step 5.

## 7. Install, build, migrate, seed

Back in `/var/www/code-campus` as the `codecampus` user (with nvm's node on
`$PATH` — `source ~/.nvm/nvm.sh` first if it's a new shell):

```bash
npm ci
npx prisma generate
npx prisma db push        # this repo has no migration history yet — db push
                           # is the same command used in dev (package.json's
                           # "prisma:push"); safe against a fresh empty database
npm run build
npm run seed               # optional: creates admin@example.com / instructor@example.com
                            # / student@example.com, all password "password" —
                            # log in and change these immediately, or skip this
                            # and create real accounts by hand instead
```

`npm ci`'s `postinstall` hook copies the Pyodide runtime into `public/pyodide/`
automatically (`scripts/copy-pyodide-assets.js`) — if Python execution fails
in the browser later, check that directory exists before assuming a code bug.

Create the local storage directory the app writes uploaded file copies to
(gitignored, and per `CLAUDE.md` currently redundant with the Postgres copy,
but the write path still needs to exist and be writable):

```bash
mkdir -p storage
```

## 8. Run it as a service

```bash
exit   # back to your sudo-capable user
sudo cp /var/www/code-campus/deploy/systemd/code-campus.service /etc/systemd/system/
```

Edit `/etc/systemd/system/code-campus.service` if you cloned somewhere other
than `/var/www/code-campus`, or if nvm installed a different Node path than
`v24.20.0` (`sudo -u codecampus bash -c 'source ~/.nvm/nvm.sh && which node'`
to check).

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now code-campus
sudo systemctl status code-campus     # should show "active (running)"
curl -I http://127.0.0.1:3007         # should return HTTP 200 (not connection refused)
```

Logs: `sudo journalctl -u code-campus -f`

## 9. Apache vhost + firewall

```bash
sudo cp /var/www/code-campus/deploy/apache/code-campus.conf /etc/apache2/sites-available/
sudo a2ensite code-campus.conf
sudo apache2ctl configtest         # must say "Syntax OK" before reloading
sudo systemctl reload apache2

sudo ufw allow OpenSSH
sudo ufw allow 'Apache Full'       # opens 80 + 443
sudo ufw enable                     # only if ufw wasn't already active
```

At this point `http://code-campus.countonrobert.com` should load the app over
plain HTTP (proxied to the Next.js process) — confirm before moving on to SSL.

## 10. SSL certificate (Let's Encrypt via certbot)

This is the step that actually generates the certificate — run it yourself,
on the server, with the domain already resolving to it (per the DNS
prerequisite at the top) and Step 9's plain-HTTP vhost already working.

### 10a. Generate it (the automatic, recommended way)

```bash
sudo certbot --apache -d code-campus.countonrobert.com
```

First run asks for an email (for renewal/expiry notices) and to agree to
Let's Encrypt's terms. Then certbot will:

1. Prove domain ownership via an **HTTP-01 challenge** — it briefly serves a
   token file under `http://code-campus.countonrobert.com/.well-known/acme-challenge/`
   using your existing `:80` vhost, and Let's Encrypt's servers fetch it.
   This is the step that actually fails if DNS/firewall isn't right yet.
2. On success, obtain the certificate and save it under
   `/etc/letsencrypt/live/code-campus.countonrobert.com/` — the two files
   that matter are `fullchain.pem` (cert + intermediate chain) and
   `privkey.pem` (private key, mode 600, root-readable only).
3. **Edit `/etc/apache2/sites-available/code-campus.conf` itself**, adding a
   `<VirtualHost *:443>` block that points at those two files and proxies to
   the app exactly like the `:80` block does. It will ask:
   *"Please choose whether or not to redirect HTTP traffic to HTTPS"* — choose
   **redirect** (option 2) so the site is only ever reachable over HTTPS.
4. Reload Apache automatically with the new config.

`deploy/apache/code-campus-ssl.conf.example` in this repo shows exactly what
the resulting file looks like — open it side by side with the real
`/etc/apache2/sites-available/code-campus.conf` after this step to sanity-check
certbot's output, or as a reference if you ever need to reconstruct it by hand.

Update `NEXTAUTH_URL` in `.env.local` to `https://code-campus.countonrobert.com`
if you hadn't already in Step 5, and:

```bash
sudo systemctl restart code-campus
```

### 10b. Manual alternative (skip if 10a worked)

Only needed if you'd rather certbot not edit Apache's config for you — e.g.
you want full control over the vhost. Obtain the cert without touching Apache:

```bash
sudo certbot certonly --webroot -w /var/www/html -d code-campus.countonrobert.com
```

(`/var/www/html` must be reachable via the existing `:80` vhost for the
challenge — Apache's default document root works if you haven't changed it.)
Then hand-edit `/etc/apache2/sites-available/code-campus.conf` to match
`deploy/apache/code-campus-ssl.conf.example`, substituting your real domain,
and reload: `sudo apache2ctl configtest && sudo systemctl reload apache2`.

### 10c. Auto-renewal

Let's Encrypt certificates expire every 90 days. Certbot installs a systemd
timer that renews automatically well before that — confirm it's active and
that a renewal would actually succeed, without waiting 90 days to find out:

```bash
systemctl status certbot.timer      # should be "active (waiting)"
sudo certbot renew --dry-run        # simulates a real renewal end-to-end
```

If the dry run fails, fix it now — a real renewal failure means the site
starts serving an expired cert (browsers will hard-block it) with no warning
until it happens.

### 10d. Verify

```bash
curl -I https://code-campus.countonrobert.com          # HTTP/2 200 (or 301 from :80 if you request that instead)
curl -I http://code-campus.countonrobert.com            # should 301 to https:// if you chose "redirect" in 10a
echo | openssl s_client -connect code-campus.countonrobert.com:443 -servername code-campus.countonrobert.com 2>/dev/null | openssl x509 -noout -dates
```

That last command prints the cert's `notBefore`/`notAfter` — confirm
`notAfter` is ~90 days out and the domain matches. For a full external check
(chain, protocol/cipher support, HSTS), point
[SSL Labs' test](https://www.ssllabs.com/ssltest/) at the domain once it's
live — not required, but worth doing once.

## 11. Verify the app itself

- Open `https://code-campus.countonrobert.com/login` in a browser — padlock
  should show a valid cert (10d already checked this from the command line),
  and the page should load fully (check devtools console for any
  blocked-resource errors).
- Log in with a seeded account (Step 7) or one you created by hand.
- `sudo systemctl status code-campus apache2 postgresql` — all active.

## 12. Redeploying after code changes

```bash
sudo su - codecampus
cd /var/www/code-campus
git pull
npm ci
npx prisma generate
npx prisma db push
npm run build
exit
sudo systemctl restart code-campus
```

---

## Troubleshooting

**502 Bad Gateway from Apache** — the Next.js process isn't listening on
127.0.0.1:3007. Check `sudo systemctl status code-campus` and
`sudo journalctl -u code-campus -n 50`. Common causes: wrong Node path in the
`.service` file's `ExecStart`, `.env.local` missing/malformed (the
`EnvironmentFile` directive fails silently if the path is wrong — check with
`systemctl cat code-campus`), or `DATABASE_URL` unreachable.

**Login/reset-password links point to the wrong host** — `NEXTAUTH_URL` in
`.env.local` doesn't match the real public URL exactly (scheme included).
Fix it and `sudo systemctl restart code-campus`.

**Certbot fails the HTTP-01 challenge** — DNS hasn't propagated yet
(`dig +short code-campus.countonrobert.com` should return this server's IP),
or something on port 80 isn't actually reachable from the internet (cloud
firewall/security group, not just `ufw`). Check `sudo apache2ctl configtest`
passes and `code-campus.conf` is actually enabled (`a2ensite`, Step 9) first —
certbot needs the existing `:80` vhost serving that exact `ServerName` to
place its challenge file.

**Browser still shows "not secure" / mixed content after 10a** — a leftover
browser tab cached the old HTTP page; hard-refresh. If specific resources
(fonts, chunks) still load over `http://`, something is hardcoding an absolute
`http://` URL rather than a relative one or `https://` — this app doesn't do
that anywhere by default, so check for a stale `NEXTAUTH_URL` (Step 5) first.

**Certbot says the domain already has a certificate / rate limited** — Let's
Encrypt limits certs per exact domain to 5 per week. If you're re-running
Step 10 repeatedly while testing, use
`sudo certbot certonly --apache -d code-campus.countonrobert.com --dry-run`
(against the staging CA, unlimited) to test the flow without burning a real
issuance.

**File uploads / zip import fail** — check the `storage/` directory (Step 7)
exists under the app's working directory and is writable by the `codecampus`
user; also confirm `MAX_FILE_SIZE_MB` in `.env.local` is high enough.

**Python execution fails in the browser ("Failed to fetch")** — check
`public/pyodide/version.txt` exists (written by `postinstall`); if missing,
`npm ci` again as the `codecampus` user.

## Security checklist

- [ ] Next.js bound to `127.0.0.1` only (already set in the shipped
      `.service` file's `-H 127.0.0.1`) — never expose port 3007 externally.
- [ ] `DEV_EXPOSE_RESET_LINK` is unset in production `.env.local`.
- [ ] `NEXTAUTH_SECRET` is a fresh value generated on this server, not copied
      from a dev machine.
- [ ] Seeded demo accounts (Step 7) either skipped or their passwords changed
      immediately after first login.
- [ ] Postgres password is strong and `pg_hba.conf` doesn't allow unrestricted
      remote connections if Postgres is self-hosted here.
- [ ] Real SMTP configured under Admin → SMTP Settings so password-reset
      emails actually deliver (until then, resets have no way to reach users).
- [ ] A backup plan exists for the Postgres database (source of truth for all
      app data, including file contents — see `CLAUDE.md`'s architecture
      notes) — e.g. a nightly `pg_dump` cron job.
- [ ] HTTP → HTTPS redirect is active (Step 10a's "redirect" choice, or the
      `RewriteRule` in `code-campus-ssl.conf.example`) — confirmed via
      `curl -I http://code-campus.countonrobert.com` returning a `301`.
- [ ] `certbot renew --dry-run` (Step 10c) succeeds — a silent renewal
      failure means the cert expires with no warning until browsers block it.
- [ ] `certbot.timer` is enabled (`systemctl is-enabled certbot.timer`) so
      renewal actually runs unattended going forward.
