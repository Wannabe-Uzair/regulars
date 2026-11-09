# Tenure MVP: where the build stands

Updated on 7 Nov 2026, about 21:30 Pakistan time. The first version is being built as **the stall version**, for an
expo stall demo on 8 Nov, to work by midnight on 7 Nov. The live record is
[milestone-2/RESUME.md](milestone-2/RESUME.md); the plan is the last section of
[milestone-2/FIRST-VERSION.md](milestone-2/FIRST-VERSION.md).

## The first version: where it stands (7 Nov)

- **The plan:** Uzair approved [FIRST-VERSION.md](milestone-2/FIRST-VERSION.md) in the morning (six phases, about 40
  jobs). In the afternoon he put it through his framework (question, delete, simplify, speed up, delegate), and it
  became the stall version: the core loop (the kiosk, Today live, the board, member pages, contacting a member), Try the
  demo and Reset the demo, the website's home and sign-up, Reports, and Settings with QR codes, on Docker with phones on
  a hotspot. Password reset and emails, the staff, import and templates screens, the small pages, and the archive and
  delete buttons wait for real pilot gyms.
- **The spec:** [SPEC.md](SPEC.md) and [SPEC.pdf](SPEC.pdf): 110 FRs, 28 NFRs, 10 use cases and 99 acceptance tests.
  Its §3 doesn't yet carry the 7 Nov answers.
- **Built and merged on `m2-core`:** phase 0 (foundations), phase 1 (the server side of every screen, each risky job
  with a fresh review), wave 1 (every stall screen), the review stop's picks, wave 2a (the ui harmony fixes, the Docker
  route and [DEMO.md](DEMO.md)) and wave 2b (Uzair's 12 design picks and the screens' harmony fixes F20 to F40). Then
  three fixes: the demo's check-ins for today end by 07:00, so every member can check in again on the stall's
  morning; log-out can't bring a cached query back; and the stall's home page follows the L2 drawing. On the final
  head: typecheck, lint, 2,240 tests, the build and 44 browser tests on Chrome and WebKit, desktop and phone.
- **Decisions:** every answer is in [milestone-2/answers.md](milestone-2/answers.md): the 13 edge-case answers, the
  stall version, the review stop, the 12 design picks, and the stall home, the underline and the laptop. The contract
  commits are in ARCHITECTURE.md.
- **Ready for the stall (7 Nov, about 19:00):** the final build passed the core loop in Docker over the network, and
  Uzair's try on his own phones worked. The stall laptop has an Apple chip, the tested setup; DEMO.md section 1 sets it
  up at home, online.
- **The stall critique (7 Nov, night):** six critics checked the stall for logic, cultural fit and words, social
  norms, the stall's process, ethics, and legal and privacy, by tomorrow's Pakistani visitors' norms
  ([milestone-2/stall-critique.md](milestone-2/stall-critique.md), 53 findings). Uzair's picks are applied: no sign-up
  on the stall's home page, the Sample data tag in the app header, the stall run as a US gym, the runbook's roles and
  rules, corrected visitor answers, and a team briefing ([STALL-BRIEFING.md](STALL-BRIEFING.md)).
- **Later, before real pilot gyms:** what the stall version leaves out, the security review, and SPEC.md §3 brought in
  line with the 7 Nov answers.

## Milestone 2: where it stood on 6 Nov (superseded by the first version)

- Paused at 94% of the 5-hour limit on 7 Nov, about 00:35 Pakistan time. Pick up from [milestone-2/RESUME.md](milestone-2/RESUME.md) after the reset at 02:40.
- Uzair said "Start milestone 2" on 6 Nov.
- Done: eight read-only scouts wrote a brief per area, and a completeness critic checked them against the scope. The
  areas are members, nudges, board and shell, kiosk, gym and staff, import and reports, global-ready and tests, and
  the design system.
- The result is 65 jobs and 45 decisions, which merge to 34 questions for Uzair.
- Later on 6 Nov the decisions round was held.
  - Uzair answered every question, the visual ones on the picks page (the artifact "Tenure milestone 2 picks").
  - The one pick still open is the kiosk's blend patterns, section N.
  - Every answer is in [milestone-2/answers.md](milestone-2/answers.md), and ARCHITECTURE.md is updated to match, in 14
    contract commits.
