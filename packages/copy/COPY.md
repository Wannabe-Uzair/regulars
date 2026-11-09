# Regulars app — UI copy deck (v2.0)

**How to use this file.** Screen builders take strings from here verbatim, by id. Do not reword, shorten or add punctuation. A string you need that is not here gets added here first, then used. Rules: capitals follow Apple's split (ARCHITECTURE §2, "Capitals"). **Title Case** on what you press and on short titles: buttons and links styled as buttons, tabs, menu and picker items, segments, and page, section, sheet, dialog and empty-state titles. Capitalize every word except articles (a, an, the), coordinating conjunctions (and, but, or, nor, for, so, yet) and prepositions of four letters or fewer (as, at, by, for, from, in, into, of, off, on, onto, out, over, per, to, up, via, with), unless the word is first or last or part of a verb (Log In, Set Up, Check In); capitalize both halves of a hyphenated word (Check-Ins) and contractions (Doesn’t). **Sentence case** on everything you read: sentences, lines, help, errors, toasts, field and figure labels, table headers, status words, tags, legends and accessible names, and on any title or button that is a full sentence or a question, which keeps its punctuation ("Forgot your password?", "Archive {name}?"). Progress labels end in an ellipsis ("Saving…"). Each row's Where cell starts with its kind (Button, Primary button, Link, Tab, Menu item, Option, Segment, Page title, Section title, Dialog title, Sheet title, Empty title; or Line, Sentence, Label, Field label, Error, Toast, Tag, Legend, `aria-label`), because the copy test checks the casing by kind. US spelling; numerals always; no exclamation marks; no arrows or emoji in labels; no "we" or "our". Apostrophes and quotes in the Text column are typographic: ’ for an apostrophe (Doesn’t, gym’s), “ ” round a quoted value (“{query}”), never straight ones, which the copy test refuses. Regulars is a plural noun naming one product: it is never the subject of a singular verb ("Regulars shows" is barred), and no status or count is called "regulars". Sources: `../brand/DESIGN.md` §2, §12; `SPEC.md` §2, §4–§8.
Tokens in `{braces}` are filled by the client. Plurals: use the `1 visit` / `2 visits` form (singular only for exactly 1). Rendered names: `Sam O.` (first name + last initial), everywhere, as written. A member with a single name renders as that name alone (`Leo`).

