# Copy change log

## App (COPY.md and server messages)

Voice: DESIGN.md §2, calm, exact, sure. Big lines (buttons, titles, status names, empty-state headlines, kiosk welcome lines, every COPY id in a `picks.json` `where` list) are unchanged. `API:` rows are §16 cases, sent by `server/messages.mjs`.

### Changed

| id | Before | After |
| --- | --- | --- |
| invite.bad | This invite link isn't valid anymore. Ask your owner for a new one. | This invite has expired or was already used. Ask your owner for a new link. |
| shell.pilot | PILOT DAY {n} OF 90 | Pilot day {n} of 90 |
| today.checkins.empty | No check-ins yet today. | No check-ins yet today. They appear here as members arrive. |
| today.empty.body | Import your member list, or let people check in at the front desk. Tenure starts tracking at their first visit. | Import your member list, or have members check in at the front desk. The board fills from there. |
| today.empty.coach | Your owner hasn't assigned you any members yet. | No members are assigned to you yet. They appear here once your owner assigns them. |
| board.emptyBody | Nobody matches these filters. Clear the search or pick ALL. | No members match these filters. Clear the search or choose ALL. |
| member.checkins.empty | No check-ins yet. | No check-ins yet. Each visit is listed here. |
| member.nudges.empty | No nudges yet. | No nudges yet. Recorded nudges are listed here. |
| nudge.helpPhone | Sends from your own phone, to {name}. | Records the nudge, then opens your text app with this message to {name}. |
| nudge.helpDesktop | Tenure doesn't send texts. Copy this and text {phone} from your phone. | Tenure doesn't send texts. Copy the message and send it to {phone} from your phone. |
| nudge.copied | Text copied | Message copied |
| nudge.noPhoneBody | Talk to {first} at the gym, then record it here. | Talk to {first} at the gym, then record the nudge here. |
| nudges.sub | The last 30 days. | Every nudge in the last 30 days. |
| nudges.waiting | Waiting | No visit yet |
| nudges.noVisit | No visit | No visit in 7 days |
| reports.cohorts.explain | Of members who joined in a month, the share who reached day 30, 60 or 90 and visited in the 7 days before it. | For each month's new members, the share who reached day 30, 60 or 90 and visited in the 7 days before it. |
| reports.visits.explain | Average visits per week since joining, for members still coming and for members who slipped. | Average visits a week since joining, for members still coming and members who slipped. |
| reports.nudges.explain | Of the nudges sent in the last 90 days, the share followed by a check-in within 7 days. | The share of nudges sent in the last 90 days that were followed by a check-in within 7 days. |
| templates.deleteBody | "{name}" will be gone for everyone. Nudges already sent keep their text. | "{name}" will be deleted for everyone. Nudges already sent keep their text. |
| templates.emptyBody | Add one so every nudge starts from a good message. | Add one, and every nudge can start from it. |
| settings.deactivateBody | {name} can't log in anymore. Their members stay on the board. | {name} won't be able to log in. Their members stay on the board. |
| phone.step2 | 2. Join that Wi-Fi on your phone. | 2. Connect your phone to that Wi-Fi. |
| phone.none | No network address found. Connect this computer to Wi-Fi and reload. | No network address found. Connect this computer to Wi-Fi, then reload the page. |
| kiosk.set.body | Put this on the front-desk screen. Members check in with their phone number. No login needed. | Open it on the front-desk screen. Members check in with their phone number, without logging in. |
| import.step2 | 2. Check the columns. | 2. Match the columns. |
| import.step3 | 3. Review the preview and import. | 3. Check the preview, then import. |
| import.map.pick | Pick a column | Choose a column |
| kiosk.idle.prompt | Type your phone number. | Enter your phone number. |
| kiosk.search.none | No match. Try your phone number. | No member by that name. Try your phone number. |
| kiosk.reset | Resetting in {n}. | Ready for the next member in {n}. |
| 429 login | Too many tries. Wait 10 minutes and try again. | Too many attempts. Try again in 10 minutes. |
| 404 invite / token | This link isn't valid anymore. | This link no longer works. Ask for a new one. |
| 403 role | Your role can't do that. Ask your owner. | Only the owner can do that. Ask your owner. |
| 409 duplicate | That already exists. Check the details and try again. | That email or phone number is already in use. Check it and try again. |
| 400 generic | Something in that form isn't right. Check it and try again. | Part of that form isn't valid. Check it and try again. |
| err.mapping | Pick a column for each required field. | Choose a column for each required field. |
| a11y.chart | Line chart: average visits per week for members still coming and for members who slipped | Line chart: average visits a week since joining, for members still coming and members who slipped |
| API: 429 kiosk (30 tries a minute per device) | Too many tries. Wait a minute and try again. | Too many tries. Try again in a minute. |
| API: 400 import, file over 2 MB | That file is too big. Import a CSV of 2 MB or less. | That file is over 2 MB. Choose a CSV of 2 MB or less. |
| API: 401 not logged in (any route but login) | Please log in. | Log in to continue. |
| API: 400 password over 200 characters | That password is too long. | That password is too long. Use 200 characters or fewer. |
| API: 400 timezone | Choose a valid timezone. | Choose a timezone from the list. |
| API: 400 status filter | Unknown status filter. | Choose a status from the list. |
| API: 400 coach active flag missing | Say whether the coach is active. | Choose whether the coach is active. |
| API: 400 deactivating the owner | The owner's account can't be turned off. | The owner's account can't be deactivated. |
| API: 400 template with no name | Give the template a name. | Enter a name for the template. |
| API: 400 message missing or over 1,000 characters | Write the message (up to 1000 characters). | Enter a message of 1,000 characters or fewer. |
| err.phone | Enter a 10-digit US phone number. | Enter a 10-digit US number, or + and the country code. |