- The build runs straight through and pauses at the end. Every product question a builder hits stops for Uzair.
- Next:
  1. Per-job build briefs in `milestone-2/jobs/` (being written), with the copy job C0 and `plan.json`.
  2. The copy job.
  3. Build rounds 1–7.
- [milestone-2/README.md](milestone-2/README.md) has the steps, the merged questions with recommendations, the
  orchestrator's own calls and the round plan. The briefs, the critic's output, the jobs and the raw decisions are
  beside it.
- The milestone 1 sections below are the record of that milestone.

[ARCHITECTURE.md](ARCHITECTURE.md) is the contract: the decisions, layout, dependency rules, design tokens and
milestones. This file only says how far the build has got and what comes next.

## Where it stands

Milestone 1 (Foundations) is built, reviewed, fixed and checked in Docker, and the review's decisions are built in.
Every job and fix round is merged into `m1-foundations`, where every gate is green (800 tests in 75 files). The
browser check covered both themes at desktop and phone width, before and after the review's changes, and the Docker
stall runs on this Mac. Milestone 2 starts once Uzair says so.

| Step | State |
| --- | --- |
| Clarifying rounds 1–4 | Done. The answers are in ARCHITECTURE §2 |
| Scout of the old app | Done. The findings are under "The old app" below |
| Architecture plan | Done: `docs/ARCHITECTURE.md` |
| M1a: scaffold the monorepo | Done and checked |
| M1b: domain, data, design system, copy | Done |
| M1c: API and web (sign-in and Today) | Done |
| M1d: put it together, Docker files, review | Done: reviews, fixes, the browser check and the Docker run |
| Milestone 1 review | Done: decided with Uzair on 6 Nov and built in. Paused before milestone 2 |

### Commits

| Commit | Branch | What |
| --- | --- | --- |
| `42aa2c2` and the 4 before it | history | The expo kit and app, imported from `~/myo-app/tenure` with `git subtree split` |
| `1212cad` | `main` | The expo kit moved into `marketing/` and the old app into `legacy/app` |
| `abb1e0a` | `m1-foundations` | The architecture plan |
| `bf66f15` | `m1-foundations` | The scaffold: workspaces, TypeScript, lint boundaries, tests, CI |
| `1ce3ab2` | `m1-foundations` | Ignore `.worktrees/` |
| The commit that adds this file | `m1-foundations` | These notes, `CLAUDE.md` and the colour research |

Nothing is pushed. There's no GitHub remote yet, and pushing needs Uzair's own `gh auth login`.

### Scaffold check (6 Nov)

- `npm run typecheck`: exit 0
- `npm run lint`: exit 0
- `npm test`: 10 tests passed in 9 files
- `npm run build`: exit 0
- `node apps/api/src/main.ts`, then `GET /api/health`: `{"ok":true}`

### Worktrees

Every job ran in its own worktree, with its own `npm ci`, and was merged into `m1-foundations` once it passed its
checks. The next job in a lane started from the merged state. All of milestone 1's worktrees and their branches are
removed, so only the main checkout and `main` are left.

## Milestone 1 jobs

One fresh builder per job, one commit each. Each job's gates are re-run before it is merged.