## 0. Shared words
| id | Text | Where |
| --- | --- | --- |
| brand.name | Regulars | Logo, wordmark, page title suffix |
| brand.descriptor | Member retention for independent gyms | Line, unread since the sign-in pages took `brand.tagline` (retires in the cleanup commit) |
| brand.tagline | Turn new members into regulars. | Line under the wordmark on Log In, Set Up Your Gym and the invite page; the same words as `home.title` |
| brand.pageTitle | {page} · {brand} | Browser tab title; `{page}` is the page's title, `{brand}` is `brand.name` |
| tag.sample | Sample data | For the demo gym (`isDemo`): the kiosk header, top right, and the app header after the gym's name (in the sidebar from 1024 px, under the pilot day) |
| common.save | Save | Button |
| common.cancel | Cancel | Button (forms; the composer's Cancel at the sheet's and dialog's leading edge) |
| common.search | Search | Field label of the filter bar's search on the board and Members, visually hidden (still its accessible name) |
| common.none | — | Empty value (no pace, no coach, no date) |
| common.dateTime | {date}, {time} | Value, an instant's date and time, e.g. `Nov 6, 5:42 PM`: the gym's date and time joined here, so Safari and Chrome read alike (the member page's Visits and Nudges) |
| common.close | Close | Button (dialogs, phone menu) |
| common.loading | Loading… | Line while a screen loads (a progress label) |
| common.retry | Try Again | Button under the error line when a screen's data doesn't load (the board, Members, the member page, the nudges log, reports, billing) |
| common.open | Open | Small quiet button link at the end of each member row (the board, Today's lists, Members, the nudges log); its accessible name is `a11y.openMember` |
| common.copyFailed | Couldn’t copy. Select the link and copy it. | Under a copy field when both ways of copying fail (Settings' kiosk and phone links, the invite link) |
| role.owner | Owner | Role tag; also the invite dialog's role choice |
| role.coach | Coach | Role tag; also the invite dialog's role choice |

### Countries (the five open markets)
| id | Text | Where |
| --- | --- | --- |
| country.US | United States | Country option, at sign-up and in Settings |
| country.CA | Canada | Country option |
| country.GB | United Kingdom | Country option |
| country.PK | Pakistan | Country option |
| country.AE | United Arab Emirates | Country option |

## 1. Status names and definitions (SPEC §4, first match wins)
| id | Name | One-line definition | Mark |
| --- | --- | --- | --- |
| status.slipping | Slipping | Fewer than 2 visits in each of the last 2 finished weeks. | red falling triangle |
| status.new | New | Fewer than 2 finished weeks so far. | gray empty ring |
| status.on | On the line | 3 or more visits in the last finished week. | filled dot |
| status.below | Below the line | 1 or 2 visits in the last finished week, and not slipping. | half ring |

Order of checks, shown in the legend help: Slipping, New, On the line, Below the line.
`status.note` — "Only the first 90 days count. A finished week is a full 7 days." (legend help, Board and Reports)

## 2. Login, Sign up, Invite accept

### `/login`
| id | Text | Where |
| --- | --- | --- |
| login.title | Log In | Page title |
| login.email | Email | Field label |
| login.password | Password | Field label |
| login.submit | Log In | Primary button |
| login.submitting | Logging In… | Button while sending |
| login.toSignup | New gym? | The prompt, before the button link `login.toSignup.link` |
| login.toSignup.link | Create Your Account | Small secondary-button link to `/signup`, after the prompt `login.toSignup` |
| login.passwordRequired | Enter your password. | Field error, password left empty |
| login.forgot | Forgot your password? | Link to `/reset`, under the password field |

### Hero (login and sign-up)
| id | Text | Where |
| --- | --- | --- |
| auth.hero.day | Day | Hero, small word above 90 |
| auth.hero.line | Get every new member there. | Hero line under Day 90 |
| auth.hero.aria | Day 90. Get every new member there. | Hero `aria-label` |

### Home (`/`)
Uzair's picks at the stall version's review stop (FR-WEB-01). No price on this page.

| id | Text | Where |
| --- | --- | --- |
| home.title | Turn new members into regulars. | Headline (h1) of the home page's hero, under `brand.name`; it names the hero's region |
| home.title.mark | regulars. | Line, the end of `home.title`; the same words as there (retires after the stall) |
| home.lede | With Regulars, a coach sees who’s slipping in their first 90 days, while there is still time to contact them. | Under the headline |
| home.offer | Free 90-day pilot. Unlimited members. | The offer, the last line under the buttons |
| home.start | Set Up Your Gym | Primary button link to `/signup`, outside stall mode: in the bar (small), the hero and the closing section |
| home.login | Log In | Secondary-button link to `/login`, outside stall mode: in the bar (small) and the hero, after `home.start` |
| home.board.title | The Board | Title on the hero clip: a still slice of the board on a card, beside the words from 64rem, under them below |
| home.board.aria | A sample of the 90-day board | The home hero clip's accessible name |
| home.board.member1 | Sam O. | Hero clip, sample name: slipping, the row with Nudge |
| home.board.member2 | Hana L. | Hero clip, sample name: slipping |
| home.board.member3 | Dev P. | Hero clip, sample name: on the line |
| home.board.member4 | Maya R. | Hero clip, sample name: on the line |
| home.board.member5 | Chris L. | Hero clip, sample name: below the line |
| home.board.member6 | Jo W. | Hero clip, sample name: on the line |
| home.figures.title | The first 90 days decide. | Section title over the home page's three sourced figures |
| home.fig.quit.value | 6 in 10 | Line, the first sourced figure, set large, with footnote 1 |
| home.fig.quit.label | New members quit within three months. | Line under `home.fig.quit.value` |
| home.fig.stay.value | 78% | Line, the second sourced figure, set large, with footnote 2 |
| home.fig.stay.label | Renewed when they came 3 or more times a week in their first month. | Line under `home.fig.stay.value` |
| home.fig.fade.value | 59% | Line, the third sourced figure, set large, with footnote 2 |
| home.fig.fade.label | Renewed when they came under once a week. | Line under `home.fig.fade.value` |
| home.close.title | Start with the sample gym. | Section title of the home page's closing section, over Try the Demo in stall mode (Set Up Your Gym outside it) |
| home.sources.title | Sources | Section title in the home page's footer, over the numbered sources |
| home.source.1 | Sperandei, Vieira and Reis, Journal of Science and Medicine in Sport, 2016: at one gym in Rio de Janeiro, 63% of new members quit within three months. | Line, footnote 1 in the footer (a citation: on the copy test's casing exceptions) |
| home.source.2 | A 2001 industry study of members’ first month in the United Kingdom. | Line, footnote 2 in the footer |
| home.footer.never | Messages go from the coach’s own phone, never from the app. Visits are counted by fixed rules anyone can check. | Sentence in the home page's footer |
| home.footer.sample | The screens show a sample gym. | Sentence in the footer, after `home.footer.never` |

### `/signup`
| id | Text | Where |
| --- | --- | --- |
| signup.title | Set Up Your Gym | Page title |
| signup.lede | Start a free 90-day pilot for your gym. | Under the title; also the Pricing placeholder's title |
| signup.gymName | Gym name | Field label |
| signup.name | Your name | Field label |
| signup.email | Email | Field label |
| signup.password | Password | Field label |
| signup.passwordHelp | 8 characters or more. | Meta under the field |
| signup.submit | Start the Pilot | Primary button |
| signup.toLogin | Already have an account? | The prompt, before the button link `signup.toLogin.link` |
| signup.toLogin.link | Log In | Small secondary-button link to `/login`, after the prompt `signup.toLogin` |
| signup.submitting | Creating Your Gym… | Button while sending |
| signup.gymNameRequired | Enter your gym’s name. | Field error (same words as the server) |
| signup.nameRequired | Enter your name. | Field error (same words as the server) |
| signup.country | Country | Field label; a select of the five open markets |
| signup.countryPick | Choose a Country | The select's empty first option, shown when the detected country isn't one of the five |
| signup.countryRequired | Choose a country from the list. | Field error (same words as the server) |

### `/invite/:token`
| id | Text | Where |
| --- | --- | --- |
| invite.title | Join {gymName} | Page title; gym name |
| invite.lede | Your owner invited you as a coach. | Under the title, on a coach invite |
| invite.lede.owner | Your owner invited you as a co-owner. | Under the title, on an owner invite |
| invite.name | Your name | Prefilled from the invite |
| invite.password | Password | Field label |
| invite.submit | Join {gymName} | Primary button |
| invite.bad | This invite has expired or was already used. Ask your owner for a new link. | Shown instead of the form (404 or used) |
| invite.email | Email | Field label |
| invite.passwordHelp | 8 characters or more. | Meta under the field |
| invite.submitting | Joining… | Button while sending |
| invite.nameRequired | Enter your name. | Field error (same words as the server) |
| invite.toLogin | Already have an account? | The prompt, before the button link `invite.toLogin.link` |
| invite.toLogin.link | Log In | Small secondary-button link to `/login`, after the prompt `invite.toLogin` |
| invite.bad.title | This Link Doesn’t Work | Section title over `invite.bad` |
| invite.bad.action | Go to Log In | Secondary-button link to `/login` under `invite.bad` |

### `/reset`, asking for the link
| id | Text | Where |
| --- | --- | --- |
| reset.title | Reset Your Password | Page title |
| reset.lede | Enter the email you log in with, and a link to choose a new password goes there. | Under the title |
| reset.email | Email | Field label |
| reset.submit | Send Reset Link | Primary button |
| reset.submitting | Sending… | Button while sending |
| reset.sent | If an account uses that email, a reset link is on its way. It works once, for an hour. | Shown after sending, the same whether or not the email has an account |
| reset.toLogin | Remember your password? | The prompt, before the button link `reset.toLogin.link` |
| reset.toLogin.link | Log In | Small secondary-button link to `/login`, after the prompt `reset.toLogin` |

### `/reset`, from the emailed link
| id | Text | Where |
| --- | --- | --- |
| reset.new.title | Choose a New Password | Page title |
| reset.new.password | New password | Field label |
| reset.new.passwordHelp | 8 characters or more. | Meta under the field |
| reset.new.submit | Save Password | Primary button |
| reset.new.submitting | Saving… | Button while sending |
| reset.saved | Password saved | Toast once the new password is saved; the user's other sessions have ended |
| reset.bad.title | This Link Doesn’t Work | Section title over the server's sentence (`api.resetInvalid`), shown instead of the form |
| reset.bad.action | Go to Log In | Secondary-button link to `/login` under it |

### Stall mode
| id | Text | Where |
| --- | --- | --- |
| demo.try | Try the Demo | Button, stall mode only: in the home page's bar (small), its hero and its closing section, named alike, and on Log In in place of `login.toSignup.link`; signs the visitor in as the demo gym's owner |
| demo.reset | Reset the Demo | Button, stall mode only: a quiet small button in the home page's footer; opens the reset's confirm, and is its confirm button too |
| demo.reset.title | Start the demo over? | The reset confirm's question |
| demo.reset.body | Everything goes back to the sample gym, and every device using the demo is logged out. The kiosk link stays the same. | Sentence under the reset's question |
| demo.reset.done | The demo is back to the sample gym. | Toast once the reset is done |

## 3. App shell
| id | Text | Where |
| --- | --- | --- |
| nav.owner.today | Today | Sidebar, owner |
| nav.owner.board | Board | Sidebar |
| nav.owner.members | Members | Sidebar |
| nav.owner.nudges | Nudges | Sidebar |
| nav.owner.reports | Reports | Sidebar |
| nav.owner.templates | Templates | Sidebar |
| nav.owner.settings | Settings | Sidebar |
| nav.owner.billing | Billing | Sidebar |
| nav.coach.today | Today | Sidebar, coach (first item), as the owner's and the coach's first tab read |
| nav.coach.board | Board | Sidebar, coach |
| nav.coach.members | Members | Sidebar, coach |
| nav.coach.nudges | Nudges | Sidebar, coach |
| nav.coach.templates | Templates | Sidebar, coach (read only) |
| nav.me | Me | Nav item for `/app/me`, both roles: the sidebar and the More sheet |
| nav.logout | Log Out | Button, the sidebar's foot from 1024 px, the phone header for coaches below it, and Settings' Account group for owners below it; Me |
| nav.menu | Menu | Phone header button that opens the menu |
| theme.toDark | Switch to dark theme | The theme button's `aria-label` (the sidebar's foot from 1024 px, the More sheet below) while the light theme is on |
| theme.toLight | Switch to light theme | The theme button's `aria-label` (the sidebar's foot from 1024 px, the More sheet below) while the dark theme is on |
| tab.owner.today | Today | Phone tab 1 |
| tab.owner.board | Board | Phone tab 2 |
| tab.owner.members | Members | Phone tab 3 |
| tab.owner.reports | Reports | Tab, the owner's phone tab 4, a filled chart icon over the word |
| tab.owner.settings | Settings | Tab, the owner's phone tab 5, a filled gear icon over the word |
| tab.owner.nudges | Nudges | Phone tab 4 |
| tab.owner.more | More | Phone tab 5; opens the More sheet with the rest of the owner's pages, and titles it |
| tab.coach.today | Today | Phone tab 1 |
| tab.coach.board | Board | Phone tab 2 |
| tab.coach.members | Members | Phone tab 3 |
| tab.coach.nudges | Nudges | Phone tab 4 |
| tab.coach.more | More | Phone tab 5; opens the More sheet with the rest of the coach's pages, and titles it |
| shell.pilot | Pilot day {n} of 90 | Owners only, until day 90: under the gym name in the sidebar from 1024 px, and after it in the header from 768 to 1023 px; not on phones |
| shell.skip | Skip to Content | Link, the first thing Tab reaches on every /app page: hidden until focused, at the top's leading corner; it moves focus past the sidebar to the page's title |
| shell.notFound.body | Check the address, or start again from Today. | Under `notFound.title` when an /app address isn't part of Regulars (inside the shell) |
| shell.notFound.link | Go to Today | Secondary-button link to `/app` under `shell.notFound.body` |

## 4. Today (`/`)

### Owner
| id | Text | Where |
| --- | --- | --- |
| today.owner.title | Today | Page title |
| today.kpi.new | New members | KPI label (members in their first 90 days) |
| today.kpi.onLine | On the line | KPI label; value `{n}%`, `—` if null |
| today.kpi.slipping | Slipping | KPI label |
| today.kpi.nudged | Nudged this week | KPI label |
| today.headline | {n} of {total} new members are slipping | Sentence, Today's live headline (an h2) over the four figures, 2 or more slipping; `{total}` is `kpis.newMembers` |
| today.headline.one | 1 of {total} new members is slipping | Sentence, Today's live headline, exactly 1 slipping |
| today.headline.none | None of the {total} new members are slipping | Sentence, Today's live headline, nobody slipping |
| today.headline.empty | No members are in their first 90 days | Sentence, Today's live headline when `kpis.newMembers` is 0 |
| today.kpi.new.hint | In their first 90 days | Line under the New members figure |
| today.kpi.onLine.hint | 3 or more visits last week | Line under the On the line figure |
| today.kpi.slipping.hint | Under 2 visits, 2 weeks in a row | Line under the Slipping figure (a link to the board filtered to Slipping); a no-break space (U+00A0) holds each 2 to its word |
| today.kpi.nudged.hint | In the last 7 days | Line under the Nudged this week figure (a link to Reports for owners) |
| today.slipping.title | Slipping Now | Section title |
| today.slipping.row | Last visit {n} days ago · Coach {coach} | Row meta, 2 or more days; 0, 1 and null use the three rows below. A coach’s own list, all theirs, leaves out the coach and uses `member.lastVisit` |
| today.slipping.rowNever | No visits yet · Coach {coach} | Row meta, no visits |
| today.slipping.rowToday | Last visit today · Coach {coach} | Row meta, visited today |
| today.slipping.rowYesterday | Last visit yesterday · Coach {coach} | Row meta, visited yesterday |
| today.slipping.nudge | Nudge | Button, the tinted capsule beside each Slipping Now row, never inside its link; `nudge.done` once recorded |
| today.slipping.all | Show All {n} | Plain button after the first 5 rows on phones (`aria-expanded`) |
| today.slipping.emptyTitle | Nobody’s Slipping | Section title in the list's place when nobody is slipping (no symbol) |
| today.slipping.empty | No new member has had 2 weeks in a row with under 2 visits. | Line under `today.slipping.emptyTitle`; good news keeps the list's place |
| today.checkins.title | Checked In Today | Section title |
| today.checkins.time | {time} | Row, first column: the check-in's time in the gym's locale, like `6:42 PM` or `18:42` (pick K2, 7 Nov) |
| today.checkins.name | {name} | Line in each Checked In Today row, after the time and before a chevron; the whole row is the member's link |
| today.checkins.emptyTitle | No Check-Ins Yet | Empty title; the action is `today.empty.kiosk` for owners (no symbol) |
| today.checkins.empty | Members appear here as they check in at the front desk. | Line under `today.checkins.emptyTitle` |
| today.checkins.all | Show All {n} | Plain button after the first 5 Checked In Today rows on phones (`aria-expanded`), as `today.slipping.all` (audit A17) |
| today.board.title | The Board | Section title, small board |
| today.board.open | Open the Board | Link styled as a button in the header of Today's board panel, to `/app/board` (Title Case only; label and name stay equal) |
| today.board.head.weeks | Weeks | Board column header over the 13 week cells |
| today.board.head.status | Status | Board column header over the status tags |
| today.retry | Try Again | Button under the error line when Today doesn't load (same words as `common.retry`) |

### Coach (same keys and labels as owner, scoped to their members)
| id | Text | Where |
| --- | --- | --- |
| today.coach.title | Today | Page title, as the owner's (pick D2, 7 Nov) |

### Empty gym (after sign-up, no members)
| id | Text | Where |
| --- | --- | --- |
| today.empty.title | No Members Yet | Empty title (Today, an owner's empty gym) |
| today.empty.body | Import your member list, or have members check in at the front desk. The board fills from there. | Sentence; also the board's empty state for an empty gym |
| today.empty.import | Import Members | Primary button to the import page (`/app/settings/import`) |
| today.empty.kiosk | Open the Kiosk | Secondary button |
| today.empty.kioskBody | Members appear here the first time they check in at the front desk. Each one gets a 90-day board. | Line under `today.empty.title` in the stall version, with "Open the Kiosk" and no import; also the board's empty state for an owner's empty gym |
| today.empty.coachTitle | No Members Assigned | Empty title, a coach with no members (symbol: user plus) |
| today.empty.coach | Members appear here once an owner assigns them to you. | Line under `today.empty.coachTitle`; no buttons; also the board's empty state for a coach with no members |

## 5. Board (`/board`)
| id | Text | Where |
| --- | --- | --- |
| board.title | Board | Page title |
| board.search | Search members | Input placeholder |
| board.filter.status | Status | Label of the status chips, visually hidden (still the group's name) |
| board.filter.all | All | Status option |
| board.filter.coach | Coach | Field label of the owner's coach filter, visually hidden (still its accessible name) |
| board.filter.allCoaches | All Coaches | Coach option |
| board.legend.3 | 3+ visits | Legend, text ramp's top step |
| board.legend.12 | 1 or 2 visits | Legend, text ramp's middle step |
| board.legend.0 | No visits | Legend, text ramp's lowest step |
| board.legend.now | This week, in progress | Legend, text ramp's current-week step |
| board.legend.future | Not reached yet | Legend, blank |
| board.legend.low | 1–2 | Compact legend, text ramp's middle step |
| board.legend.none | None | Compact legend, text ramp's lowest step |
| board.legend.week | This week | Compact legend, text ramp's current-week step |
| board.aria | The 90-day board | Board table `aria-label` |
| board.head.member | New member | Column header, member names |
| board.pace | {x}/wk | Pace cell on the board, e.g. `1.0/wk` |
| board.count | {n} new members · {s} slipping | Line over the board's table on its own page, counting the rows shown, 2 or more |
| board.count.one | 1 new member · {s} slipping | Line over the board's table, exactly 1 row shown |
| board.empty | No Matching Members | Empty title, filters set |
| board.emptyBody | Try other filters. | Line under `board.empty` |
| board.emptyClear | Clear Filters | Primary button |
| board.empty.search | No Results for “{query}” | Empty title, a search that matches nothing (symbol: magnifying glass) |
| board.empty.searchBody | Check the spelling, or clear the filters. | Line under `board.empty.search` |
| board.empty.none | No New Members | Empty title on the board when no filter is set and nobody is in their first 90 days (the gym has members) |

## 6. Members (`/members`, `/members/:id`)

### List
| id | Text | Where |
| --- | --- | --- |
| members.title | Members | Page title |
| members.search | Search by name or phone | Placeholder |
| members.col.name | Name | Column header |
| members.count | {n} members | Meta (`1 member` for 1) |
| members.count.one | 1 member | Meta, exactly 1 |
| members.col.week | Week | Cell: `Week 4 of 13` on the page, `4 / 13` in the table |
| members.weekCell | {n} / 13 | Week cell in the table, e.g. `4 / 13` |
| members.col.pace | Pace | Cell: `1.0/wk`, `—` if null |
| members.col.last | Last visit | Cell: `11 days ago`, `Today`, `Yesterday`, `No visits yet` |
| members.last.today | Today | Last visit cell, today |
| members.last.yesterday | Yesterday | Last visit cell, yesterday |
| members.last.days | {n} days ago | Last visit cell, 2 or more days |
| members.empty | No Members Yet | Empty title when no filter is set; a filtered list with no match takes `board.empty` |
| members.emptyNone | Members appear here once they join at the front desk or you import them. | Line under `members.empty` when no filter is set; no button (FR-MEM-06) |
| members.emptyArchived | Members you archive appear here. | Sentence under `members.empty` in the Archived view when no filter is set; no button |
| members.empty.archived | No Archived Members | Empty title in Members' Archived view when no filter is set, over `members.emptyArchived` |
| members.card.meta | {week} · {pace} · {last} | Phone row meta line, for a member with a pace |
| members.card.metaNoPace | {week} · {last} | Phone row meta line before the first week ends (no pace yet): the pace is left out, not shown as `common.none` |
| members.view | View | Label of the three-way view choice (read by screen readers) |
| members.view.first90 | First 90 Days | View option, the default: members in their first 90 days |
| members.view.everyone | Everyone | View option: every member who isn't archived |
| members.view.archived | Archived | View option: archived members only |
| members.past90 | Past 90 days | In soft text instead of a status, on Members and the member page, from day 90 (a `daysSinceJoin` of 90 or more) |
| members.add | Add Member | Button, owners and coaches; opens the add dialog |
| members.add.title | Add a Member | Add dialog title |
| members.add.joined | Joined on | Add dialog field label; today or earlier |
| members.add.submit | Add Member | Add dialog primary |
| members.added | {name} added | Toast |

### Member page
| id | Text | Where |
| --- | --- | --- |
| member.back.today | Today | Link styled as a plain button at the top of the member page, after a chevron, when it was opened from Today |
| member.back.board | Board | Link styled as a plain button at the top of the member page, when it was opened from the board |
| member.back.members | Members | Link styled as a plain button at the top of the member page, when it was opened from Members, and after a reload |
| member.status | Status | Field label |
| member.coach | Coach | Field label |
| member.phone | Phone | Field label |
| member.phone.none | No phone on file | Value |
| member.email | Email | Field label |
| member.joined | Joined {date} | Value; the date in the gym's locale, e.g. `Joined Oct 3` |
| member.joinedOn | Joined | Fact label on the member page, over the joined date in the gym's locale |
| member.week | Week {n} of 13 | Value, e.g. `Week 4 of 13` |
| member.lastVisit | Last visit {n} days ago | Value, 2 or more days; 0, 1 and null use the rows below |
| member.lastVisit.never | No visits yet | Member page and table cell, no visits |
| member.lastVisit.today | Last visit today | Member page, visited today |
| member.lastVisit.yesterday | Last visit yesterday | Member page, visited yesterday |
| member.lastVisitNone | No visits yet | Member row meta, no visits (same words as `member.lastVisit.never`) |
| member.lastVisitToday | Last visit today | Member row meta (same words as `member.lastVisit.today`) |
| member.lastVisitOne | Last visit yesterday | Member row meta, 1 day (same words as `member.lastVisit.yesterday`) |
| member.meta.week | Week {n} | Member row meta |
| member.meta.coach | Coach {name} | Member row meta |
| member.pace | {x}/wk | Value, e.g. `1.0/wk`, as the board writes it (`board.pace`); `—` if null |
| member.nudge | Nudge | Primary button; disabled never (no-phone case uses in-person variant) |
| member.edit | Change | Owner, quiet button by name, coach and phone |
| member.edit.name | Change name | `aria-label` of the Change button by Name |
| member.edit.coach | Change coach | `aria-label` of the Change button by Coach |
| member.edit.phone | Change phone | `aria-label` of the Change button by Phone |
| member.name | Name | Field label |
| member.firstName | First name | Field label (the name edit and the add dialog) |
| member.lastName | Last name | Field label (the name edit and the add dialog) |
| member.optional | Optional | Meta tag on last name |
| member.coach.none | No Coach | First option of the coach select (the coach edit and the add dialog) |
| member.archive | Archive | Quiet button; owners for any member, coaches for their own |
| member.archiveTitle | Archive this member? | Confirm title |
| member.archiveBody | They leave every list and the kiosk search. Their history stays, and Reports still count it. | Confirm sentence |
| member.archive.ask | Archive {name}? | Confirm title, a question naming the member in full (replaces `member.archiveTitle`) |
| member.archive.says | {first} leaves every list and the kiosk. Their visits still count in Reports, and you can restore them anytime. | Confirm sentence (replaces `member.archiveBody`) |
| member.archiveConfirm | Archive | Confirm primary; echoes the title's verb |
| member.archiveDone | {name} archived | Toast |
| member.archived | Archived | Tag on an archived member's page |
| member.restore | Restore Member | Button on an archived member's page, with the same permissions as `member.archive` |
| member.restoreDone | {name} restored | Toast |
| member.delete | Delete Permanently | Danger button on an archived member's page, owners only |
| member.deleteTitle | Delete this member for good? | Confirm title |
| member.delete.ask | Delete {name}? | Confirm title, a question naming the member in full (replaces `member.deleteTitle`; `member.deleteBody` stays) |
| member.deleteBody | Their visits and nudges are deleted too. This can’t be undone. | Confirm sentence |
| member.deleteConfirm | Delete | Confirm primary (danger); echoes the title's verb |
| member.deleteDone | {name} deleted | Toast; the screen goes back to Members |
| member.weeks.title | The 13 Weeks | Section title |
| member.days.title | The 90 Days | Section title |
| member.checkins.title | Visits | Section title over the member's check-ins |
| member.checkins.empty | No visits yet. Each check-in at the front desk appears here. | Line in the Visits section when there are none |
| member.nudges.title | Nudges | Section title |
| member.nudges.empty | No nudges yet. Each nudge appears here. | Empty line |
| member.nudges.cameBack | Came back | Tag when `cameBack` |
| member.notFound.title | Member Not Found | Page title on a 404 (another coach's member, or a bad id); the server's sentence sits under it |
| member.notFound.back | Back to Members | Primary button under it |

## 7. Nudge composer (dialog on desktop, sheet on phone)
| id | Text | Where |
| --- | --- | --- |
| nudge.title | Nudge {first} | Title, first name |
| nudge.template | Template | Picker label |
| nudge.templateNone | Write My Own | First picker option |
| nudge.text | Message | Textarea label (editable) |
| nudge.helpPhone | Records the nudge, then opens the app you pick with this message to {name}. | Meta, phone variant |
| nudge.howTo | Choose how to send it. Your choice records the nudge. | Line over the channels, phone variant (replaces `nudge.helpPhone`, which has {name}) |
| nudge.helpDesktop | Messages go from your own phone. Choose WhatsApp, or copy the message and send it to {phone}. | Line, computer variant |
| nudge.contact | Contact {first} | Primary, first name; opens the Contact menu (Text message, WhatsApp, Copy message) |
| nudge.contact.text | Text Message | Link styled as a tinted button, first of the composer's stacked channels, phones only; records the nudge as text and opens the text app with the message |
| nudge.contact.whatsapp | WhatsApp | Link styled as a tinted button in the composer's stacked channels; records the nudge as whatsapp and opens WhatsApp with the message |
| nudge.copy | Copy Message | Button, tinted, last of the composer's stacked channels; copies the message, then records the nudge as copy |
| nudge.copied | Message copied. Nudge to {first} recorded. | Copy Message's one toast, once the message is copied and the nudge recorded (in place of `toast.nudge`, so one tap raises one toast) |
| nudge.copyFailed | Couldn’t copy. Select the message and copy it. | Under the message when both ways of copying fail |
| nudge.noPhoneTitle | No Phone on File | Section title, no-phone variant |
| nudge.noPhoneBody | Talk to {first} at the gym, then record the nudge here. | Sentence |
| nudge.noPhoneAction | Record Nudge | Primary; records the nudge as in person, with no link |
| nudge.done | Nudged | Button, the row's Nudge once its nudge is recorded (Button `done`, with a check) |

## 8. Nudges history (`/nudges`)
| id | Text | Where |
| --- | --- | --- |
| nudges.title | Nudges | Page title |
| nudges.sub | Every nudge in the last 30 days. | Meta, owner |
| nudges.subCoach | Your nudges in the last 30 days. | Meta, coach |
| nudges.cameBack | Came back | Tag: a check-in within 7 days after the nudge |
| nudges.waiting | No visit yet | Meta when under 7 days old and no visit yet |
| nudges.noVisit | No visit in 7 days | Meta when 7 days passed with no check-in |
| nudges.empty | No Nudges Yet | Empty title |
| nudges.emptyBody | Nudge a slipping member from Today. Each nudge appears here, with its result after 7 days. | Line under `nudges.empty` |
| nudges.emptyAction | See Who’s Slipping | Link styled as a button under `nudges.emptyBody`, to Today |
| nudges.channel.text | Text | A nudge's channel, after the sender, in the log and on the member page |
| nudges.channel.whatsapp | WhatsApp | The same, for WhatsApp |
| nudges.channel.copy | Copied | The same, for Copy message |
| nudges.channel.inPerson | In person | The same, for Record nudge; a nudge from before the first version shows no channel |

## 9. Reports (`/reports`, owner)
| id | Text | Where |
| --- | --- | --- |
| reports.title | Reports | Page title |
| reports.cohorts.title | Cohorts | Section title, the cohorts' fallback; also the cohort table's region `aria-label` |
| reports.cohorts.explain | Of each month’s new members who reached day 30, 60 or 90, the share who visited in the week before it. | Sentence |
| reports.cohorts.lead | {n}% of new members who joined in {month} were still coming at day {day} | Sentence, the cohorts section's h2: the latest month with a day 90 share, else 60, else 30, skipping a share of 100% or one above the month's earlier day (`reports.cohorts.title` when none) |
| reports.col.month | Joined | Column header; value `Aug 2026` |
| reports.col.members | Members | Column header |
| reports.col.day30 | Day 30 | Column header |
| reports.col.day60 | Day 60 | Column header |
| reports.col.day90 | Day 90 | Column header |
| reports.visits.title | Visits by Week | Section title, the visits chart's fallback when no week has a takeaway |
| reports.visits.explain | Average visits a week since joining, for members still coming and members who slipped. | One sentence |
| reports.visits.lead | By week {n}, members who slipped fell under 2 visits a week | Sentence, the visits chart section's h2: the first week whose slipped average is under 2 (`reports.visits.title` when none is) |
| reports.chart.still | Still coming | Series end label; the solid line, in the text colour |
| reports.chart.slipped | Slipped | Series end label; the dashed line with point markers, in the slipping colour |
| reports.chart.line | The line · 3 a week | End label of the dotted line at 3, in soft text; the chart has no legend |
| reports.chart.stillDef | Still coming: visited in the last 14 days. | Meta under the chart |
| reports.chart.title | Visits a week since joining | Chart title (read by screen readers) |
| reports.chart.axis | Week since joining | X-axis label |
| reports.chart.point | Week {n}: still coming {still}, slipped {slipped} | Data point label |
| reports.chart.none | none | Data point value when a series has no members that week |
| reports.nudges.title | Nudge Results | Section title |
| reports.nudges.explain | Nudges sent in the last 90 days, and whether a check-in followed within 7 days. | One sentence |
| reports.nudges.lead | {n} of {total} nudges led to a visit | Sentence, the nudges section's h2, first on Reports: {n} came back, {total} are past their 7 days (2 or more) |
| reports.nudges.leadOne | {n} of 1 nudge led to a visit | Sentence, the same h2 when exactly 1 nudge is past its 7 days |
| reports.nudges.leadNone | No nudge has had its 7 days yet | Sentence, the same h2 when nudges were sent but none is past its 7 days |
| reports.nudges.leadEmpty | No nudges in the last 90 days | Sentence, the same h2 when none was sent (no bar shows) |
| reports.nudges.noVisit | No visit in 7 days | Legend, the nudges bar's middle part: past their 7 days with no check-in |
| reports.nudges.sent | Nudges sent | KPI label |
| reports.nudges.cameBack | Came back | Legend, the nudges bar's first part |
| reports.nudges.waiting | Still waiting | Legend, the nudges bar's last part: inside their 7 days with no visit yet |
| reports.nudges.rate | Rate | KPI label, `{n}%`, `—` if none sent |

## 10. Templates (`/templates`)
| id | Text | Where |
| --- | --- | --- |
| templates.title | Templates | Page title |
| templates.new | New Template | Primary button, owner only |
| templates.readOnly | Only owners can edit templates. You can use any of them in a nudge. | Line, coaches |
| templates.preview | Preview | Section label |
| templates.field.name | Name | Editor field label |
| templates.field.body | Message | Editor field label |
| templates.sample | Sample member: {name} | Meta above the preview |
| templates.vars.title | Variables | Help label |
| templates.var.first | {first} | the member's first name |
| templates.var.first.def | The member’s first name | Meaning, next to `{first}` |
| templates.var.coach | {coach} | the first name of whoever sends the message |
| templates.var.coach.def | The first name of whoever sends the message | Meaning, next to `{coach}` |
| templates.var.gym | {gym} | your gym's name |
| templates.var.gym.def | Your gym’s name | Meaning, next to `{gym}` |
| templates.var.days | {days} | days since the member's last visit |
| templates.var.days.def | Days since the member’s last visit | Meaning, next to `{days}` |
| templates.save | Save Template | Primary in the editor |
| templates.saved | Template saved | Toast |
| templates.delete | Delete | Quiet button in the editor |
| templates.deleted | Template deleted | Toast |
| templates.deleteTitle | Delete This Template | Dialog title |
| templates.deleteBody | “{name}” will be deleted for everyone. Nudges already sent keep their text. | Dialog sentence |
| templates.deleteConfirm | Delete Template | Dialog primary |
| templates.empty | No Templates | Empty title |
| templates.emptyBody | Write a message once, then start any nudge from it. | Line under `templates.empty` |

## 11. Settings (`/settings`, owner)

### Gym and staff
| id | Text | Where |
| --- | --- | --- |
| settings.title | Settings | Page title |
| settings.gym.title | Gym | Section title |
| settings.gym.name | Gym name | Field label |
| settings.gym.tz | Timezone | Field label |
| settings.gym.country | Country | Field label; a select of the five open markets |
| settings.saved | Settings saved | Toast |
| settings.staff.title | Staff | Section title |
| settings.staff.inactive | Inactive | Meta tag |
| settings.staff.memberOne | 1 member | Staff row meta, exactly 1 |
| settings.staff.members | {n} members | Staff row meta |
| settings.staff.slipping | {n} slipping | Staff row meta |
| settings.invite | Invite Staff | Primary button; opens the invite dialog |
| settings.invite.name | Name | Dialog field label |
| settings.invite.email | Email | Dialog field label; the invite is emailed here |
| settings.invite.role | Role | Dialog choice label; the options are `role.coach` and `role.owner` |
| settings.invite.create | Create Link | Dialog primary |
| settings.invite.hint | This link was emailed to {email}. It works once, until {date}. | Dialog sentence, over the link to copy; the date in the gym's locale |
| settings.invite.copy | Copy Link | Button |
| settings.invite.copied | Invite link copied | Toast |
| settings.deactivate | Deactivate | Row button |
| settings.deactivateTitle | Deactivate {name} | Dialog title |
| settings.deactivateBody | {name} won’t be able to log in. Their members stay on the board. | Dialog sentence |
| settings.deactivateConfirm | Deactivate | Dialog primary |
| settings.reactivate | Reactivate | Row button on an inactive staff member |
| settings.account.title | Account | Section title, Settings' last group (owners, below 1024 px): holds Log Out |

### Open on a phone
| id | Text | Where |
| --- | --- | --- |
| phone.title | Open on a Phone | Section title |
| phone.step1 | 1. Put this computer and your phone on the same Wi‑Fi. | Step |
| phone.step2 | 2. Scan this code, or type the address. | Step |
| phone.qr | QR code for {url} | Image alt text |
| phone.none | No network address found. Connect this computer to Wi‑Fi, then reload the page. | When `phoneUrls` is empty |
| phone.copy | Copy Link | Button |
| phone.copied | Phone link copied | Toast |
| settings.link.show | Show Link | Button, plain, under each QR code in Settings: shows the link and its Copy Link (`aria-expanded`) |
| settings.link.hide | Hide Link | Button, the same disclosure while the link shows |

### Kiosk
| id | Text | Where |
| --- | --- | --- |
| kiosk.set.title | Kiosk | Section title |
| kiosk.set.body | Open it on the front-desk screen. Members check in with their phone number, without logging in. | Sentence |
| kiosk.set.open | Open the Kiosk | Secondary-button link; opens the kiosk in a new tab |
| kiosk.set.copy | Copy Link | Button |
| kiosk.set.copied | Kiosk link copied | Toast |

### Import box
| id | Text | Where |
| --- | --- | --- |
| settings.import.title | Import | Section title |
| settings.import.body | Bring in your member list or past check-ins from a CSV file. | Sentence |
| settings.import.link | Import Members or Check-Ins | Secondary-button link to `/app/settings/import` |

### Import (`/app/settings/import`, owner)
| id | Text | Where |
| --- | --- | --- |
| import.title | Import | Page title |
| import.step1 | 1. Choose a CSV file. | Step |
| import.step2 | 2. Match the columns. | Step |
| import.step3 | 3. Check the preview, then import. | Step |
| import.kind | What to import | Label of the segmented choice |
| import.kind.members | Members | Option |
| import.kind.checkins | Check-Ins | Option |
| import.choose | Choose CSV File | Button |
| import.paste | Or paste the CSV | Textarea label |
| import.map.title | Columns | Mapping section label |
| import.map.pick | Choose a Column | Option, select placeholder |
| import.map.required | Required | Meta tag |
| import.field.external_id | Member ID | Members and check-ins |
| import.field.first_name | First name | Required, unless Full name is chosen |
| import.field.full_name | Full name | Members; the first word becomes the first name and the rest the last name |
| import.field.last_name | Last name | Members |
| import.field.phone | Phone | Members; check-ins (when no member ID) |
| import.field.email | Email | Members |
| import.field.joined_on | Joined on | Required, members |
| import.field.coach_email | Coach email | Members |
| import.field.checked_in_at | Checked in at | Required, check-ins |
| import.sample | First 10 rows | Preview table label |
| import.preview | Preview | Section label |
| import.rowOne | 1 row | Meta, exactly 1 |
| import.rows | {n} rows | Meta |
| import.summary | {created} new, {updated} updated, {skipped} skipped | Result line, e.g. `12 new, 0 updated, 2 skipped` |
| import.problem | Row {n}: {problem} | Per-row line, e.g. `Row 7: no join date.`; `{problem}` is one of the row problems below |
| import.problems | Problems | Section label above the per-row lines |
| import.commit | Import Members | Primary for members; Import check-ins for check-ins |
| import.commitCheckins | Import Check-Ins | Primary for check-ins |
| import.done | Import finished | Toast |

### Import: the date order
| id | Text | Where |
| --- | --- | --- |
| import.dates.monthFirst | Dates are read month first. | The date-order line |
| import.dates.dayFirst | Dates are read day first. | The date-order line |
| import.dates.fromFile | Set from the file: some of its dates only read this way. | After the date-order line, when the file's dates settle the order |
| import.dates.fromCountry | Set from your gym’s country. Check the first rows below. | After the date-order line, otherwise |
| import.dates.rows | How the first rows read | Label over the rows as read |
| import.dates.row | Row {n}: {raw} is {date} | A row as read; `{date}` in the gym's locale, e.g. `Row 2: 03/04/2026 is 3 Apr 2026` |
| import.dates.rowBad | Row {n}: {raw} can’t be read this way | A row whose date doesn't read in this order |
| import.dates.toDayFirst | Read Them Day First | Quiet button while dates are read month first |
| import.dates.toMonthFirst | Read Them Month First | Quiet button while dates are read day first |

### Import: problems with the whole file
Ported from the old import (`csv.mjs`, `mapping.mjs`, `plan.mjs`), with the name lines widened for a Full name column.

| id | Text | Where |
| --- | --- | --- |
| import.problem.unclosedQuote | The file ends inside a quoted value. Check for a missing closing quote. | Reading the CSV |
| import.problem.extraColumns | Row {n} has {count} columns but the header has {columns}. | Reading the CSV |
| import.problem.missingColumns | Row {n} has only {count} of {columns} columns. | Reading the CSV |
| import.problem.findName | No name column found. Choose the one with first or full names. | Suggesting the mapping, members |
| import.problem.findJoinDate | No join date column found. Choose the one that holds it. | Suggesting the mapping, members |
| import.problem.findCheckinTime | No check-in date and time column found. Choose the one that holds it. | Suggesting the mapping, check-ins |
| import.problem.findMatch | No member ID or phone column found to match check-ins to members. Choose one. | Suggesting the mapping, check-ins |
| import.problem.noNameColumn | No first name or full name column is chosen, so no members can be imported. | Checking, members |
| import.problem.noJoinDateColumn | No join date column is chosen, so no members can be imported. | Checking, members |
| import.problem.noCheckinTimeColumn | No check-in time column is chosen, so no check-ins can be imported. | Checking, check-ins |
| import.problem.noMatchColumn | No member ID or phone column is chosen, so check-ins cannot be matched to members. | Checking, check-ins |

### Import: problems with a row (each after `Row {n}: `, through `import.problem`)
| id | Text | Where |
| --- | --- | --- |
| import.problem.noFirstName | no first name. | Skipped, members (a first name column) |
| import.problem.noName | no name. | Skipped, members (a full name column) |
| import.problem.noJoinDate | no join date. | Skipped, members |
| import.problem.badJoinDate | couldn’t read the join date “{value}”. | Skipped, members |
| import.problem.badPhone | “{value}” isn’t a valid phone number, so it was left blank. | Kept, members; read in the gym's country |
| import.problem.phoneTaken | “{value}” is another member’s phone number, so the phone was left as it was. | Kept, members |
| import.problem.badEmail | “{value}” isn’t a valid email address, so it was left blank. | Kept, members |
| import.problem.unknownCoach | no coach has the email “{value}”, so no coach was assigned. | Kept, members |
| import.problem.idUsedEarlier | the member ID “{value}” is already used earlier in the file. Give this row its own ID. | Skipped, members |
| import.problem.repeated | this member already appears earlier in the file. | Skipped, members |
| import.problem.upToDate | already up to date. | Skipped, members |
| import.problem.restored | this member was archived, so importing restores them. | Kept, members: a row that matches an archived member |
| import.problem.noMemberId | no member matches ID “{value}”. | Skipped, check-ins |
| import.problem.noMemberPhone | no member matches phone “{value}”. | Skipped, check-ins |
| import.problem.noMemberKey | no member matches this row (no ID or phone). | Skipped, check-ins |
| import.problem.noCheckinTime | no check-in time. | Skipped, check-ins |
| import.problem.badCheckinTime | couldn’t read the check-in time “{value}”. | Skipped, check-ins |
| import.problem.future | the check-in time is in the future. | Skipped, check-ins |
| import.problem.beforeJoined | the check-in is before the member joined ({date}). | Skipped, check-ins; `{date}` in the gym's locale |
| import.problem.withinHour | duplicate: this member already has a check-in within an hour. | Skipped, check-ins |

## 12. Billing (`/billing`, owner)
| id | Text | Where |
| --- | --- | --- |
| billing.title | Billing | Page title |
| billing.pilot | Pilot Day {n} of 90 | Section title, over the 90 days drawn as one bar |
| billing.offer | Free 90-day pilot. | Headline |
| billing.flat | Unlimited members during the pilot. | Sentence |

## 13. Me (`/me`, phone)
| id | Text | Where |
| --- | --- | --- |
| me.title | Me | Page title |
| me.name | Name | Field label |
| me.email | Email | Field label |
| me.gym | Gym | Field label |
| me.role | Role | Field label |
| me.logout | Log Out | Plain button in the tint, as Settings' Account group (audit A16) |
| theme.choice | Theme | Label of the theme setting |
| theme.choice.light | Light | Theme option |
| theme.choice.dark | Dark | Theme option |
| theme.choice.system | Same as Device | Option of the theme setting (the default) |

## 14. Kiosk (`/kiosk/:token`)
Full screen, no nav. The gym name sits top left, and the Sample data tag (`tag.sample`) top right for the demo gym only.

| id | Text | Where |
| --- | --- | --- |
| kiosk.idle.title | Check In | Idle title |
| kiosk.idle.prompt | Enter your phone number. | Under the title |
| kiosk.mode.phone | Phone Number | Segment, the kiosk's first way to check in (ChoiceGroup lg, 64 px) |
| kiosk.mode.name | Name | Segment, the kiosk's second way to check in |
| kiosk.mode.label | How to check in | `aria-label` of that segmented choice |
| kiosk.keypad.back | ⌫ | Key (aria-label from `kiosk.keypad.backLabel`) |
| kiosk.search.toggle | Use My Name | Quiet button; the segmented choice (`kiosk.mode.*`) replaces it, and the id stays until the cleanup |
| kiosk.search.label | First name | Input label |
| kiosk.search.none | No member by that name. Try your phone number. | Empty results |
| kiosk.search.noneFor | No member named “{query}”. Check the spelling, or use your phone number. | Line, a name search with no match (replaces `kiosk.search.none`) |
| kiosk.join | Join the Gym | Plain button in its fixed slot; opens the join form |
| kiosk.join.submit | Join and Check In | Primary |
| kiosk.welcome.first | Welcome, {first}. Day 1 of 90. | First visit (day 0) |
| kiosk.welcome.back | Welcome back, {first}. Week {n}. | Returning member, before day 90 |
| kiosk.welcome.plain | Welcome back, {first}. | Returning member from day 90: no week, and the visits line stays |
| kiosk.welcome.line | On the line this week. | Sub line when `visitsThisWeek` is 3 or more |
| kiosk.welcome.visits | {n} of 3 visits this week. | Line under the welcome when under 3 (`kiosk.welcome.visit` for exactly 1) |
| kiosk.notFound | That number isn’t on file. Try your name, or join as a new member. | Line in the prompt slot: a phone check-in that finds nobody (404 `kioskNotFound`) |
| kiosk.reset | Ready for the next member in {n}. | Hint while the confirmation shows, counting 5 to 1 |
| kiosk.idle.still | Still there? | Sheet title, after 60 s without a touch mid-entry (a question, so sentence case) |
| kiosk.idle.startOver | Starting over in {n}. | Line under that sheet's title, counting 20 to 1 |
| kiosk.idle.keepGoing | Keep Going | Primary button, the sheet's one action: closes it and keeps what was typed |
| kiosk.phone.hint | Number from another country? Start with + and the country code. | Line, no longer shown: `err.phone` already says it, so the kiosk shows that one sentence alone (audit B2-02); the id stays until the cleanup |
| kiosk.display.label | Phone number | Number display `aria-label` |
| kiosk.keypad.label | Phone keypad | Keypad `aria-label` |
| kiosk.keypad.backLabel | Delete last digit | ⌫ key `aria-label` |
| kiosk.keypad.plusLabel | Plus sign, for the country code | + key `aria-label` |
| kiosk.keypad.submit | Check In | Keypad primary |
| kiosk.search.phone | Use My Phone Number | Quiet button, back to the keypad; the segmented choice (`kiosk.mode.*`) replaces it, and the id stays until the cleanup |
| kiosk.search.results | Matching members | Results list `aria-label` |
| kiosk.notFound.action | Try your name, or join as a new member. | Added after a server sentence that is not the 404 one (`kiosk.notFound` keeps the 404 sentence first) |
| kiosk.welcome.visit | 1 of 3 visits this week. | Line under the welcome, exactly 1 (`kiosk.welcome.visits` for 0 or 2) |
| kiosk.join.title | Join | Join form title |
| kiosk.join.prompt | Your first name is enough. Add a phone number to check in with it next time. | Under the join title |
| kiosk.join.promptName | Your first name is enough. | Under the join title on the demo gym, which asks for no phone |
| kiosk.join.first | First name | Field label |
| kiosk.join.last | Last name | Field label |
| kiosk.join.phone | Phone | Field label |
| kiosk.join.optional | Optional | Meta tag on last name and phone |
| kiosk.join.firstRequired | Enter your first name. | Field error (same words as the server) |
| kiosk.join.cancel | Cancel | Secondary in the join form |
| kiosk.retry | Try Again | Button after an error |
| kiosk.bad.title | This Link Doesn’t Work | Title when the kiosk's link doesn't work (404 `linkInvalid`, on load or mid-use), and the tab title then |
| kiosk.bad | The gym’s owner can open the kiosk again from Settings. | Sentence under `kiosk.bad.title` |
| kiosk.loading | Loading… | Line while the kiosk loads (a progress label) |

## 15. Toasts (4 s)
| id | Text | When |
| --- | --- | --- |
| toast.checkin | {name} checked in | Live event, e.g. `Sam O. checked in` |
| toast.nudge | Nudge to {first} recorded | Toast after Text Message, WhatsApp or Record Nudge, once the nudge is recorded (Copy Message says `nudge.copied` instead) |
| toast.inviteCopied | Invite link copied | Settings |
| toast.import | Import finished | Import commit; the summary line sits in the panel |
| toast.dismiss | Dismiss | Each toast's close button `aria-label` |

## 16. Errors

### From the API (SPEC §6; the server sends the sentence, the client shows it as given)
| id | Text | Where |
| --- | --- | --- |
| api.loginMismatch | That email and password don’t match. | 401 login |
| api.loginTooMany | Too many attempts. Try again in 10 minutes. | 429 login |
| api.kioskNotFound | That number isn’t on file. | 404 kiosk check-in |
| api.memberNotFound | This member was deleted, or isn’t assigned to you. | 404 member (coach asking for another coach's member, or bad id) |
| api.linkInvalid | This link no longer works. Ask for a new one. | 404 invite / token |
| api.role | Only an owner can do that. Ask an owner. | 403 role |
| api.duplicate | That email or phone number is already in use. Check it and try again. | 409 duplicate |
| api.generic | Part of that form isn’t valid. Check it and try again. | 400 generic |

### Client validation (one red line under the field)
| id | Text |
| --- | --- |
| err.required | Required. |
| err.email | Enter an email like name@gym.com. |
| err.password | Use 8 characters or more. |
| err.match | The passwords don’t match. |
| err.phone | Enter a number from your gym’s country, or + and the country code. |
| err.csv | That file isn’t a CSV. Choose a .csv file. |
| err.mapping | Choose a column for each required field. |
| err.network | Can’t reach Regulars. Check your connection and try again. |
| err.session | Your session ended. Log in again. |
| err.server | Something went wrong. Try again in a minute. |

### Also from the API (the server sends the sentence, the client shows it as given)
| id | Text | Where |
| --- | --- | --- |
| api.kioskTooMany | Too many tries. Try again in a minute. | 429 kiosk (30 tries a minute per device) |
| api.kioskFirstName | Enter your first name. | 400 kiosk join, no first name |
| api.importTooBig | That file is over 2 MB. Choose a CSV of 2 MB or less. | 400 import, CSV over 2 MB (413 when the whole request is over 4 MB) |
| api.signIn | Log in to continue. | 401 not logged in (any route but login) |
| api.json | Send the request as JSON. | 400 request not sent as JSON |
| api.crossSite | This request didn’t come from Regulars. | 403 request from another site |
| api.notApi | That isn’t part of the Regulars API. | 404 unknown API path |
| api.notFound | Not found. | 404 anything else |
| api.passwordTooLong | That password is too long. Use 200 characters or fewer. | 400 password over 200 characters |
| api.gymName | Enter your gym’s name. | 400 no gym name |
| api.yourName | Enter your name. | 400 no name (sign-up, invite) |
| api.coachName | Enter the name of the person you’re inviting. | 400 no name (invite) |
| api.timezone | Choose a timezone from the list. | 400 timezone |
| api.qrLink | That link can’t be made into a QR code. | 400 QR code for an address that isn't this computer's |
| api.statusFilter | Choose a status from the list. | 400 status filter |
| api.coachChoice | Choose a coach from your staff. | 400 coach not on staff |
| api.coachNotFound | This coach was removed, or isn’t on your staff. | 404 coach |
| api.coachActive | Choose whether the coach is active. | 400 coach active flag missing |
| api.ownerActive | The last active owner can’t be deactivated. | 400 deactivating the gym's last active owner |
| api.templateNotFound | This template was deleted. | 404 template |
| api.templateName | Enter a name for the template. | 400 template with no name |
| api.templateChoice | Choose a template or write a message. | 400 nudge with no template or message |
| api.messageBody | Enter a message of 1,000 characters or fewer. | 400 message missing or over 1,000 characters |
| api.tooLarge | That request is over 64 KB. Send 64 KB or less. | 413 request body over 64 KB (any route but import) |
| api.signupTooMany | Too many sign-ups from this device. Try again in 10 minutes. | 429 sign-up (5 per 10 minutes per device) |
| api.country | Choose a country from the list. | 400 country missing or not one of the five (sign-up, Settings) |
| api.memberFirstName | Enter the member’s first name. | 400 member with no first name (add member, name edit) |
| api.joinedOn | Choose a join date of today or earlier. | 400 join date missing, unreadable or in the future (add member) |
| api.memberNotArchived | Archive this member before deleting them. | 409 deleting a member who isn't archived |
| api.memberArchived | Please see the front desk to check in. | 409 kiosk: a typed phone, or a join, that matches an archived member; nothing is recorded |
| api.resetInvalid | This reset link has expired or was already used. Get a new one from the log-in page. | Error, 404 reset link unknown, used, or over an hour old |
| api.resetTooMany | Too many reset requests. Try again in 10 minutes. | 429 reset requests |
| api.inviteRole | Choose whether to invite a coach or an owner. | 400 invite with no role, or one that isn't coach or owner |

### Pages that can't open
| id | Text | Where |
| --- | --- | --- |
| routeError.title | Can’t Open This Page | Page title when a screen fails to load or breaks (inside the shell under /app) |
| routeError.body | Check your connection and try again. | Under the title |
| routeError.retry | Try Again | Primary button: loads the page again |
| notFound.title | Page Not Found | Page title for an address that isn't part of Regulars |
| notFound.body | Check the address, or start again from the home page. | Under the title |
| notFound.link | Go to the Home Page | Secondary-button link to `/` |

## 17. Accessibility labels
| id | Text | Where |
| --- | --- | --- |
| a11y.logo | Regulars | Wordmark `aria-label` / alt (link to Today) |
| a11y.cell.visits | Week {n}: {v} visits | Board cell; `Week 3: 2 visits`, `Week 3: 1 visit` |
| a11y.cell.one | Week {n}: 1 visit | Board cell with 1 |
| a11y.cell.none | Week {n}: no visits | Board cell with 0 |
| a11y.cell.now | Week {n}: in progress, {v} visits so far | Current week; `Week 5: in progress, 1 visit so far` |
| a11y.cell.nowOne | Week {n}: in progress, 1 visit so far | Current week with 1 |
| a11y.cell.future | Week {n}: not reached yet | Weeks after the current one |
| a11y.tabs | Main | The main navigation's `aria-label`: the sidebar from 1024 px |
| a11y.tabbar | Tabs | Phone tab bar `aria-label` |
| a11y.more | More | Phone More tab `aria-label` |
| a11y.nudge | Nudge | Icon-only nudge button |
| a11y.nudgeMember | Nudge {name} | Nudge button on a member row or card |
| a11y.nudgedMember | Nudged {name} | `aria-label` of the done button (`nudge.done`) |
| a11y.nudgeBar | Nudges sent: {sent}. Came back: {back}. No visit in 7 days: {none}. Still waiting: {waiting}. | `aria-label` of the nudges' part-to-whole bar (role img) |
| a11y.backTo | Back to {page} | `aria-label` of the member page's back link; `{page}` is its visible word |
| a11y.footnote | Source {n} | `aria-label` of a figure's footnote link to its numbered source |
| a11y.openMember | Open {name} | Accessible name of a row's Open button (`common.open`), e.g. `Open Sam O.` |
| a11y.slipping | `, slipping` | Appended to a member name on the board when slipping |
| a11y.days.one | {n} visit in the first {d} days | The 90 days grid, exactly 1 visit |
| a11y.days.many | {n} visits in the first {d} days | The 90 days grid |
| a11y.chart | Line chart: average visits a week since joining, for members still coming and members who slipped | Reports chart |
