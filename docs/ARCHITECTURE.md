# Tenure architecture

This is the contract for the MVP. It covers how the code is split, what may depend on what, and how a new screen or
backend feature is added without touching anyone else's code. If a change needs a rule broken, change this file
first, in its own commit.

## 1. What the MVP is

Tenure helps independent gyms keep new members past their first 90 days, opening one market at a time (§2, "Going
global"). It tracks every visit, flags anyone under 3 visits a week, and lets a coach nudge them with a text or a
WhatsApp message from their own phone. The MVP is the existing app
(owner and coach dashboard, 90-day board, members, kiosk check-in, CSV import, nudges, templates, reports, settings,
billing), evolved into this architecture and restyled. It adds:

- **A public website:** home, pricing and a sign-up that flows into the app.
- **Account basics:** password reset, email verification, and coach invites sent by email.

## 2. Decisions (from the clarifying rounds, 6 Nov 2026)

| Topic | Decision |
| --- | --- |
| Starting point | Evolve the existing app (now in `legacy/app`, removed once ported) |
| Repo | Its own repo, `~/tenure`; the expo kit lives in `marketing/`; nothing pushed until GitHub is set up |
| Stack | TypeScript monorepo: React 19 + Vite web app, Hono API on Node 26, shared packages, npm workspaces + Turborepo (pnpm isn't installed and Node 26 has no corepack; switching later is small) |
| Data | SQLite now through Drizzle ORM, kept Postgres-ready (all SQL behind repositories) |
| Outside services | Plug-in adapters for email, SMS and payments. Development stand-ins write to a local outbox; real providers (Resend, Twilio, Stripe) plug in later. Nudges still open the coach's own phone by default |
| Sign-in | Email + password with server sessions; the auth module allows Google or magic links later |
| Hosting | Local and Docker-ready, so it can move to another laptop with one command |
| Themes (revised 7 Nov, the redesign) | One light theme, Iris (it replaces Summer Ocean Breeze; Uzair: light only). No theme toggle or choice anywhere, and the page doesn't follow the device: `color-scheme: only light` and a `theme-color` of the ground keep a phone in dark mode from darkening it (§9). Navy & Lime's dark tokens and the theme runtime stay, unused, until after the stall, then go |
| Light-mode buttons (revised 7 Nov, Iris) | One tint for everything you can act on; no amber or green tonight (status is neutral shapes, §9 The status marks). Red only for slipping (on those same dots, tags and the edge), destructive actions and errors. The Nudge is a tinted capsule: tint words on the tinted fill `#EAE9FC`, never red. Buttons are capsules: primary (the tint fill, a screen's one main action), tinted (the capsule above: Nudge and the sheet's channels), plain (tint words, no fill), quiet, secondary, danger (red edge and words) and destructive (the filled red confirm of an alert, white words) |
| Status on the board (revised 7 Nov, the redesign) | Each status has its own shape: a filled dot for On the line, a half ring for Below the line, an empty ring for New and a falling triangle for Slipping. Only the triangle and the word Slipping are red; amber and green go unused tonight (§9) |
| Type (revised 7 Nov, the redesign) | Inter 4 (variable, with optical sizes) everywhere: the app, the kiosk, the home page and the expo kit. Self-hosted so the stall laptop works offline (§9). It replaces Hanken Grotesk |
| Blended background (revised 7 Nov, Iris) | None in light: the website, the sign-in screens and the kiosk show the plain page ground, like the app. The dark theme keeps its blends until it goes after the stall |
| Way of working | Milestones on branches, a pause for review after each one, phone notification at each milestone |
| Sign-in screens | A centred card on the page ground: the logo, the tagline, then the form |
| Sign-up time zone (revised 7 Nov) | Detected from the browser and sent with the form. When that zone isn't in the chosen country, the gym takes the country's own zone: London, Karachi or Dubai, New York for the US and Toronto for Canada. A Country change in Settings does the same, and the owner can still pick another of the country's zones there |
| Capitals (revised 7 Nov, Apple's split) | Title Case on what you press and on short titles: buttons and links styled as buttons, tabs, menu and picker items, segments, and page, section, sheet, dialog and empty-state titles. Sentence case on everything you read: sentences, lines, help, errors, toasts, field and figure labels, table headers, status words, tags and accessible names, and on any title or button that is a full sentence or a question, which keeps its punctuation ("Forgot your password?"). Words show as COPY.md writes them: no spaced capitals, no CSS text-transform. Small labels are sentence-case footnotes in soft text (§9) |
| Docker check | Run on this Mac before the milestone 1 review, once Uzair has installed Docker Desktop |
| Going global (M1 review, settled for M2) | Global-ready, one market at a time. Milestone 2 opens five: the US, Canada, the UK, Pakistan and the UAE, and only these can be chosen at sign-up and in Settings. Each gym has a country, detected at sign-up (a country outside the list is left for the owner to choose) and changeable in Settings. The demo gym takes the laptop's country from its time zone (`TENURE_COUNTRY` overrides it, and outside the open markets it falls back to the US), and keeps its +1 sample numbers. Phones: a number without `+` is read in the gym's country; a `+` number is international, unless its digits also make a real local number, which then wins. Times and dates follow the gym's locale, with international English (en-001) where a country has no English formats. The Settings zone list keeps the old 7 zones for US gyms and lists every zone by city elsewhere. The CSV import reads dates in the country's order, shows how the first rows read, and offers a switch to the other order. A member may have a single name: forms ask for a first name and an optional last name, and the import splits a full-name column. A nudge's composer offers Text Message, WhatsApp and Copy Message. Texting rules, billing currency and tax, privacy paperwork and translations are each decided per market |
| Demo sign-in at the stall (M1 review) | A one-tap "Try the demo" sign-in in stall mode, built with the website in milestone 4. Until then the login limit stays at 10 failures per account per 10 minutes, and the stall team signs the demo devices in |
| Links (M1 review, M2; revised 7 Nov, the redesign) | A link that stands on its own takes the secondary button's look (§9); a link inside a sentence is underlined. In lists (the board, Today, Members) each row opens the member, with no "Open" button: on a laptop table the name is the link, and on Today's rows and phone cards the whole row, its accessible name including the member's name (flow-3B, flow-4A) |
| App shell (M2, widening the M1 review's phone header; revised 7 Nov, the redesign) | Below 1024 px a header shows the gym name, with no logo, and a bottom tab bar holds the role's pages, with no More: Today, Board, Members, Reports and Settings for owners, and Today, Board and Members for coaches. Each tab's label is one word, at 12 px or more; the bar is padded by the safe-area inset, and `--toast-clearance` matches its height. The open page's tab is marked (`aria-current="page"`), and stays marked on a page under it. There is no account button tonight. Coaches log out from a quiet Log out in the phone header, owners from the Account group in Settings, which shows below 1024 px only. Below 48rem each page's title is a large title (34 px) at the top of the content that, as you scroll, tucks into the glass top bar as its small centred title: an `IntersectionObserver` on the title sets `data-tucked` on the bar once half the title has passed under it (so a scroll that stops part-way shows one title, never none and never two), the gym name gives way to the title, and the Sample data tag holds the bar's trailing edge, before a coach's Log out, leaving the leading edge free as iOS keeps it for Back (audit B2-05, B2-20). The page title stays the one h1; the bar's copy is hidden from assistive tech. From 48rem titles stay in the content. From 1024 px a sidebar holds the logo, the gym name and every page, with Log out at its foot. Owners see "Pilot day {n} of 90" by the gym name from 768 px; coaches and phones don't. In the stall version (7 Nov) the left-out pages (Nudges, Templates, Billing and Me) are hidden from the navigation. There is no theme toggle or choice (light only, 7 Nov) |
| Page-title focus (M1 review) | When a navigation moves focus to the page title, a short focus-colour bar beside it shows where focus is, not the full ring |
| Lines (M1 review; revised 7 Nov, Iris and the redesign) | Two strengths. The separator (`line`) is a hairline for dividers and card edges, decoration that isn't held to 3:1. Input and control edges keep `line-strong`, at least 3:1, and so does the board's empty-week outline, a data mark. Groups stand apart from the ground by their fill, not by an outline. In dark, `line` keeps the border colour until the dark column goes |
| Browser support (M1 review) | The blended background needs a 2024 or later browser (`light-dark()`); older browsers show the flat page ground instead |
| Members (M2) | Owners and coaches can add a member by hand; a coach's new member is theirs. An owner edits a member's coach, phone and name. Members shows the first 90 days by default, with "Everyone" and "Archived" views. From day 90 a member shows "Past 90 days" in soft text instead of a status, and the status chips cover the first 90 days only (7 Nov). Members and the member page show full names, and their row links are named with them; the board, Today and toasts keep "First L.", and the archive and delete confirms name the member in full (7 Nov) |
| Archiving (M2, revised 7 Nov) | Owners archive any member, coaches their own, each with a confirm. An archived member leaves every list and the kiosk search, but still counts in Reports. They come back on "Restore Member" or a matching import row: a members row not marked as left, or a visit dated after the archive (7 Nov). At the kiosk, a typed phone or a join that matches an archived member shows "Please see the front desk to check in." and records nothing |
| Deleting a member (first version) | Owners can permanently delete an archived member ("Delete Permanently", confirmed by "Delete {name}?" and "Delete"), for data-protection requests. Their check-ins and nudges go too, and Reports lose them. Older backups still hold them |
| Staff (M2, with the 7 Nov edge cases) | Owners invite coaches or co-owners, and can deactivate and reactivate staff. Walk-ins from the kiosk go to the active coaches in turn, and to an owner only when the gym has no active coach; Add member starts on the coach the kiosk would pick next. Deactivating someone moves their members, archived ones too, to the person picked in its confirm ("Move their members to"), or shares them out in turn, the default; reactivating gives none back. An invite to an email that already has an account is refused, saying why (already on your staff; inactive, so reactivate them; or an account at another gym). A coach can't become an owner in the first version |
| Billing (first version) | No plan button and no price. Billing shows the pilot day, the 90 days as one bar, and that the pilot is free. The price appears everywhere at once when Uzair sets it. From day 91 the sidebar drops its pilot line, and Billing says "Your free pilot ended on {date}. Tenure keeps working as before.", still with no price and no lock-out (7 Nov) |
| The first version (7 Nov) | The whole MVP built simply, with core flows tested end to end, before the polish (§13). Runs locally and in Docker; Chrome and Safari only (Chrome on laptops and Android; Safari on Mac, iPhone and iPad). Speed targets on the stall laptop with the demo gym: screens under 2 s, a kiosk check-in under 1 s, a live update under 2 s, a 2,000-row import's check step under 5 s |
| Email and reset links (first version) | Stand-ins only: email goes to the outbox table. The outbox page exists only in development; on the stall laptop and in Docker, `npm run reset-link -- <email>` prints a reset link. No email verification in the first version. Invites are sent by email to the outbox, with the link also shown to copy. Outside development, where no email can be read, the invite dialog says "Send this link to {name}. It works once and expires on {date}.", the reset page adds that emails aren't sent yet, so ask whoever runs Tenure for a link, and the invite button stays "Create link" (7 Nov) |
| Sessions (first version, 7 Nov) | The first request each day moves a session's expiry 30 days on, so a screen in daily use stays signed in. Log-out, deactivation and a password reset still end it at once. A real expiry lands on Log in with "Your session ended. Log in again." |
| The import (first version, 7 Nov) | On a re-import the file wins, but the check step lists what will change ("Changes 2 names, 1 phone and 1 coach"), and a full name that only splits differently from the stored one is left alone. An optional Status column: rows marked cancelled, expired or inactive come in archived, and an archived member they match stays archived. A check-in row restores an archived member only when it's dated after the archive; earlier visits are added as history |
| Reports' members (first version, 7 Nov) | Reports count a member only if they joined on or after the gym's first recorded visit, so imported history counts only where it covers someone's first 90 days |
| The stall demo (first version, 7 Nov) | "Try the Demo" leaves everything usable, deleting included. On the demo gym, joining at the kiosk asks for a name only, with no phone field; checking in by phone still works with a sample member's number. "Reset the Demo" shows in stall mode, behind a confirm, for anyone at the stall. On Home in stall mode, "Try the Demo" is the one filled button (in the bar, the hero and the closing section) and "Reset the Demo" a quiet small button in the footer, behind its confirm; "Log In" and "Set Up Your Gym" don't show, since a sign-up on the offline stall laptop reaches no one (Uzair, after the stall critique, 7 Nov). It keeps the kiosk link, puts back everything else (members, visits, nudges, templates, settings, staff and invites, with the demo owner active), and signs every demo device out. `npm run demo:reset` does the same |
| Website (first version) | Home, Pricing and sign-up offer a free 90-day pilot, with no price shown. The home page's words come from a copy round. In stall mode, "Try the Demo" signs a visitor in as the demo owner with everything usable; a command, and a button in stall mode, re-seed the demo between visitors. The home page is a product page (home-1): a sticky opaque bar with the mark, "Regulars" and Try the Demo; a centred hero whose headline is the tagline, "Turn new members into regulars.", over the board floating on `--shadow-float`; the sourced figures with footnotes; Try the Demo again; and the footer. No glass on it. The board is a clip rendered in Remotion, "the board coming alive" (Uzair, 8 Nov): a muted 9-second loop the page plays as a video file (H.264 MP4 and VP9 WebM with a WebP poster, in `apps/web/public/media/`, made by `marketing/reel-remotion/build-hero.sh`), decorative and hidden from assistive technology, one cut for the laptop's table and one for the phone's rows; under reduced motion the page shows the poster alone. Rendered clips the app plays come from `marketing/reel-remotion`; no package is added to the app for them |
| Home-screen kiosk | The kiosk's add-to-home-screen app (manifest and icons) waits for milestone 5 |
| The name (7 Nov, the redesign) | The product is **Regulars** (Uzair's pick). The rename is display-only: what visitors see changes (COPY.md's `brand.name` and the sentences that use it, the tab title, the manifest, the slides, reel, brochure and standee), while the codename stays `tenure` for every internal identifier: the `@tenure/*` packages, the `tenure_session` cookie, the `TENURE_*` variables, the `tenure-data` volume, `tenure.db` and the server's log lines. Renaming those would sign every device out and break the stall laptop's setup |
| The expo kit (7 Nov, the redesign) | At Uzair's request, `marketing/` is redone tonight in the new design and the name Regulars: the brochure and the standee first, since they go to print, then the slides and the reel. This lifts the hands-off rule for `marketing/` only; `legacy/app` stays hands-off |
| Sample data tag (M2; 7 Nov) | On the kiosk, and in the app's header after the gym's name, for the demo gym, so the demo's made-up results never pass for real ones (Uzair, after the stall critique, 7 Nov) |
| Nudge buttons (M2; revised 7 Nov, the redesign) | On Today's "Slipping Now" rows and in the member page's header; not on the board |
| Contact choices (M2; revised 7 Nov, the redesign) | The composer shows the channels stacked under the message, with no menu: Text Message (phones only), WhatsApp and Copy Message, each a link that records the nudge on the same tap. A member with no phone keeps "Record Nudge". Every nudge shows its channel: Text, WhatsApp, Copied or In person; nudges from before milestone 2 show none |
| Depth (7 Nov, the redesign) | A glass rail over solid content, with Fluent's shadow ramp: four shadow roles (lift, flyout, float, modal) on what floats, and lift only on clickable cards hovered with a pointer. Glass only on the phone's top bar and tab bar, which carry primary text only, with an opaque fallback; popovers and sheets opaque; none on the kiosk, the home page or sign-in. Compact rows on the laptop board only, keeping 44 px hit boxes. No acrylic noise (§9) |
| Icons (7 Nov, the redesign) | Phosphor 2.1.1 (MIT), Regular and Fill, vendored as TSX components in `packages/ui` with its licence beside them: `currentColor`, `aria-hidden`, sized in em. Filled tab icons, the selected tab tinted; Regular in rows and the sidebar, filled when selected. No icon font, sprite, CDN or package (§9) |
| Choices (M2) | The status filter is chips, each with its status shape. Two- and three-way choices (Members' views) are a segmented capsule |
| Progress (M2) | Billing draws the 90 days as one bar; the kiosk says the day in words only |
| Reports chart (M2) | Still coming is solid in the text colour; slipped is dashed in the slipping colour, with point markers; the 3-a-week line is dotted in soft text. Each line is labelled at its end, with no legend |
| Motion (M2; revised 7 Nov, the redesign) | Calm springs, only where motion means something: a press, sheets and dialogs, Nudge's busy-then-done, the kiosk welcome's check and ring, the phone's large title tucking into the top bar (a fade on the quick spring), and the board's check-in pop (1.25 to 1 over the slow duration, kept) with a row tint that fades (§9). A press gives 3% under a finger only. Opening a member stays instant. Nothing moves under reduced motion |

## 3. Repo layout

```
apps/
  api/            Hono API on Node 26. Serves the built web app in stall/Docker mode
  web/            React SPA: public website, the app (/app/*), kiosk and invite pages
packages/
  contracts/      zod schemas for every request, response, event and error code (the API's single source of truth)
  domain/         pure business rules: dates in a gym's time zone, weekly visits, pace, status, KPIs, orders,
                  "came back", templates, phone numbers, report maths, the CSV pipeline. No I/O, no Node APIs
  db/             Drizzle schema (one file per table group), migrations, the database client, repositories, seed
  ui/             design tokens for both themes, generated CSS variables, theme runtime, primitives, icons
  copy/           COPY.md (every word the product shows) → typed catalogue and t()
  config/         shared tsconfig, ESLint and Vitest presets
marketing/        the expo kit (brochure, standee, slides, reel and their build tools), redone in the redesign (§2)
legacy/app/       the old app, kept as the reference during the port, deleted at milestone 5
docs/             this file, SPEC.md (rules), DEMO.md (stall runbook), decisions/ (one short ADR per later change)
scripts/          dev, seed, stall
Dockerfile, compose.yaml
```

## 4. Dependency rules (enforced by ESLint, `eslint-plugin-boundaries`)

```
web ──▶ ui, copy, contracts, domain            api ──▶ db, domain, contracts, copy
ui ──▶ (react, radix)   db ──▶ (drizzle)   domain ──▶ (libphonenumber-js)   contracts ──▶ domain (zod)   copy ──▶ (nothing)
```

- **Apps:** apps never import from another app. Packages never import from an app.
- **API modules:** an API module imports `platform/` and packages only. It reaches another module only through that
  module's `index.ts` (its public service), or by listening to its events. Never through its files.
- **Web features:** a web feature imports `shared/` and packages only. Features link to each other by URL. They never
  import each other's files. `app/` is the only place that knows every feature.
- **Database access:** only `packages/db` talks to the database. No SQL in routes, services or tests (tests use
  repositories or the seed).
- **Domain:** `packages/domain` is pure. Same input, same output. The clock and time zone are always arguments.
  ESLint enforces it there: no Node modules, no `process`, no `Date.now()` and no argument-less `new Date()`.
- **Contracts:** `contracts` may import `domain`, so names both sides share, such as the four statuses, are written
  once.

These rules are what keep two people (or two agents) from colliding. A new feature is a new folder plus one line in a
registry.

## 5. API (`apps/api`)

```
src/main.ts           read config, open the database, pick adapters, start the server (and stall mode)
src/app.ts            createApp(ctx): platform middleware + the module registry
src/platform/         config (zod-validated env), http (errors, validation, CSRF, body limits), auth (sessions,
                      guards), events (typed bus), rate-limit (store interface), lan, clock
src/modules/<name>/   index.ts (ApiModule), routes.ts, service.ts, *.test.ts
src/adapters/         email/, sms/, payments/: a port (interface) + a dev stand-in (+ a real provider later)
```

- **A module** is `{ name, register(router, ctx), subscribe?(bus, ctx) }`. `src/modules/index.ts` lists the modules in
  one array.
- **Routes** validate input with the `contracts` schema, call the service, and return contract-shaped JSON. Errors are
  `{ error: { code, message } }`, with the message coming from `copy` (no sentences in code).
- **Services** hold the use cases. They call repositories and domain rules. After a successful write they publish a
  **domain event** (`checkin.recorded`, `member.joined`, `member.updated`, `nudge.recorded`, …). Routes never emit
  events themselves.
- **Realtime** (the `realtime` module) subscribes to the bus and fans events out over SSE (`GET /api/events`) with the current scope rules:
  owners get everything, coaches only their own members. The stream closes when the session ends, and when the
  server stops.
- **Context** (`ctx`) is the one dependency bag: `db` (repositories), `bus`, `clock`, `config`, `adapters`,
  `rateLimits`, `shutdown`, and `lan` (the machine's LAN addresses, for the kiosk, phone and invite links in stall
  mode; empty unless the server listens on every address). Tests build it with an in-memory database, a fixed clock
  and a fixed address.
- **Stopping:** on SIGTERM or SIGINT the server stops taking connections, fires `ctx.shutdown`, closes the database
  and exits 0 within about a second; a fallback timer exits after 3 s if something hangs. A response that stays open
  (the event stream) registers on `ctx.shutdown.onStop`, so a stop never waits on it. The kiosk answers each request
  and holds nothing open.
- **Sessions and passwords** keep today's scheme:
  - the `tenure_session` cookie: httpOnly, SameSite=Lax, and `Secure` when served over HTTPS
  - the session token is stored as a sha256 hash
  - passwords use scrypt
  - `c.var.actor` is a typed `{ id, gymId, role, name, email }`, never a raw row
- **Rate limits** go through a store interface. It is in memory now; Redis can plug in later for more than one
  server. Today's limits are kept: login 10 per 10 min, signup 5 per 10 min, kiosk 30 per minute.

## 6. Data (`packages/db`)

- **Schema and migrations.** The Drizzle schema follows today's 8 tables (`gyms`, `users`, `sessions`, `invites`,
  `members`, `checkins`, `templates`, `nudges`). Versioned migrations (drizzle-kit) replace "create if missing on every
  start". The first version adds `gyms.country` (migration 0001), `members.archived_at` (migration 0002), and
  `password_resets` and `outbox` (migration 0003). Deleting a member cascades to their check-ins and nudges.
  `email_verifications` waits until email verification is built.
- **Fixes made in the port:**
  - foreign keys on every `gym_id`
  - `nudges.template_id ON DELETE SET NULL`
  - a CHECK on `users.role`
  - a unique `(gym_id, phone)` index, so phone uniqueness is enforced by the database, not by code
- **Repositories** are one per aggregate (`gyms`, `users`, `sessions`, `invites`, `members`, `checkins`, `templates`,
  `nudges`). They return typed records. Read models for the board and Today are built from repository data plus
  domain rules.
- **Dates** stay ISO text in SQLite (`YYYY-MM-DD` and UTC timestamps). Repositories hide this, so a Postgres move
  changes only `packages/db`.
- **Seed:** the Northside demo gym. It is deterministic for a given day, with the same people, logins and numbers as
  the stall demo. Its country follows the laptop (§2, "Going global").

## 7. Domain (`packages/domain`)

One home for every rule. The port merges today's copies:
- one `localDate` (it exists 4 times today)
- one phone normaliser, international and E.164 (today the kiosk and the CSV import disagree)
- one "came back" check (3 copies today)
- one `boardOrder`, shared by API and web

The status rules (first match wins):
1. **slipping:** 2 or more finished weeks, and the last two each under 2 visits.
2. **new:** fewer than 2 finished weeks.
3. **on the line:** the last finished week had 3 or more visits.
4. **below the line:** everything else.

Every rule keeps its tests. The seed's independent re-implementation stays as a test oracle.

## 8. Web (`apps/web`)

```
src/app/              router, providers (TanStack Query, theme, toasts), the feature registry, app shell
src/features/<name>/  index.ts (WebFeature: routes + nav), screens/, components/, api.ts (query keys + hooks)
src/shared/           API client (typed by contracts), live events, hooks, utils
```

Routes:

| Area | Routes |
| --- | --- |
| Website | `/` (home) and `/pricing` |
| Auth | `/login`, `/signup`, `/reset`; `/verify` later |
| Development only | `/dev/outbox` (the stand-in email outbox), on only in `npm run dev` |
| App | `/app` (Today), `/app/board`, `/app/members`, `/app/members/:id`, `/app/nudges`, `/app/templates`, `/app/me` |
| App, owner only | `/app/reports`, `/app/settings`, `/app/settings/import` (the CSV import), `/app/billing` |
| Public tokens | `/kiosk/:token` and `/invite/:token`, unchanged from today, so printed links keep working |

How the web app works:
- **Server state** lives in TanStack Query. Each feature owns its query keys.
- **Live updates:** one EventSource per tab, in `shared/live`, turns SSE events into query invalidations. There are
  no per-screen reload loops.
- **Code splitting:** each feature's routes are lazy-loaded, so the website doesn't ship the app.
- **Styling:** CSS Modules per component, built on the token CSS variables from `ui`. No global class names, so
  features can't clash.
- **Page grids:** the app frame and every screen's `.page` grid declare `grid-template-columns: minmax(0, 1fr)`. A
  grid's implicit column grows to its widest child, so without it the board widens the whole page on a phone instead
  of scrolling inside its own frame. A test checks every such grid.
- **Accessible widgets** (dialog, menu, tabs, tooltip) come from Radix primitives, styled with tokens.

## 9. Design system (`packages/ui`)

Tokens are named by role, never by colour. Components only ever use roles. Every pair below was checked against
WCAG AA, and a unit test keeps it that way when a token changes.

| Role | Dark: Navy & Lime | Light: Iris (the redesign, 7 Nov) | Used for |
| --- | --- | --- | --- |
| `bg` | `#202734` | `#F2F2F7` | page ground |
| `bg-alt` | `#36415A` | `#F2F2F7`, the same as `bg` (the ground is plain) | the blend partner (website, sign-in) |
| `surface` | `#2B3447` | `#FFFFFF` | cards, panels, the board |
| `raised` | `#36415A` | `#FFFFFF` + its shadow role (§9 Depth) | menus, tooltips, popovers, sheets, dialogs and toasts, always opaque |
| `text` | `#E0F8C7` | `#1D1D1F` | headings and body |
| `text-soft` | `#ADC1A2` | `#606068` | secondary text (≥ 4.99:1 everywhere) |
| `tint` | `#B7D894` | `#5444E4` | everything you can act on: `action`, `link` and `focus` point at it, and so do text selection (`on-action` on it), `accent-color` and `caret-color` |
| `action` / `on-action` | `tint` / `#202734` | `tint` / `#FFFFFF` | main buttons |
| `attention` | `#B7D894` | `#E0102E` | the slipping triangle and a slipping week's edge |
| `tint-fill` / `on-tint-fill` | `#B7D894` / `#202734`, as the Nudge had | `#EAE9FC` (`tint` 12% into `surface`) / `tint` | the tinted capsule, Button's tinted variant, which the Nudge takes |
| `attention-text` | `#B7D894` | `#D40624` | "Slipping" as text |
| `status-below` / `status-below-text` | `mark-some` / `text`, as before | `text` / `text` (`#1D1D1F`), neutral | Below the line: StatusDot's half ring, StatusTag's words |
| `status-on` / `status-on-text` | `mark-full` / `text`, as before | `text` / `text`, neutral | On the line: the filled dot, the words |
| `status-new` / `status-new-text` | `mark-outline` / `text`, as before | `text-soft` (`#606068`, the empty ring) / `text` | New: the empty ring, the words |
| `link` | `tint`, underlined | `tint`, underlined | links |
| `focus` | `tint` | `tint` | focus rings (≥ 3:1), `--focus-width` 2 px, and 3 px under `prefers-contrast: more` (NFR-USE-06) |
| `danger` | `#F9928F` | `#D40624` | errors (form, page and kiosk) and destructive actions (the danger button, a destructive menu item, an alert's filled destructive confirm) |
| `on-danger` / `danger-hover` / `danger-press` | `#202734` / `danger` 12% and 24% toward `text` | `#FFFFFF` (5.45:1 on `danger`) / same rule | the words on an alert's filled destructive confirm, and that capsule on hover and press (the words only gain contrast) |
| `line` (the separator) | the same as `line-strong` | `#D1D1D6`, a hairline (1.52:1 on `surface`) | separators: dividers between rows and sections, and card edges where one is drawn. Decorative, so not held to 3:1 (WCAG 1.4.11 asks it only of controls and meaningful graphics) |
| `line-strong` | `text` mixed into `surface` until ≥ 3:1 on `surface`, `bg` and `raised` | same rule | input and control edges (≥ 3:1): fields, chips, segmented capsules, checkboxes, the secondary button. Never a group's outline |
| `line-blend` | `text` 53% into `surface` | the same as `line-strong` (the ground is plain) | outlines on any blend: the kiosk's, the website's and sign-in's (≥ 3:1 on every part of it, including `bg-alt`) |
| `action-hover` | `action` 12% toward `on-action` | `action` 12% toward `text` | main buttons on hover |
| `tint-fill-hover` | `tint-fill` 12% toward `on-tint-fill` | `tint-fill` 3% toward `text` | the tinted capsule on hover |
| press colours | one step past each hover colour, toward the same partner at twice its share: `action-press`, `tint-fill-press`, `highlight-press` (text on each at least 5.86:1) | same rule; the tinted capsule's tint words at least 4.5:1 | a control while it's pressed (pick E2, 7 Nov); under a finger it also gives 3% (§9 "Motion") |
| `logo-dot` | the lime accent | `tint` (6.32:1 on `surface`; at least 4.5:1 there) | the mark's square, and the home headline's one underline, so red keeps to slipping, destructive actions and errors (the underline, Uzair, 7 Nov). Renamed `mark-accent` after the stall |
| `highlight` | `text` at 8%, translucent | same rule | secondary and quiet buttons on hover, highlighted menu items |
| `disabled-fill` / `control-disabled` / `scrim` | `text` at 8%, translucent / `text` 7% into `surface` / `bg` at 72%, translucent | same rules | disabled buttons / disabled inputs / behind dialogs |
| `skeleton` | `text` at 7%, translucent | same rule | a loading screen's placeholder shapes (ui's Skeleton), one step off the card or the ground they sit on; decorative, so not held to 3:1 |
| board marks | `text`; `text` mixed into `surface` until ≥ 3:1 on `surface`; an outline in `mark-outline` (a data mark, so ≥ 3:1, never the separator); `text` at 7% | same (44% for 1–2 visits); a slipping week takes a 2 px `attention` edge | 3+ visits, 1–2, none, weeks to come |

In light, the status colours (`attention`, `attention-text` and the `status-*` roles) appear only on dots, tags and the
slipping edge, and nothing is a gradient or a tinted ground. Red means one of three things: a member slipping
(`attention`, `attention-text`), a destructive action, or an error (`danger`). Nothing else is red: not the Nudge, which
takes the tinted capsule (`tint-fill` with `on-tint-fill` words), not the mark and not a headline. The `attention-fill`
roles (`attention-fill`, `on-attention` and their hover and press) stop being the Nudge's and retire: no component uses
them, and their tokens go with the dark column after the stall. The page is pinned light (One light theme, below), so
the dark column is unused: it stays in `tokens.ts` until after the stall, then goes.

The status marks (Uzair's pick, a11y-1): four shapes, drawn by StatusDot as inline SVG sized in em: a filled dot for
On the line, a half ring (the left half filled) for Below the line, an empty ring for New, and a small falling
(point-down) triangle for Slipping. Only Slipping's triangle (`attention`, `#E0102E`), its word (`attention-text`,
`#D40624`), the slipping weeks' 2 px red edge and Today's Slipping count (`attention-text`) are red. Nothing else on
Today is red: Slipping now has no red band. On the line, Below the line and New are neutral: their words
in the text colour (`#1D1D1F`), their marks in the text colour too (the empty ring in `text-soft`, `#606068`). No green
and no amber anywhere tonight. The board's filter chips show the same marks; the board's week squares keep their look.
StatusDot draws its shape wherever a status shows (rows, the board, the member header, the filter chips, the home
page's board), so a row carries one red mark at most. The shapes sit beside their words and are hidden from assistive
technology; the board's week marks keep their names ("Week 3: 2 visits"). In a Windows contrast theme
(`forced-colors: active`) the shapes and the week marks keep their form with `forced-color-adjust: none`, in
`CanvasText` (New in `GrayText`, a flagged week's edge in `Highlight`), and the focus ring and the selection take
`Highlight`.

Lines come in two strengths, and groups don't need either. Cards, panels and inset lists stand apart from the ground
by their fill (white on `bg`), never by a `line-strong` outline; inside a group, rows part with the separator. Only what
you can operate (inputs and control edges) and what carries data (the board's empty-week outline) are held to 3:1.

Contrast ratios behind the table:
- **Dark mode:** text 8.9–13.2:1, button 9.5:1, errors 4.6:1 or more.
- **Light mode (Iris):** text 15.1–16.8:1, soft text 5.58:1 or more, white on the tint 6.32:1, the tint as a link
  5.66:1 or more, the tint on the tinted capsule 5.28:1, slipping text 4.89:1 or more, the other status words (in
  `text`) 15.1:1 or more, the neutral status marks 5.58:1 or more, the slipping triangle 4.39:1 or more, `line-strong`
  3.01:1 on `bg`, the separator 1.52:1 (decorative).
- **Links:** a link inside a sentence is underlined in both themes. The dark lime sits 1.2:1 from the soft text and
  1.4:1 from the text, and Iris's tint 1.0:1 and 2.7:1, all under the 3:1 a link marked by colour alone needs
  (WCAG 1.4.1). A test fails if a link
  style loses its underline without standing 3:1 apart from the text around it. A link that stands on its own ("Create
  your account", "Go to the home page") takes the secondary button's look through `ui`'s button class helper, and
  keeps the link role.
- **States:** every text-on-state pair is checked over `bg`, `surface` and `raised`: hover fills 4.5:1 or more (the
  light tinted capsule's is 4.97:1, its press 4.63:1; the tint's are 7.20:1 and 8.17:1), text on `highlight` 7.16:1 or
  more. Danger text never gets a tint behind it (one would take it under 4.5:1); the danger
  button's hover and a highlighted danger menu item get a thicker danger edge instead.

### One light theme (the redesign, 7 Nov)

There is one theme, Iris's light values (Uzair: light only). Nothing switches it and nothing follows the device: no
theme toggle in the header, the sidebar or More, no theme choice on Me, and no crossfade.

- **Pinned before the first paint:** every page (the website, sign-in, the app and the kiosk) gets the light tokens
  whatever the device prefers. The boot script or the generated CSS sets light, and no rule switches on
  `prefers-color-scheme`.
- **The browser is told too:** `<meta name="color-scheme" content="only light">` in the document head and
  `color-scheme: only light` on `:root`, so a phone in dark mode doesn't darken the form controls, scrollbars or
  ground; and `<meta name="theme-color">` set to `bg` (`#F2F2F7`), so the browser's own bars match the page.
- **What goes after the stall, not tonight:** the dark column, the theme runtime (ThemeProvider, ThemeToggle,
  ThemeChoice, the theme-boot plugin and the crossfade) and their tests. Until then they stay in the code, unused.

### Depth, materials and density (the redesign, 7 Nov)

Apple's layers with Fluent's shadow ramp: solid content, glass only on the phone's two bars, and a shadow only on what
floats.

- **Shadow roles:** four tokens replace `--shadow-raised`. Each is Fluent's two-part shadow (a soft ambient one and a
  sharper key one under it) in neutral black at low opacity, deeper at each step, with its values in `tokens.ts`:
  - `--shadow-lift` (Fluent's 8): a clickable card hovered with a pointer, under `(hover: hover) and (pointer: fine)`,
    and nothing else;
  - `--shadow-flyout` (16): menus and tooltips;
  - `--shadow-float` (28): toasts, the phone's floating tab capsule, and the home page's floating board (one per
    section);
  - `--shadow-modal` (64): dialogs.
- **Cards:** opaque white on the ground, with no shadow at rest. Where a card's edge is drawn, it is the separator
  hairline (`line`, drawn `--border-hairline`: 0.5 px on 2x screens, 1 px elsewhere), never `line-strong`.
- **Glass, on two bars only:** the phone's top bar and tab bar (below 1024 px) are a translucent `surface` with a
  backdrop blur, over solid content.
  - `-webkit-backdrop-filter` and `backdrop-filter` are both written out (there's no autoprefixer, and Safari before
    18 reads only the prefix). The fill, blur and saturation come from tokens, never literals.
  - Under `@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))` the bars are opaque
    `surface`, and so under `prefers-reduced-transparency: reduce` and `prefers-contrast: more`.
  - The bars carry primary text only: `text`, the tint (the selected tab) and opaque tags, never `text-soft`, which a
    translucent fill over dark content takes under 4.5:1. Each fill is opaque enough (about 86% `surface` or more on
    the top bar, about 94% on the tab bar) for the tint and the text to keep 4.5:1 over the darkest content with no
    blur at all, since Safari has no reduced-transparency query; `contrast.test.ts` checks those composites.
  - Nothing else is glass. Menus, tooltips, popovers, sheets, dialogs and toasts are opaque `raised`; the sidebar, the
    cards and the page are opaque. No glass on the kiosk, the home page or sign-in, nor inside `<MeshBackground>` (its
    grain's blend mode makes a backdrop root). No acrylic noise.
- **Density:** compact rows on the laptop board only, under `(pointer: fine) and (min-width: 1024px)`: shorter rows,
  with every hit box still 44 px (NFR-USE-03). Members, check-ins and every phone screen keep the comfortable rows.
- **Touch (native-2):** no tap flash (`-webkit-tap-highlight-color: transparent`, with every control's `:active` press
  kept), `touch-action: manipulation` on links and controls, `-webkit-text-size-adjust: 100%`, `overscroll-behavior:
  none` on the kiosk and `contain` in sheets. No home-screen mode tonight (§2).

### Type, motion and the blend

- **Type (the redesign, 7 Nov):** Inter 4 (variable, with the optical-size axis), self-hosted from
  `packages/ui/src/fonts/InterVariable.woff2`, with its SIL Open Font License beside it. One face everywhere: the app,
  the kiosk, the home page and the expo kit (which drops Barlow and Anton).
  - Stack: `'Inter Variable', system-ui, sans-serif`, with `font-optical-sizing: auto`.
  - Scale: 12 / 13 / 14 / 16 / 17 / 18 / 21 / 24 / 32 / 34 / 44 / 48 / 64 / 96. The `--text-<px>` names stay; 17 and
    34 are added, and 48 and 96 are the home page's display sizes (its headline: 96 on laptops, 48 on phones), used
    nowhere else (renaming them to `--type-*` styles waits until after the stall).
  - Body text is 17 px (1.0625rem) on phones.
  - One kiosk size outside the scale: the kiosk's typed number, `--text-kiosk`, up to 128 px (8rem) and shrinking to
    fit a smaller screen. Its fit divisor is 7.7, for Inter's figures: the kiosk shows the number formatted,
    "(312) 555-0142", which is 8.14 em in Inter 600 (measured in Chrome, 7 Nov), so 7.1 would clip it between about
    500 and 1040 px wide. Every other kiosk text stays on the scale.
  - Kiosk keys are round, 76 px (`--size-kiosk-key`) at most, clamped by the viewport's height to no less than 64 px
    (FR-KIOSK-07, NFR-USE-03).
  - Weights: 400, 600 and 700 only: 400 body, 600 interface and headings, 700 for titles of 32 px and up (`--weight-display`). The Kpi
    figures, the keypad keys and the kiosk's typed number stay 600 (its 7.7 fit divisor was measured in 600).
  - Tabular figures for all data.
  - This replaces the system-font-first stack picked earlier on 7 Nov, and Hanken Grotesk.
    `@fontsource-variable/hanken-grotesk` stays installed, unused, until after the stall.
- **Motion (the redesign, 7 Nov):** one spring family, used only where motion means something.
  - Tokens, in `tokens.ts`: `--ease-spring` with `--motion-spring` 740 ms (smooth, no bounce, 90% there at 311 ms),
    `--ease-spring-quick` with `--motion-spring-quick` 450 ms (90% at 187 ms) and `--ease-spring-bounce` with
    `--motion-spring-bounce` 820 ms (one bounce, 4.6% over). Each easing is a `cubic-bezier()` at `:root`, replaced by a
    sampled `linear()` inside `@supports (transition-timing-function: linear(0, 1))`. `fast` 120 ms, `base` 200 ms and
    `slow` 320 ms stay for fades, scrims and colours; `--motion-linger` 1600 ms is a tint fading after a live change;
    `--scale-press` is 0.97.
  - Where it moves: sheets and dialogs rise on the smooth spring and leave on the quick one, their scrim fading over
    `base`. A press changes colour at once (pick E2) and, under a finger only (`pointer: coarse`), gives 3% and springs
    back on the quick spring; nothing moves with a mouse. Nudge shows busy (the spinner after 400 ms, pick F2), then
    "Nudged" with a check, and its toast stays. The kiosk welcome draws its check and fills its ring on the bouncy
    spring, the only place anything bounces. A live check-in keeps the board's pop (FR-BOARD-03) and tints its row,
    the tint fading over `--motion-linger`. Opening a member, tabs and lists stay instant.
  - Rolling figures: Today's four figures and its sentence's numbers, and Reports' nudges sentence and legend counts, roll
    on the smooth spring when they change and once when they first show; the text is the final value; Reduce Motion
    shows it at once.
  - Reduced motion: nothing moves (§2 "Motion", NFR-USE-04). base.css sets every `--motion-*` to 0 ms and
    `--scale-press` to 1, so no component writes the query itself; the kiosk's check and ring appear finished and its
    countdown is text. The one exception is a rendered clip (the home hero's): a video has no motion tokens, so the
    page reads the query and shows the clip's poster instead of the video.
  - After the stall: the push into a member, FLIP lists, the tab pill, the shake, the
    travelling segment thumb and reduced-motion fades.
  - Loading (Uzair's polish, 8 Nov): while Today, the board, Members, the member page, Reports and Settings load, each shows a
    skeleton of its own layout (the same cards, rows and figure slots, the real titles and headings) in `skeleton`,
    so nothing jumps when the data lands, in place of the spinner. The region is `aria-busy` with one "Loading" status;
    the shapes are inert. After `--delay-busy` they pulse slowly to `--opacity-skeleton-pulse` and back, each way over
    `--motion-linger`, so under reduced motion they stay still at full fill.
  - A wait shows its spinner only after 400 ms (pick F2), and toasts make room for each other over `base` (pick G2).
- **Layers:** `--layer-sticky` 1 for a sticky column inside a scroller (the board's names), `--layer-nav` 30 for the
  tab bar and the sidebar (under dialogs), `--layer-dialog` 40, `--layer-menu` and `--layer-tooltip` 50 (so they open
  over a dialog), `--layer-toast` 60, and `--layer-behind` -1 for decoration inside its own stacking context. Toasts
  sit clear of the tab bar (`--toast-clearance`), and move to the top edge while a sheet is open.
- **No literals in component CSS:** colours, durations, z-indexes and opacities come from tokens (`--opacity-disabled`,
  `--opacity-logo-track` and the rest, and `--tracking-logo` for the wordmark). A test fails on a literal. One-off
  sizes, such as dialog widths, stay in rem.
- **Ground (Iris, 7 Nov):** in light, the website, the sign-in screens and the kiosk show the plain `bg`, with no
  gradient or grain. `<MeshBackground>` keeps its API, and the blend tokens make it flat: `bg-alt` is `bg`, and the
  kiosk's blend has no glows. The dark theme keeps its blends (`bg` into `bg-alt` with fine grain, and the kiosk's own
  pattern) until it goes after the stall.
- **Logo (Quarter, 7 Nov):** a filled quarter circle on a 24-unit grid, with an L-shaped gap holding one rounded square:
  one week, the board's own week mark, and 90 days is a quarter. The path is baked, with no SVG mask: the quarter is
  `M4.4 13.3V4.4A15.2 15.2 0 0 1 19.6 19.6H10.7V13.3Z` in `text`, and the square is x 4.4, y 14.6, 5 × 5, rx 1.3, in
  `logo-dot`. `<Logo>` renders the symbol and, beside it, the product name as live text from `brand.name` ("Regulars",
  title case, Inter 600, `--tracking-logo` about -0.01em). The favicon (SVG and a 32 px PNG) and the 180 px
  apple-touch icon are drawn from the symbol alone. Light only.
- **Icons (the redesign, 7 Nov):** Phosphor 2.1.1 (MIT), Regular and Fill, vendored as TSX components in
  `packages/ui/src/icons`, with Phosphor's LICENSE beside them. Only the icons the screens use go in: the five tabs in
  Regular and Fill, and about 20 more in Regular. Each draws in `currentColor`, so it takes its role's colour; is
  `aria-hidden`, since the label beside it or its control's accessible name carries the meaning; and is sized in em
  (1em by default), so it follows the text. No icon font, sprite, CDN or npm package: the icons are code, so
  NFR-MAINT-04 holds.
  - Tabs: Today `calendar-dot`, Board `squares-four`, Members `users`, Reports `chart-bar`, Settings `gear-six`. Every
    tab shows its Fill icon over its label; the selected tab, icon and label, takes the tint, and the others `text`.
  - Rows, menus and the sidebar use Regular; the sidebar's selected page takes its Fill icon.
  - No icon inside the Nudge capsules (the word alone), no sun or moon, and WhatsApp in words only.
- **Labels (the redesign, 7 Nov):** no spaced capitals. Small labels above headings, figure labels and table column
  headers are sentence-case footnotes in `text-soft`, shown as COPY.md writes them: `--label-transform` is `none` and
  `--label-tracking` is `normal`, at the small label size (`--label-size`, 12 px tonight) and 600 weight. Status tags
  take the same type, in their status words' colours. Components keep reading the four `--label-*` variables.
- **Page-title focus:** the router marks the title it focuses after a navigation, and base.css shows a short bar in
  `focus` beside it instead of the ring, only when the navigation came from a key (the router records whether the last
  input was a key or a pointer, as `data-route-focus="keyboard"` or `"pointer"`): a tap or click shows nothing, in
  Safari too. Every other focusable element keeps the ring.
- **Invalid fields:** a field marked `aria-invalid` draws its focus ring in `danger`, the colour of its border, so a
  focused invalid field shows one colour.
- **Alerts (ConfirmDialog):** one style for every confirm, as Apple's alerts: no corner X (Cancel, Escape and the scrim
  close it), Cancel the quiet button, and the confirm filled, in red (`danger` under `on-danger` words) for a
  destructive action and in the tint otherwise.

## 10. Copy (`packages/copy`)

COPY.md stays the single source of every sentence. It is generated into a typed catalogue, so `t('id')` fails to
compile when an id is missing.

The API's error messages come from the same catalogue. Today `messages.mjs` duplicates them; that duplication goes.
Edit COPY.md, never the generated file.

A line describes the action rather than quoting a button's label: "Clear the search, or show all members", not
"choose All". Button labels take no closing punctuation, except a progress label's ellipsis ("Saving…"). Capitals follow §2's split. COPY.md's header gives the rule
and the small words Title Case keeps lowercase, and the copy test checks each row by its kind.

## 11. Quality gates

All of these must be green before a milestone is called done:
- `npm run typecheck`: `tsc -b`, strict
- `npm run lint`: ESLint including the boundary rules
- `npm test`: Vitest, all projects
- `npm run build`

Generated files (`tokens.css` in `ui`, the catalogue in `copy`) are committed. A test fails when one is out of date,
so a fresh clone typechecks without a generate step.

A fifth gate from the first version: `npm run e2e`, Playwright's click-through flows.

Test suites:
- **API:** the legacy server tests that cover core flows (about 104 of the 176) are ported into Vitest now, alongside
  the API modules they cover. The rest (import synonym variants and daylight-saving cases) follow with the polish.
- **Web:** component tests use Testing Library.
- **End to end:** Playwright (`@playwright/test`, in `apps/e2e`) is the one test-only package added for the first
  version.
  - Chrome runs through the installed browser. WebKit (standing in for Safari) is downloaded once into a gitignored
    cache, with no global installs.
  - Each browser gets its own seeded database and stall-mode server. The speed targets in §2 are checked here.
- **Tracing:** every test's name starts with the requirement ID it covers (`docs/SPEC.md`). A trace test fails when a
  Must has no test.

CI (`.github/workflows/ci.yml`) runs the same gates once the repo is pushed.

## 12. Running it

| Command | What it does |
| --- | --- |
| `npm install` | install everything (Node 26) |
| `npm run seed` | rebuild the Northside demo gym |
| `npm run dev` | API on :5175 and the web app on :5174, with hot reload |
| `npm run stall` | build the web app, then serve everything from the API on the LAN, for phones on the hotspot |
| `npm run e2e` | Playwright's flows on Chrome and WebKit (`npm run e2e:install` downloads WebKit once) |
| `npm run backup` / `npm run restore -- <file>` | copy the database to a dated file in `backups/`, or restore one (refused while the server runs); `scripts/backup.sh` does the same for the Docker volume |
| `npm run reset-link -- <email>` | print a password reset link (the stand-in email's outbox page is development only) |
| `npm run demo:reset` | re-seed the demo gym between stall visitors (also a button in stall mode) |
| `docker compose up` | the same app in a container (Compose project `tenure`). `scripts/stall.sh` passes the laptop's LAN address and time zone in, because a container can't see them; plain `docker compose up` prints localhost and a hint, and seeds in America/Chicago. The first start seeds the demo gym into the `tenure-data` volume; later starts keep the volume, its data and the zone it was seeded in. Behind Docker all visitors share one device for the rate limits (sign-up 5 per 10 minutes, kiosk 30 per minute, and 10 failed logins per account per 10 minutes, across the whole stall), because Docker Desktop's port publishing replaces the client's address |

Moving to another laptop:
1. Install Docker Desktop, then open a new terminal so its `docker` command is found.
2. Copy the repo (a USB drive, or git once there is a remote).
3. Run `scripts/stall.sh` while the laptop is online: the first build fetches the npm packages (about 2 minutes).
   Port 5175 must be free.

The demo is built around the day it was seeded. Re-seed on the morning of the stall, and again afterwards to clear
visitors' data: `docker compose down -v`, then `scripts/stall.sh`. To carry the data across instead, copy the
`tenure-data` volume with the stack stopped; the README has the commands.

## 13. Milestones (each pauses for review)

1. **Foundations.**
   - Repo, tooling and all packages.
   - API platform, auth, the Today read model and realtime.
   - Web shell with both themes, sign-in (blended) and Today.
   - Docker files and CI.
2. **The first version (replaces milestones 2 to 4, 7 Nov).** The whole MVP built simply, with core flows tested end
   to end. It runs in six phases (`docs/SPEC.md` §8; `docs/milestone-2/FIRST-VERSION.md`):
   - 0, foundations;
   - 1, backend slices;
   - 2, core screens;
   - 3, management, then pause 1;
   - 4, account basics and the website;
   - 5, close, then pause 2.

   It covers milestones 2 to 4 as they were planned: the core features with global-ready and the milestone 2
   decisions (§2), password reset, email invites through the outbox, the dev outbox, and the website with "Try the
   demo". It leaves out email verification and real email, text and payment providers.
3. **Polish.** The rare edge cases, the rest of the legacy test ports, and design refinements beyond the picks.
4. **Hardening.** An accessibility pass, Docker verification steps, removing `legacy/`, the docs, and the kiosk's
   add-to-home-screen app. Real email, texts and payments, and online hosting, once Uzair has created the accounts.