| Job | Commit | State |
| --- | --- | --- |
| D1 dates, metrics, board orders, templates | `3fb01b7` | merged |
| D2 phone, SMS link, report maths | `8a7f1cd` | merged |
| D3 contracts: errors, health, auth, Today, live events | `b9c7514` | merged |
| CP1 copy package, catalogue, typed `t()` | `a467abe` | merged |
| CP2 sentence case (copy v1.1) | `e7e95e9` | merged |
| DB1 schema, migration, client | `606aac6` | merged |
| DB1b NOT NULL, missing foreign keys, invite role check | `1cf5725` | merged |
| DB2 gyms, users, sessions, invites repositories | `be3ad7d` | merged |
| DB3 members, check-ins, templates, nudges repositories | `23cd272` | merged |
| DB4 the Northside seed | `a08f8b3` | merged |
| UI1 tokens, generated CSS, base styles, contrast test | `b805c42` | merged |
| UI2 line roles, controls and display parts | `2387d05` | merged |
| UI3 theme runtime, theme controls, Logo, MeshBackground | `abd5c65` | merged |
| UI4 dialogs, menus, tabs, tooltips, toasts | `d7e4639` | merged |
| UI5 spaced-capital labels, Eyebrow | `465ee22` | merged |
| C1a API platform: config, errors, guards, module registry | `88cac48` | merged |
| C1b sessions, guards, rate limits, the auth module | `a898ac0` | merged |
| C1c event bus, live stream, adapter ports | `7cd625a` | merged |
| C1t the Today module and the seed-versus-domain agreement test | `019d4f9` | merged |
| C1d seed command, stall mode, root `seed` and `stall` scripts | `00c7475` | merged |
| DK1 Dockerfile, compose.yaml, scripts/stall.sh | `bd9a8ca` | merged; run on this Mac on 6 Nov (see the Docker rows below) |
| C2a web frame: registry, router, shell, guards, API client, live | `8970099` | merged |
| C2b theme wiring, header, route error boundary | `ff176e1` | merged |
| C2c sign-in and sign-up screens on the blend | `58e7a4f` | merged |
| C2d the Today screen | `64e0315` | merged |
| Reviews: domain+contracts, db, ui, api, web | | ui and web "changes needed"; the rest passed with low items |
| UF1 ui contrast on raised and hover states, layer and opacity tokens | `8decf3f` | merged |
| UF2 ui focus return, toast keyboard access, live field errors | `02c4196` | merged |
| WF1 web fixes: field errors, live sign-out, empty gym, page titles | `5799ad7` | merged |
| AF1 api fixes: safer seed, stream role check, Docker phone links | `e15a789` | merged |
| Dev proxy keeps the browser's Host (found in the browser check) | `f919617` | merged |
| Browser check fixes: phone page width, phone header, level KPI figures, no body margin, dark links underlined, `generate` hashes its whole package | `ee2ab6d`…`ea076e3` | merged |
| Docker check: four probes (network, image, docs and time zone, a review of the browser-check commits), each verified by a skeptic, then restart, stop and down/up | | 21 of 23 findings confirmed, 2 refuted; no data lost |
| Docker files: cached npm installs, host files kept out, API-only runtime packages, the `tenure` project and `tenure-data` volume, one-off commands, a first seed that can't half-finish, LAN detection from the default route | `a99f6b9` | merged |
| API: a clean stop (exit 0 in under a second with streams open), kiosk links only once there is a kiosk, a clearer phone-link hint | `ab2f2f5` | merged |
| API: a year's caching only for real assets, gzip for text, security headers on every response | `d5d8183` | merged |
| Tests that pin the browser-check fixes | `f72b0df` | merged |
| Review follow-ups: a SIGTERM test that can fail, Referrer-Policy same-origin, an anchored link test | `c60b3c5` | merged |
| M1d Dockerfile, compose.yaml, scripts/stall.sh, full gates, both themes in the browser, a fresh review | | done |
| The milestone 1 review's decisions in the contract (ARCHITECTURE §2, §9, §10, §13) | `6c682f9` | merged |
| Lines: one strength, so dividers and card edges match input borders (D3) | `2268430` | merged |
| Links: a lone link is a secondary-style button and a link in a sentence is underlined (A3), with copy v1.6 | `a98f029` | merged |
| Phone header: the gym name alone (B3). Page-title focus: a short bar beside the title (C3) | `ffcfcd0` | merged |
| Review follow-ups: 44 px sign-in footer buttons, the focus bar in forced colours, tighter tests | `8310f5b` | merged |
| The sign-in title test waits for the tab title, as the router test does (it failed once in a full run) | `4bc6c50` | merged |
| Review round: 2 builders and 2 fresh reviewers, then the gates, a Docker rebuild and the browser check in both themes at desktop and phone width | | done |

## For the milestone 1 review

Decided on 6 Nov in a mid-build round (recorded in ARCHITECTURE §2 and §9):
- **Sign-in screens:** a centred card on the blend.
- **Sign-up time zone:** detected from the browser, changeable in Settings.
- **Capitals:** sentence case everywhere, with small labels (status tags, labels above headings, table column
  headers) shown in spaced capitals by the design system.
- **Docker:** checked on this Mac on 6 Nov. It builds, seeds in the laptop's time zone, serves phones on the LAN, and
  keeps its data through a restart, a stop and a down/up.

Decided at the milestone 1 review, 6 Nov (recorded in ARCHITECTURE §2, §9, §10 and §13, commit `6c682f9`):
- **Going global:** global-ready rather than US-only, plus WhatsApp nudges. Built in milestone 2 (see the follow-ups
  below). Markets open one at a time, each with its own texting, billing, privacy and language decisions.