### Added ids

These were used by the app but missing from COPY.md, so the screen showed the code's fallback. Where the words differ from that fallback, it is noted.

| id | Text | Fallback in code, where different |
| --- | --- | --- |
| nav.menu | MENU |  |
| today.slipping.rowNever | No visits yet · Coach {coach} | Never visited · Coach {coach} |
| today.slipping.rowToday | Last visit today · Coach {coach} |  |
| today.slipping.rowYesterday | Last visit yesterday · Coach {coach} |  |
| today.board.open | OPEN THE BOARD |  |
| board.legend.low | 1–2 |  |
| board.legend.none | NONE |  |
| board.legend.week | THIS WEEK |  |
| board.aria | The 90-day board |  |
| board.head.member | NEW MEMBER |  |
| board.pace | {x}/WK |  |
| members.count.one | 1 member |  |
| members.col.name | NAME |  |
| members.weekCell | {n} / 13 |  |
| members.last.today | Today |  |
| members.last.yesterday | Yesterday |  |
| members.last.days | {n} days ago |  |
| member.lastVisit.never | No visits yet | Never visited |
| member.lastVisit.today | Last visit today |  |
| member.lastVisit.yesterday | Last visit yesterday |  |
| member.lastVisitNone | No visits yet |  |
| member.lastVisitToday | Last visit today |  |
| member.lastVisitOne | Last visit yesterday | Last visit 1 day ago |
| member.meta.week | Week {n} |  |
| member.meta.coach | Coach {name} |  |
| nudges.subCoach | Your nudges in the last 30 days. | Your nudges, last 30 days. |
| reports.chart.title | Visits a week since joining |  |
| reports.chart.axis | Week since joining |  |
| reports.chart.point | Week {n}: still coming {still}, slipped {slipped} |  |
| reports.chart.none | none |  |
| templates.var.first.def | The member's first name | the member's first name |
| templates.var.coach.def | The first name of whoever sends the text | the first name of whoever sends the text |
| templates.var.gym.def | Your gym's name | your gym's name |
| templates.var.days.def | Days since the member's last visit | days since the member's last visit |
| templates.field.name | NAME |  |
| templates.field.body | MESSAGE |  |
| templates.sample | Sample member: {name} |  |
| templates.delete | DELETE |  |
| templates.deleted | Template deleted |  |
| settings.staff.memberOne | 1 member |  |
| settings.staff.members | {n} members |  |
| settings.staff.slipping | {n} slipping |  |
| settings.invite.name | COACH NAME |  |
| kiosk.set.copy | COPY LINK |  |
| import.kind | WHAT TO IMPORT |  |
| import.kind.members | MEMBERS |  |
| import.kind.checkins | CHECK-INS |  |
| import.paste | OR PASTE THE CSV |  |
| import.preview | PREVIEW |  |
| import.rowOne | 1 row |  |
| import.rows | {n} rows |  |
| import.problems | PROBLEMS |  |
| import.commitCheckins | IMPORT CHECK-INS |  |
| me.name | NAME |  |
| me.email | EMAIL |  |
| me.gym | GYM |  |
| me.role | ROLE |  |
| common.close | CLOSE |  |
| common.loading | Loading |  |
| role.owner | OWNER |  |
| role.coach | COACH |  |
| a11y.cell.one | Week {n}: 1 visit |  |
| a11y.cell.nowOne | Week {n}: in progress, 1 visit so far |  |
| a11y.tabbar | Tabs |  |
| a11y.more | More |  |
| a11y.nudge | Nudge |  |
| a11y.nudgeMember | Nudge {name} |  |
| a11y.slipping | , slipping |  |
| a11y.days.one | {n} visit in the first {d} days |  |
| a11y.days.many | {n} visits in the first {d} days |  |
| auth.hero.day | DAY |  |
| auth.hero.line | GET EVERY NEW MEMBER THERE. |  |
| auth.hero.aria | Day 90. Get every new member there. |  |
| kiosk.phone.hint | Not a US number? Start with + and the country code. |  |
| kiosk.display.label | Phone number |  |
| kiosk.keypad.label | Phone keypad |  |
| kiosk.keypad.backLabel | Delete last digit |  |
| kiosk.keypad.plusLabel | Plus sign, for the country code | Plus, then the country code |
| kiosk.keypad.submit | CHECK IN |  |
| kiosk.search.phone | USE MY PHONE NUMBER |  |
| kiosk.search.results | Matching members |  |
| kiosk.notFound.action | Try your name, or tap NEW HERE? JOIN. |  |
| kiosk.welcome.visit | 1 visit this week. |  |
| kiosk.join.title | JOIN |  |
| kiosk.join.prompt | Your first name is enough. Add a phone number to check in with it next time. | Your first name is enough. Add your phone to check in faster next time. |
| kiosk.join.first | FIRST NAME |  |
| kiosk.join.last | LAST NAME |  |
| kiosk.join.phone | PHONE |  |
| kiosk.join.optional | OPTIONAL |  |
| kiosk.join.firstRequired | Enter your first name. |  |
| kiosk.join.cancel | CANCEL |  |
| kiosk.retry | TRY AGAIN |  |
| kiosk.loading | Loading |  |

### Two id sets for the same last-visit words (unify in code later)

| Member page and table (`components/core/bits.jsx`) | Member row meta (`util.js` `lastVisitText`) | Text |
| --- | --- | --- |
| member.lastVisit.never | member.lastVisitNone | No visits yet |
| member.lastVisit.today | member.lastVisitToday | Last visit today |
| member.lastVisit.yesterday | member.lastVisitOne | Last visit yesterday |

Both sets fall through to `member.lastVisit` for 2 or more days. `today.slipping.rowNever` and the Members table cell use the same "No visits yet".

### Also changed in COPY.md, outside the text column

- `shell.pilot` now in sentence case (the sidebar meta line does not uppercase); `billing.pilot` stays in capitals as a section title.
- New subsection §16 "Also from the API" holds the 23 server sentences that were not in COPY; the 8-row "From the API" table keeps its rows.
- "Where" notes updated for `today.slipping.row`, `members.col.last`, `member.lastVisit`, `a11y.tabs` (it labels the sidebar, not the phone tab bar) and `kiosk.keypad.back`.
