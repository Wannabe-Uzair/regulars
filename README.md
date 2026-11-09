# Regulars

Regulars helps independent gyms keep new members past their first 90 days: it tracks every visit and flags who to
nudge. This is the build shown at the expo stall on 8 November 2026.

## Run it on a Windows laptop

You need Windows 10 or 11 on an Intel or AMD processor, Google Chrome, and internet for the setup. After that it runs
offline.

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Download for Windows, AMD64) and
   [Git for Windows](https://git-scm.com/download/win); the default choices are fine. Restart if asked, then open
   Docker Desktop and wait until the engine is running.
2. Open Terminal from the Start menu and get the project, then the ready-made build (98 MB, the one tested before the
   stall, so nothing is built on the laptop):

   ```powershell
   git clone https://github.com/Wannabe-Uzair/regulars C:\Regulars
   curl.exe -L -o C:\Regulars\regulars-image-amd64.tar.gz https://github.com/Wannabe-Uzair/regulars/releases/latest/download/regulars-image-amd64.tar.gz
   ```

3. Turn animations on: Settings, Accessibility, Visual effects, **Animation effects**. When it is off, Chrome tells the
   app to stand still and none of its animations play.
4. Start it:

   ```powershell
   cd C:\Regulars
   powershell -ExecutionPolicy Bypass -File .\stall-windows.ps1
   ```

   The first start loads the ready-made build, which takes a minute or two. If Windows Firewall asks about Docker
   Desktop Backend, allow it on Private and Public networks, so phones can reach the laptop.
5. Open <http://localhost:5175> in Chrome and press **Try the Demo**. Then drag `stall-check.html` onto Chrome: it
   should say "Ready. This laptop shows Regulars as designed." If not, it says what to fix.

To stop the app, press Ctrl+C in its Terminal window. The full stall runbook, with phones on a hotspot, copying the
data from the Mac, the reel loop and the deck, is [START-HERE-WINDOWS.txt](START-HERE-WINDOWS.txt).

On a Mac, run `scripts/stall.sh` instead (see "Run it in Docker" below), and check System Settings, Reduce motion is
off.

## The code

Tenure helps independent gyms keep new members past their first 90 days: it tracks every visit and flags who to nudge.
This repo is the TypeScript monorepo for the MVP: a Hono API, a React web app and the shared packages they use.

### Commands

| Command             | What it does                                       |
| ------------------- | -------------------------------------------------- |
| `npm install`       | install everything (Node 26, npm workspaces)       |
| `npm run dev`       | API on :5175 and the web app on :5174, with reload |
| `npm test`          | Vitest, every project                              |
| `npm run typecheck` | `tsc -b` over every project                        |
| `npm run lint`      | ESLint, including the dependency boundaries        |
| `npm run build`     | build the web app into `apps/web/dist`             |

### Run it in Docker

Before the first run:

- Docker Desktop is installed and running. Open a new terminal after installing it, so the `docker` command is found.
- Port 5175 is free: stop `npm run dev` first.
- The laptop is online. The first build fetches the npm packages and takes about 2 minutes. Later builds reuse them
  unless a `package.json` or the lockfile changed.

```bash
scripts/stall.sh
```

That finds this laptop's LAN address (from its default network route, then en0 and en1), hands it to the container,
which can't see it, and runs `docker compose up --build`. It prints the address phones should open. To use another
address, set `TENURE_LAN_IPS` yourself before running it. `scripts/stall.sh -d` runs it in the background, and
`docker compose stop` stops it. The address is fixed when the container starts, so after moving to another network,
run `scripts/stall.sh` again.

Phones must be on the same network as the laptop, and the network must let its devices reach each other. A phone's
hotspot does; some venue Wi-Fi doesn't.

The first start seeds the Northside demo gym in this laptop's time zone. After that the data lives in the `tenure-data`
volume, and later starts keep it, along with the zone it was seeded in. The demo is built around the day it was
seeded, so re-seed on the morning of the stall, and again afterwards to clear what visitors entered:

```bash
docker compose down -v
```

```bash
scripts/stall.sh
```

`down -v` deletes the `tenure-data` volume, so the next start seeds a fresh gym. Plain `docker compose up`, without
`scripts/stall.sh`, prints only localhost and a hint, and a first seed there uses America/Chicago.

Behind Docker, every visitor shares one device for the rate limits, because Docker Desktop's port publishing replaces
each client's address. Across the whole stall that means 5 sign-ups per 10 minutes, 30 kiosk check-ins per minute, and
10 failed logins per account per 10 minutes. If visitors mistype the demo owner's password 10 times, that login is
locked for everyone for 10 minutes, so sign the demo phones in yourself.

To move it to another laptop:

1. Install Docker Desktop, then open a new terminal.
2. Copy the repo on a USB drive (or with git, once it has a remote).
3. Run `scripts/stall.sh` while the laptop is online, so the first build can fetch its packages.

To carry the data across instead of re-seeding, copy the volume while the stack is stopped (`docker compose stop`).
On the old laptop:

```bash
docker compose run --rm -v "$PWD":/backup tenure tar czf /backup/tenure-data.tgz -C /data .
```

Then on the new laptop, before its first `scripts/stall.sh`:

```bash
docker compose run --rm -v "$PWD":/backup tenure tar xzf /backup/tenure-data.tgz -C /data
```

### Layout

```
apps/api            Hono API on Node 26, run straight from TypeScript
apps/web            React 19 + Vite SPA
packages/contracts  zod schemas shared by the API and the web app
packages/domain     pure business rules, no I/O
packages/db         Drizzle schema, migrations, repositories (SQLite)
packages/ui         design tokens, theme and primitives
packages/copy       every word the product shows
packages/config     shared ESLint and Vitest presets
marketing/, legacy/ the expo kit, and the old app kept as the port reference
```

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before adding a feature.