- **Logins at the stall:** a one-tap "Try the demo" sign-in in stall mode, built with the website in milestone 4. Until
  then the limit stays, and the stall team signs the demo devices in.
- **Quoted labels:** lines describe the action instead of naming a button ("Clear the search, or show all members"),
  commit `a98f029`.
- **The old copy in myo-app:** archived whole to `~/Archive/myo-app-tenure`; myo-app commit `fbbab0c` removed it.
- **Links:** a link on its own is a quiet (secondary-style) button; a link inside a sentence is underlined (A3),
  commit `a98f029`.
- **Phone header:** the gym name alone below 768 px, with no logo (B3), commit `ffcfcd0`.
- **Page-title focus:** a short focus-colour bar beside the title instead of the ring (C3), commit `ffcfcd0`. In
  forced colours it takes the system highlight (`8310f5b`).
- **Lines:** one strength; dividers and card edges match input borders (D3), commit `2268430`.
- **Browser support:** kept as is. The blend needs a 2024 or later browser, and older ones show the flat page ground.
- **Kiosk link:** the startup lines print it only once the kiosk module exists (for information; no decision needed).

## Follow-ups from the milestone 1 reviews

Five fresh reviews ran on the finished code. The fixes that matter now went into fix rounds before the pause. These
small items wait for milestone 2, each before the feature that would hit it:
- **CSV import (before building it):** the planner's reads and `applyImport` must share one transaction, or
  `applyImport` must re-check duplicates. Today a kiosk check-in or join can land between the plan and the write.
- **Member edits (before the PATCH route):** `members.update` treats `{ phone: undefined }` as "clear the phone".
  Only `null` should clear.
- **Writes that take a member or template id** (`applyImport`'s check-ins, `checkins.recordAtKiosk`, `nudges.record`)
  should check the id belongs to the same gym.
- **Postgres readiness:** state the NULL order in `members.listByName`; normalise timestamps at the repository
  boundary; stop exporting the raw tables and `Db` from `@tenure/db` (callers get repositories only).
- **Tests to add:** cross-gym scope for every repository read; the "+312 555 0142" phone reading; `coachName` when
  the coach is missing; a report nudge sent later today in another zone.
- **Sign-up time zone:** treat `timezone: null` or `""` like a missing one.
- **From the Docker check:** the seed still prints the kiosk path (it comes good when the kiosk lands); a Kpi with a
  hint would sit a hint's height above a neighbour without one, so settle that when a hint is first used; small JSON
  answers get gzipped too (harmless); brotli would need build-time compressed files; a CSP needs the boot script's
  hash; after a stream reconnects, Today refetches several times, which could be one.
- **Today's empty-gym buttons** ("Import members", "Open the kiosk") and "Open the board" arrive with those screens.

Global-ready work for milestone 2 (the review's "Going global" decision, ARCHITECTURE §2):
- **The gym's country and locale:** a `country` on the gym, detected at sign-up (like the time zone) and changeable in
  Settings, with the locale it implies. Sign-up already sends the browser's time zone; it sends the country too.
- **The phone rule:** numbers without `+` are read in the gym's country, `+` numbers as international, and a `+` number
  that isn't a real number for its country code but whose digits make a real local number is read locally (so
  "+312 555 0142" at a US gym is +1 312 555 0142). The server needs libphonenumber's fuller data for real-number checks.
  Rewrite the two US-only lines, `err.phone` and `kiosk.phone.hint`, for any country (copy, with a CHANGELOG entry).
- **Formats:** times and dates in the gym's locale (Today's clock is hard-coded to `en-US`, 12-hour, today).
- **The CSV import** asks for the date order (03/04/2026 is March 4 in the US and 3 April elsewhere), or takes it from
  the gym's locale and shows how it read the first rows.
- **Names:** a member may have a single name.
- **WhatsApp nudges:** each nudge offers WhatsApp next to Text, opening the coach's own WhatsApp (`https://wa.me/<number>?text=...`)
  the way Text opens their messaging app.
- **Later, per market (not milestone 2):** automated texts' local rules (US 10DLC, UK and EU consent, India DLT,
  Pakistan PTA), billing in local currencies with tax (Stripe doesn't take Pakistan-based businesses, so a company in
  a Stripe country or a merchant of record such as Paddle or Lemon Squeezy), privacy paperwork (GDPR and its
  equivalents), and translations (the font has no Arabic, Urdu or Devanagari, and Urdu and Arabic need right-to-left).

