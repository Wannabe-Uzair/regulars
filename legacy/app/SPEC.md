# Tenure app — product spec and API contract (v1.0)

The single reference for building the Tenure app. The **look** is in `../brand/DESIGN.md` §12 (and §1–§11); this file is
the **product**: who uses it, the data, the rules, the API and how it runs at the expo. Server and client are built against
this contract in parallel, so change it here first if anything must change.

## 1. What it is

Tenure watches every new member's first 90 days, flags anyone who drops below the line, and lets a coach nudge them back
from their own phone. It is a **working app**: real accounts, a SQLite database, CSV import, a front-desk check-in kiosk and
live updates. It runs **on one laptop** for the expo (no hosting); phones reach it over the laptop's Wi-Fi hotspot.
There are no real payments and Tenure never sends a text itself.

## 2. Roles and permissions

| Can… | Owner | Coach |
| --- | --- | --- |
| See Today, the board, members | All members of the gym | Only members assigned to them |
| Open a member, send a nudge | Any member | Only their members |
| Edit a member's coach or phone | Yes | No |
| Use templates when nudging | Yes | Yes |
| Create, edit, delete templates | Yes | No |
| Reports, billing, settings, import, coaches and invites | Yes | No |
| Kiosk | Opened from Settings by the owner; the kiosk itself needs no login (it is authorised by its secret token) | — |

Every API route checks the role; a coach asking for another coach's member gets 404 (not 403), so ids don't leak.

## 3. Data model (SQLite via Node's built-in `node:sqlite`)

```sql
gyms      (id INTEGER PK, name TEXT, slug TEXT UNIQUE, timezone TEXT DEFAULT 'America/Chicago', is_demo INTEGER DEFAULT 0,
           pilot_started_on TEXT /* YYYY-MM-DD */, plan TEXT DEFAULT 'pilot' /* pilot|active */, kiosk_token TEXT UNIQUE, created_at TEXT)
users     (id INTEGER PK, gym_id INTEGER REFERENCES gyms, email TEXT UNIQUE COLLATE NOCASE, name TEXT, role TEXT /* owner|coach */,
           password_hash TEXT, active INTEGER DEFAULT 1, created_at TEXT)
sessions  (token_hash TEXT PK, user_id INTEGER REFERENCES users, created_at TEXT, expires_at TEXT)
invites   (token_hash TEXT PK, gym_id INTEGER, role TEXT DEFAULT 'coach', name TEXT, created_by INTEGER, created_at TEXT, used_at TEXT)
members   (id INTEGER PK, gym_id INTEGER, first_name TEXT, last_name TEXT, phone TEXT /* E.164 or NULL */, email TEXT,
           joined_on TEXT /* YYYY-MM-DD, gym-local */, coach_id INTEGER REFERENCES users, external_id TEXT, source TEXT /* csv|kiosk|seed|signup */,
           created_at TEXT, UNIQUE(gym_id, external_id))
checkins  (id INTEGER PK, gym_id INTEGER, member_id INTEGER REFERENCES members, at TEXT /* ISO 8601 UTC */, source TEXT /* csv|kiosk|seed */)
templates (id INTEGER PK, gym_id INTEGER, name TEXT, body TEXT, sort INTEGER, updated_at TEXT)
nudges    (id INTEGER PK, gym_id INTEGER, member_id INTEGER, user_id INTEGER, template_id INTEGER NULL, body TEXT, channel TEXT DEFAULT 'own-phone', sent_at TEXT)
```
Indexes on `checkins(member_id, at)`, `members(gym_id, coach_id)`, `nudges(member_id, sent_at)`.
The database file is `server/data/tenure.db` (git-ignored); tests use `:memory:`.

## 4. The rules (one module, `server/metrics.mjs`, unit-tested)

All dates are in the gym's timezone (`Intl.DateTimeFormat` with `timeZone`). "Today" is injectable for tests.

- **Day index** of a check-in: local date of `at` minus `joined_on`, in days (day 0 = the joining day). Several check-ins on one day count once.
- **In their first 90 days**: `daysSinceJoin = today − joined_on` is 0–89. Only these members are on Today and the board.
- **Week index** `w = floor(day / 7)`, weeks 0–12 (week 12 is days 84–89, 6 days long). The UI says "week w+1".
- **Finished weeks**: weeks whose 7 days are all before today (`(w+1)*7 <= daysSinceJoin`). The **current week** is `floor(daysSinceJoin/7)` and is in progress.
- **weeks[]** for a member: visit counts for weeks 0..current; the last entry is the current (partial) week.
- **Pace**: mean visits of the last (up to) 3 finished weeks, 1 decimal; `null` before the first finished week.
- **Status** (first match wins):
  1. `slipping`: the last two finished weeks each have fewer than 2 visits.
  2. `new`: fewer than 2 finished weeks.
  3. `on`: the last finished week has 3 or more visits.
  4. `below`: otherwise.