Rules for every lane:
- **No new dependencies**, with one exception from the first version (7 Nov): `@playwright/test`, the one test-only package, added by job E2E0. Otherwise the lockfile stays as it is, and everything they need is installed (see "Versions").
- **One owner per shared file.** Nobody edits the root `package.json` in M1b. Only the copy lane edits `turbo.json`
  (for the `generate` task).
- **Generated files are committed.** That covers `tokens.css` and the copy catalogue. A test fails when one is out of
  date, so `tsc -b` works on a fresh clone without a generate step.
- **Narrow checks, then hand back.** Each builder runs its own package's tests, typecheck and lint, then commits on
  its branch and hands back. The full gates run once, at the merge in M1d.

**Domain lane** (`m1-domain`). `contracts` may already import `domain` (ARCHITECTURE §4). The CSV pipeline is
ported in M2, with the import feature.
- `packages/domain`:
  - one `localDate` in the gym's time zone, with the clock as an argument
  - weekly visits, pace, status (the four rules in ARCHITECTURE §7), KPIs
  - `boardOrder`, "came back", template rendering, report maths
  - phone numbers through `libphonenumber-js`, as E.164
- Port the old tests: metrics (13), reports (12), nudge rendering and phone.
- `packages/contracts` (zod 4) covers:
  - error codes: `ErrorCode` is the 37 keys in `legacy/app/server/messages.mjs`
  - auth, members (`MemberSummary`), Today, events and health

**Data lane** (`m1-db`)
- The Drizzle schema for the 8 tables, with the fixes in ARCHITECTURE §6:
  - foreign keys on every `gym_id`
  - `nudges.template_id ON DELETE SET NULL`
  - a CHECK on the role
  - a unique `(gym_id, phone)` index
- drizzle-kit migrations, and `createDb` with pragmas: foreign keys on, WAL, a busy timeout.
- One repository per aggregate. Each returns typed records and hides the ISO-date handling.
- The Northside seed. It matches `legacy/app/server/seed/northside.mjs`: the same people, logins and numbers,
  deterministic for a given day. It takes the password hasher as an argument, because hashing belongs to the API.
  The `npm run seed` command comes with the API in M1c.

**Design system lane** (`m1-ui`)
- Tokens and base styles:
  - `tokens.ts` for both themes (ARCHITECTURE §9), generated into `tokens.css` by the package's own `generate` script
  - `base.css`: Hanken Grotesk, the type scale, tabular numbers and the motion tokens
- The theme runtime:
  - the no-flash boot script
  - `ThemeProvider`: the device setting by default, then the saved choice
  - the 240 ms View Transitions crossfade, and an instant switch under reduced motion
- A unit test that checks every contrast pair in §9.
- Primitives in CSS Modules over the token variables:
  - Button, IconButton, Field, Input, Select, Textarea
  - Card, Panel, Tag, StatusTag, Kpi, Toast, EmptyState, Spinner
  - Dialog, Tabs, Tooltip and Menu, on Radix
  - Logo (a three-quarter ring with an accent dot), MeshBackground (the colour-round mesh with grain), ThemeToggle

**Copy lane** (`m1-copy`)
- Copy `legacy/app/COPY.md` into `packages/copy`. The legacy copy stays as the reference until M5.
- Port `legacy/app/client/scripts/copy-from-md.mjs` to TypeScript. It produces a catalogue JSON plus a `CopyId`
  union, so `t('id')` fails to compile on a missing id.
- The API messages in COPY.md §16 get the ids `api.<key>`, using the keys in `legacy/app/server/messages.mjs`.
- A sentence-case pass, with a CHANGELOG line for each string it changes. Changing a word in a headline, button or
  nudge needs Uzair's pick first.
- A turbo `generate` task that runs every package's `generate` script.

## Then

**M1c: two builders, once M1b is merged**
- **C1, the API:**
  - the platform: config, HTTP errors and validation, CSRF, body limits, sessions and guards, the event bus, the SSE
    hub, the rate-limit store, the clock and the LAN address
  - the auth, Today, realtime and health modules
  - the adapter ports, with dev stand-ins that write to an outbox
  - the old tests these cover, ported
- **C2, the web app:**
  - the shell, the router and the feature registry
  - the API client, typed by contracts, and live events that invalidate queries
  - the theme toggle, sign-in and sign-up on the blended background, and Today

**M1d: put it together**
- Merge the M1b branches into `m1-foundations`, then C1 and C2.
- Write the Docker files (done; run on this Mac once Docker Desktop was installed):
  - `Dockerfile`
  - `compose.yaml`, with the `tenure-data` volume
  - `scripts/stall.sh`, which passes the LAN address in
- A runner runs the full gates. Check both themes in the browser pane. A fresh reviewer reviews the milestone diff.
- Pause for Uzair's review, with a phone notification.

Milestones 2 to 5 are in ARCHITECTURE §13.

## The old app (from the scout)

`legacy/app` is the reference for the port:
- **Docs:** `SPEC.md` (the rules), `COPY.md` (every word), `DEMO.md` (the stall runbook)
- **Server:** `app`, `auth`, `db`, `events`, `http`, `messages` (37 keys), `metrics`, `phone`, `queries` and
  `templates`
- **Routes:** `auth`, `members`, `staff`, `templates`, `nudges`, `gym`, `import`, `reports`, `kiosk` and `events`
- **Tests:** about 176, in `legacy/app/server/test`

The tables:
- `gyms`: name, unique slug, time zone, is_demo, pilot start, plan, unique kiosk token
- `users`: email (unique, ignoring case), role, scrypt hash, active
- `sessions`: sha256 token hash, expiry
- `invites`: token hash, role, used_at
- `members`: names, phone, email, joined_on, coach, source, and an external id unique per gym
- `checkins`: member, at, source
- `templates`: name, body, sort
- `nudges`: member, user, template, body, channel, sent_at

The coupling the port removes:
- SQL inside the routes
- 4 copies of `localDate`
- 2 phone normalisers that disagree
- 3 "came back" checks
- `boardOrder` on both the server and the client
- events emitted by hand in the routes
- route files that import each other

## Versions

**Runtime and tooling:**
- Node 26.0.0. It runs TypeScript directly, so the API has no build step, and relative imports end in `.ts`.
- npm 11.12.1, TypeScript 6.0.3, Turborepo 2.11.10.
- ESLint 10.13.0, typescript-eslint 8.72.0, eslint-plugin-boundaries 7.2.1, Prettier 3.9.10.
- Vitest 5.0.5, jsdom 30.1.3.

**Web:**
- React 19.3.1, react-router 8.5.0 (v8, not the v7 first planned), TanStack Query 5.104.5, Vite 8.3.5.
- Radix (dialog, dropdown-menu, tabs, tooltip), clsx, @fontsource-variable/hanken-grotesk.

**API and data:**
- Hono 4.13.13 with @hono/node-server 2.1.5, zod 4.6.7.
- drizzle-orm 0.45.4, drizzle-kit 0.31.11, better-sqlite3 13.0.3.
- libphonenumber-js and qrcode.

## Open items

- **The old copy in myo-app** is archived at `~/Archive/myo-app-tenure` (708 MB, build output included). Delete it
  once you're sure nothing in it is needed; everything tracked is also in this repo.
- **Docker** is installed on this Mac (6 Nov), and the stall stack runs here. For another laptop, follow the README's
  Docker steps. Not tried yet: an x86 laptop (the image here is arm64; each laptop builds its own), stall.sh's Linux
  branch, and a real phone on the venue's Wi-Fi, which may keep its devices apart.
- **Playwright** isn't installed. Milestone 5 runs it on the installed Chrome (`channel: 'chrome'`), so no browser
  download is needed.
- **The colour round.** Uzair answered "01 Deep Teal & Amber", then switched to this build, which uses Navy & Lime and
  Summer Ocean Breeze "for now". The research is saved in `docs/research/colour-round-2/`.

## House rules for this build

- **Commits:** commit each checked part on its milestone branch. Never push. Never merge into `main` without
  Uzair's OK.
- **Installs:** no global installs.
- **Demo logins:** don't repeat the demo login values in chat. They live in the seed.
- **Processes:** stop only processes you started, by pid. Another session works on Myo in `~/myo-app`, so leave it
  alone. Its Vite on port 5173 isn't ours.
- **Outside services:** accounts with Resend, Twilio, Stripe, hosting or Docker are Uzair's to create.
- **Expo materials** are display only: no QR codes, contact details, website or launch date. Team names only: Uzair
  Imran, Moiz Hamid, Zain ul Abideen, Ali Hassan.