- **Days since last visit**: today − last visit's local date; `null` if never.
- **Today KPIs** (scoped to the viewer): `newMembers` = members in their first 90 days; `onTheLinePct` = round(100 × count(`on`) ÷ count(members with ≥ 1 finished week)), `null` if none; `slipping` = count(`slipping`); `nudgedThisWeek` = nudges sent in the last 7 days.
- **Came back** after a nudge: the member has a check-in within 7 days after `sent_at`.
- **Reports** (owner): see §6.

## 5. Templates and nudges

- Variables: `{first}` member first name, `{coach}` the sending user's first name, `{gym}` gym name, `{days}` days since last visit.
- Seed templates (Northside): "We missed you": `Hey {first}, we missed you this week. Want me to save you a spot in Thursday's 6 pm class? - Coach {coach}`;
  "First weeks": `Hi {first}, it's {coach} from {gym}. How are your first few weeks going? Tell me if I can help with anything.`;
  "One visit": `Hi {first}, it's been {days} days since we saw you. One visit this week is a good restart. Want me to save you a spot? - {coach}`.
  Sign-offs use a plain hyphen, so each text stays in the GSM-7 alphabet and goes out as one SMS.
- **Sending** (the coach's own phone): the client renders the final text, calls `POST /api/nudges` to record it, and the
  response carries `smsUrl = "sms:" + phone + "?&body=" + encodeURIComponent(body)` (the `?&` form works on iOS and Android).
  On a phone the client then opens `smsUrl`. On a computer it shows the text with COPY MESSAGE and the member's number. A
  member with no phone can still be nudged in person: the text is recorded with `smsUrl: null`.

## 6. API contract

JSON in and out under `/api`. Auth is an HttpOnly cookie `tenure_session`. Mutating requests must send
`Content-Type: application/json` and, when present, an `Origin` matching the host (CSRF guard). Errors are
`{ "error": "<sentence for the user>" }` with 400/401/403/404/409/429. Times are ISO strings, dates `YYYY-MM-DD`.

**Shared shapes**
```js
User   = { id, name, email, role: 'owner'|'coach' }
Gym    = { id, name, slug, isDemo, timezone, plan, pilotStartedOn }
MemberSummary = { id, firstName, lastName, name /* "Sam O." */, phone, coachId, coachName, joinedOn, daysSinceJoin,
                  week /* current week index */, weeks: [int], pace: number|null, status: 'new'|'on'|'below'|'slipping',
                  lastVisitOn, daysSinceLastVisit, lastNudgeAt }
```
**Auth**
- `POST /api/auth/signup {gymName, name, email, password}` → `{user, gym}` (creates the gym, the owner and the default templates; logs in). Password ≥ 8 characters.
- `POST /api/auth/login {email, password}` → `{user, gym}`; 401 "That email and password don't match." Rate limit: 10 tries per 10 minutes per IP + email → 429.
- `POST /api/auth/logout` → `{ok: true}`; `GET /api/auth/me` → `{user, gym}` or 401.
- `GET /api/invites/:token` → `{gymName, name, role}`; `POST /api/invites/:token/accept {name, email, password}` → `{user, gym}` (logs in; one use).

**Today, board, members**
- `GET /api/today` → `{kpis: {newMembers, onTheLinePct, slipping, nudgedThisWeek}, slipping: [MemberSummary] /* the viewer's own members first, then most days since last visit first */, checkinsToday: [{memberId, name, at}], board: [MemberSummary] /* slipping first, then by joinedOn desc */}`.
- `GET /api/members?status=all|slipping|on|below|new&coach=<id>&q=<text>` → `[MemberSummary]` (first 90 days only unless `all=1`).
- `GET /api/members/:id` → `{member: MemberSummary & {email, source}, days: [{date, day, visited}] /* days 0..89 */, checkins: [{at, source}], nudges: [{id, at, by, body, cameBack}]}`.
- `PATCH /api/members/:id {coachId?, phone?}` (owner) → `{member}`.

**Coaches and invites** (owner)
- `GET /api/coaches` → `[{id, name, email, role, active, members, slipping}]` (includes the owner).
- `POST /api/invites {name}` → `{link /* absolute URL using the request host */, expiresAt}`; `PATCH /api/coaches/:id {active}`.

**Nudges and templates**
- `GET /api/templates` → `[{id, name, body}]`; owner: `POST /api/templates {name, body}`, `PATCH /api/templates/:id`, `DELETE /api/templates/:id`.
- `POST /api/templates/render {memberId, templateId? , body?}` → `{body}` (variables filled for that member and the current user).
- `POST /api/nudges {memberId, templateId?, body}` → `{nudge: {id, at, body}, smsUrl}`; `GET /api/nudges?days=30` → `[{id, at, memberId, memberName, by, body, cameBack}]` (coach: their own).

**Reports** (owner) — `GET /api/reports` →
```js
{ cohorts: [{ month: '2026-08', joined, day30: pct|null, day60: pct|null, day90: pct|null }],   // last 4 join months; % of members who reached
                                                                                                // that day and visited in its prior 7 days
  visitsByWeek: [{ week: 1..13, stillComing: avg|null, slipped: avg|null }],                     // avg visits per week since joining;
                                                                                                // stillComing = visited in the last 14 days
  nudges: { sent, cameBack, rate } }                                                             // last 90 days
```
**Billing** (owner) — `GET /api/billing` → `{plan, pilotStartedOn, pilotDay /* 1..90 */, pilotDaysLeft, priceMonthly: 99}`. No payments: the plan button only explains that payments aren't live.

**Settings** (owner) — `GET /api/settings` → `{gym, kioskUrl /* kioskUrls[0] */, kioskUrls: [string] /* http://<each LAN IPv4>:<port>/kiosk/<token>, or the request origin's when there is none */, phoneUrls: [string] /* http://<each LAN IPv4>:<port> */}`; `PATCH /api/settings {name?, timezone?}`; `GET /api/qr?text=<url>` → `image/svg+xml` (any signed-in user; text must be one of this gym's phone or kiosk URLs).

**Import** (owner) — CSV as text in JSON:
- `POST /api/import/preview {kind: 'members'|'checkins', csv}` → `{columns, sample: [rows ≤ 10], mapping: {field: column|null}, rowCount, problems: [string]}`.
- `POST /api/import/commit {kind, csv, mapping}` → `{created, updated, skipped, problems}`.
- members fields: `external_id, first_name, last_name, phone, email, joined_on, coach_email` (first_name and joined_on required). Matching is by `external_id`, then by phone. Phones are normalised to E.164 (US default).
- checkins fields: `external_id` or `phone`, and `checked_in_at` (ISO or `YYYY-MM-DD HH:MM`, gym-local). Duplicates within 1 hour are skipped.

**Kiosk** (no login; authorised by the gym's `kiosk_token`; 30 requests per minute per IP)
- `GET /api/kiosk/:token` → `{gymName}`.
- `POST /api/kiosk/:token/checkin {phone? , memberId?}` → `{firstName, week, day, visitsThisWeek, status}`; 404 "We couldn't find that number."
- `GET /api/kiosk/:token/search?q=<first letters>` → `[{memberId, name}]` (max 6; first name + last initial only).
- `POST /api/kiosk/:token/join {firstName, lastName?, phone?}` → `{firstName, week: 0, day: 0}` (creates the member, joined today, coach by round-robin among active staff, and checks them in).

**Live** — `GET /api/events` (Server-Sent Events, signed-in users, scoped like the data) sends `checkin {memberId, name, at}`, `member {memberId}`, `nudge {memberId}`; a comment ping every 25 s.

## 7. Screens (client routes)

| Route | Who | What |
| --- | --- | --- |
| `/login`, `/signup`, `/invite/:token` | anyone | Accounts. Sign-up creates the gym; after it, an empty Today with IMPORT MEMBERS and OPEN THE KIOSK |
| `/` Today | both | Owner: TODAY with 4 KPIs, SLIPPING NOW (hazard band) with NUDGE →, CHECKED IN TODAY, a small board. Coach: MY MEMBERS, the same for their members |
| `/board` | both | The full 90-day board: filters by status and coach (owner), search, legend; a row opens the member |
| `/members`, `/members/:id` | both | List with search and filters; the member page: name, status, coach, phone, joined, the 13-week row and the 13 × 7 days grid, check-ins, nudges, NUDGE →, (owner) change coach |
| nudge composer | both | A dialog or sheet from NUDGE →: template picker, the filled text (editable), TEXT {FIRST}, e.g. TEXT SAM (phone) or COPY MESSAGE + RECORD NUDGE (computer) |
| `/nudges` | both | History, with CAME BACK marks |
| `/reports` | owner | Cohorts table, the visits-by-week chart, nudge results |
| `/templates` | owner edits, coach reads | List, edit with a live preview for a sample member |
| `/settings` | owner | Gym name and timezone; staff (coaches, invite links, deactivate); OPEN ON A PHONE (URLs + QR); KIOSK (link + QR + OPEN KIOSK); IMPORT (CSV with preview and column mapping) |
| `/billing` | owner | Pilot day N of 90 with the 3-segment tape filling, then $99 a month, unlimited members; "Payments aren't live in this demo." |
| `/me` (phone) | both | Name, gym, LOG OUT |
| `/kiosk/:token` | front desk | Full-screen check-in: phone keypad or name search, NEW HERE? JOIN, a big WELCOME BACK, SAM. WEEK 4. confirmation that resets after 5 s |

Phone tabs: owner TODAY · BOARD · MEMBERS · MORE (reports, templates, settings, billing, log out); coach TODAY · BOARD · NUDGES · ME.
The app is a PWA: `manifest.webmanifest` (name "Tenure: member retention", short name Tenure, display standalone, colours #141414) and 192/512 px icons drawn from the logo.

## 8. The demo gym (`server/seed.mjs`, `npm run seed` rebuilds it from scratch)

- **Northside Strength** (`is_demo = 1`, pilot started 23 days before today). Its timezone is the seeding computer's own
  (`TENURE_TZ` overrides it), so "today" and check-in times match the clock at the stall; tests use America/Chicago.
- Staff: **Mike R.** (owner, also coaches), **Priya S.** and **Jordan T.** (coaches). Logins use `@northside.test` addresses; the
  shared demo password is defined once in `seed.mjs` and printed by `npm run seed` (never in the client).
- **60 members in their first 90 days**, round-robin across the three staff, plus 25 who joined 90–150 days ago (for reports).
  Includes the expo kit's six sample members with their kit patterns as their finished weeks plus a partial current week:
  Maya R., Jo W., Dev P., Chris L. (BELOW THE LINE), Hana L. and Sam O. (both SLIPPING, coach Mike). The rest come from archetypes:
  steady (3–4 a week), drifting (3 → 1), stopped after 2–4 weeks, brand new (under 14 days), and came back after a nudge.
  About 12 are SLIPPING, spread over all three staff. Phones use the fictional 555-01xx range (e.g. +13125550142).
- About 20 past nudges over the last 6 weeks, some followed by a visit within 7 days.
- The seed is deterministic (seeded random) and relative to today, so the demo always looks current.

## 9. Build, run, test

```
tenure/app/
  SPEC.md                this file
  package.json           root scripts only: dev, seed, test, stall (no dependencies of its own)
  server/                package.json (hono, @hono/node-server, qrcode) · index.mjs · db.mjs · auth.mjs · metrics.mjs ·
                         routes/*.mjs · seed.mjs · csv.mjs · events.mjs · test/*.test.mjs (node --test) · data/ (git-ignored)
  client/                package.json (react, react-dom, react-router-dom, vite, @vitejs/plugin-react) · index.html ·
                         src/ (main.jsx, api.js, app.css, components/, screens/) · public/ (manifest, icons)
```
- `npm run dev`: the API on port 5175 and Vite on 5174 (proxying `/api` to 5175). Port 5173 is taken by the Myo prototype's dev server.
- `npm run stall`: builds the client and serves it from the API server on `0.0.0.0:5175`; prints the phone URLs. This is the expo mode.
- `npm test`: the server's `node --test` suite (metrics, auth, permissions, import, kiosk, nudges) must pass.
- The client imports the brand straight from `../../brand/` (tokens.css, kit.js, wordmark.js), so the app and the expo kit can never drift apart.
- Security basics: scrypt password hashes (`scrypt$N$r$p$salt$hash`), session tokens stored as SHA-256 hashes, HttpOnly SameSite=Lax cookies, role checks on every route, input validation at the API boundary, no secrets in the client.
