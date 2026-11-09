# Tenure app — UI copy deck (v1.0)

**How to use this file.** Screen builders take strings from here verbatim, by id. Do not reword, shorten or add punctuation. A string you need that is not here gets added here first, then used. Rules: titles, section titles, tabs, buttons, tags and column headers are in CAPITALS; sentences in sentence case; US spelling; numerals always; no exclamation marks. Sources: `../brand/DESIGN.md` §2, §12; `SPEC.md` §2, §4–§8.
Tokens in `{braces}` are filled by the client. Plurals: use the `1 visit` / `2 visits` form (singular only for exactly 1). Rendered names: `Sam O.` (first name + last initial); in CAPITALS contexts `SAM O.`.

## 0. Shared words
| id | Text | Where |
| --- | --- | --- |
| brand.name | TENURE | Logo, wordmark, page title suffix |
| brand.descriptor | MEMBER RETENTION FOR INDEPENDENT GYMS | Login, under the wordmark |
| tag.sample | SAMPLE DATA | Top right of every screen of the demo gym (`isDemo`) |
| common.save | SAVE | Button |
| common.cancel | CANCEL | Button |
| common.search | Search | Input placeholder |
| common.none | — | Empty value (no pace, no coach, no date) |
| common.close | CLOSE | Button (dialogs, phone menu) |
| common.loading | Loading | Loading line |
| role.owner | OWNER | Role tag |
| role.coach | COACH | Role tag |

## 1. Status names and definitions (SPEC §4, first match wins)
| id | Name | One-line definition | Tag color |
| --- | --- | --- | --- |
| status.slipping | SLIPPING | Fewer than 2 visits in each of the last 2 finished weeks. | red |
| status.new | NEW | Fewer than 2 finished weeks so far. | chalk |
| status.on | ON THE LINE | 3 or more visits in the last finished week. | yellow |
| status.below | BELOW THE LINE | 1 or 2 visits in the last finished week, and not slipping. | steel |

Order of checks, shown in the legend help: SLIPPING, NEW, ON THE LINE, BELOW THE LINE.
`status.note` — "Only the first 90 days count. A finished week is a full 7 days." (legend help, Board and Reports)

## 2. Login, Sign up, Invite accept

### `/login`
| id | Text | Where |
| --- | --- | --- |
| login.title | LOG IN | Page title |
| login.tagline | KEEP NEW MEMBERS PAST DAY 90. | Under the title |
| login.email | EMAIL | Field label |
| login.password | PASSWORD | Field label |
| login.submit | LOG IN | Primary button |
| login.submitting | LOGGING IN | Button while sending |
| login.toSignup | New gym? Create your account. | Quiet link (text only; the link is "Create your account.") |
| login.passwordRequired | Enter your password. | Field error, password left empty |

### Hero (login and sign-up)
| id | Text | Where |
| --- | --- | --- |
| auth.hero.day | DAY | Hero, small word above 90 |
| auth.hero.line | GET EVERY NEW MEMBER THERE. | Hero line under DAY 90 |
| auth.hero.aria | Day 90. Get every new member there. | Hero `aria-label` |

### `/signup`
| id | Text | Where |
| --- | --- | --- |
| signup.title | SET UP YOUR GYM | Page title |
| signup.lede | Free 90-day pilot. Then $99 a month. | Under the title |
| signup.gymName | GYM NAME | Field label |
| signup.name | YOUR NAME | Field label |
| signup.email | EMAIL | Field label |
| signup.password | PASSWORD | Field label |
| signup.passwordHelp | 8 characters or more. | Meta under the field |
| signup.submit | START THE PILOT | Primary button |
| signup.toLogin | Already have an account? Log in. | Quiet link |
| signup.submitting | CREATING YOUR GYM | Button while sending |
| signup.gymNameRequired | Enter your gym's name. | Field error (same words as the server) |
| signup.nameRequired | Enter your name. | Field error (same words as the server) |

### `/invite/:token`
| id | Text | Where |
| --- | --- | --- |
| invite.title | JOIN {gymName} | Page title; gym name in capitals |
| invite.lede | Your owner invited you as a coach. | Under the title |
| invite.name | YOUR NAME | Prefilled from the invite |
| invite.password | PASSWORD | Field label |
| invite.submit | JOIN {gymName} | Primary button |
| invite.bad | This invite has expired or was already used. Ask your owner for a new link. | Shown instead of the form (404 or used) |
| invite.email | EMAIL | Field label |
| invite.passwordHelp | 8 characters or more. | Meta under the field |
| invite.submitting | JOINING | Button while sending |
| invite.nameRequired | Enter your name. | Field error (same words as the server) |
| invite.toLogin | Already have an account? Log in. | Quiet link (text only; the link is "Log in.") |
| invite.bad.title | THIS LINK DOESN'T WORK | Section title over `invite.bad` |
| invite.bad.action | GO TO LOG IN | Primary button under `invite.bad` |

## 3. App shell
| id | Text | Where |
| --- | --- | --- |
| nav.owner.today | TODAY | Sidebar, owner |
| nav.owner.board | BOARD | Sidebar |
| nav.owner.members | MEMBERS | Sidebar |
| nav.owner.nudges | NUDGES | Sidebar |
| nav.owner.reports | REPORTS | Sidebar |
| nav.owner.templates | TEMPLATES | Sidebar |
| nav.owner.settings | SETTINGS | Sidebar |
| nav.owner.billing | BILLING | Sidebar |
| nav.coach.today | MY MEMBERS | Sidebar, coach (first item) |
| nav.coach.board | BOARD | Sidebar, coach |
| nav.coach.members | MEMBERS | Sidebar, coach |
| nav.coach.nudges | NUDGES | Sidebar, coach |
| nav.coach.templates | TEMPLATES | Sidebar, coach (read only) |
| nav.logout | LOG OUT | Sidebar foot, MORE sheet, Me |
| nav.menu | MENU | Phone header button that opens the menu |
| tab.owner.today | TODAY | Phone tab 1 |
| tab.owner.board | BOARD | Phone tab 2 |
| tab.owner.members | MEMBERS | Phone tab 3 |
| tab.owner.more | MORE | Phone tab 4 |
| tab.coach.today | TODAY | Phone tab 1 |
| tab.coach.board | BOARD | Phone tab 2 |
| tab.coach.nudges | NUDGES | Phone tab 3 |
| tab.coach.me | ME | Phone tab 4 |
| more.items | REPORTS · TEMPLATES · SETTINGS · BILLING · LOG OUT | The five rows, in this order |
| shell.pilot | Pilot day {n} of 90 | Sidebar foot meta line (sentence case), with the gym name above it |

## 4. Today (`/`)

### Owner
| id | Text | Where |
| --- | --- | --- |
| today.owner.title | TODAY | Page title |
| today.kpi.new | NEW MEMBERS | KPI label (members in their first 90 days) |
| today.kpi.onLine | ON THE LINE | KPI label; value `{n}%`, `—` if null |
| today.kpi.slipping | SLIPPING | KPI label |
| today.kpi.nudged | NUDGED THIS WEEK | KPI label |
| today.slipping.title | SLIPPING NOW | Section title (hazard band on top) |
| today.slipping.row | Last visit {n} days ago · Coach {coach} | Row meta, 2 or more days; 0, 1 and null use the three rows below |
| today.slipping.rowNever | No visits yet · Coach {coach} | Row meta, no visits |
| today.slipping.rowToday | Last visit today · Coach {coach} | Row meta, visited today |
| today.slipping.rowYesterday | Last visit yesterday · Coach {coach} | Row meta, visited yesterday |
| today.slipping.nudge | NUDGE → | Primary button per row |
| today.slipping.empty | Nobody is slipping. | Empty line (no hazard band) |
| today.checkins.title | CHECKED IN TODAY | Section title |
| today.checkins.row | {name} · {time} | Row, time like `6:42 PM` |
| today.checkins.empty | No check-ins yet today. They appear here as members arrive. | Empty line |
| today.board.title | THE BOARD | Section title, small board |
| today.board.open | OPEN THE BOARD | Button under the small board |

### Coach (same keys and labels as owner, scoped to their members)
| id | Text | Where |
| --- | --- | --- |
| today.coach.title | MY MEMBERS | Page title |

### Empty gym (after sign-up, no members)
| id | Text | Where |
| --- | --- | --- |
| today.empty.title | NO MEMBERS YET | Section title |
| today.empty.body | Import your member list, or have members check in at the front desk. The board fills from there. | Sentence |
| today.empty.import | IMPORT MEMBERS | Primary button to Settings, Import |
| today.empty.kiosk | OPEN THE KIOSK | Secondary button |
| today.empty.coach | No members are assigned to you yet. They appear here once your owner assigns them. | Coach with no members; no buttons |

## 5. Board (`/board`)
| id | Text | Where |
| --- | --- | --- |
| board.title | THE BOARD | Page title |
| board.search | Search members | Input placeholder |
| board.filter.status | STATUS | Filter label |
| board.filter.all | ALL | Status option |
| board.filter.coach | COACH | Filter label, owner only |
| board.filter.allCoaches | ALL COACHES | Coach option |
| board.legend.3 | 3+ visits | Legend, yellow cell |
| board.legend.12 | 1 or 2 visits | Legend, chalk cell |
| board.legend.0 | No visits | Legend, red-outline cell |
| board.legend.now | This week, in progress | Legend, steel outline |
| board.legend.future | Not reached yet | Legend, blank |
| board.legend.low | 1–2 | Compact legend, chalk cell |
| board.legend.none | NONE | Compact legend, red-outline cell |
| board.legend.week | THIS WEEK | Compact legend, steel outline |
| board.aria | The 90-day board | Board table `aria-label` |
| board.head.member | NEW MEMBER | Column header, member names |
| board.pace | {x}/WK | Pace cell on the board, e.g. `1.0/WK` |
| board.empty | NO MEMBERS TO SHOW | Empty title |
| board.emptyBody | No members match these filters. Clear the search or choose ALL. | Sentence |
| board.emptyClear | CLEAR FILTERS | Primary button |

## 6. Members (`/members`, `/members/:id`)

### List
| id | Text | Where |
| --- | --- | --- |
| members.title | MEMBERS | Page title |
| members.search | Search by name or phone | Placeholder |
| members.col.name | NAME | Column header |
| members.count | {n} members | Meta (`1 member` for 1) |
| members.count.one | 1 member | Meta, exactly 1 |
| members.col.week | WEEK | Cell: `Week 4 of 13` on the page, `4 / 13` in the table |
| members.weekCell | {n} / 13 | Week cell in the table, e.g. `4 / 13` |
| members.col.pace | PACE | Cell: `1.0 / WK`, `—` if null |
| members.col.last | LAST VISIT | Cell: `11 days ago`, `Today`, `Yesterday`, `No visits yet` |
| members.last.today | Today | Last visit cell, today |
| members.last.yesterday | Yesterday | Last visit cell, yesterday |
| members.last.days | {n} days ago | Last visit cell, 2 or more days |
| members.empty | NO MEMBERS FOUND | Empty title |
| members.emptyBody | Try another name or clear the filters. | Sentence |

### Member page
| id | Text | Where |
| --- | --- | --- |
| member.status | STATUS | Field label |
| member.coach | COACH | Field label |
| member.phone | PHONE | Field label |
| member.phone.none | No phone on file | Value |
| member.email | EMAIL | Field label |
| member.joined | Joined {Mon d} | Value, e.g. `Joined Oct 3` |
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
| member.pace | {x} / WK | Value, e.g. `1.0 / WK`; `—` if null |
| member.nudge | NUDGE → | Primary button; disabled never (no-phone case uses in-person variant) |
| member.edit | CHANGE | Owner, quiet button by coach and phone |
| member.weeks.title | THE 13 WEEKS | Section title |
| member.days.title | THE 90 DAYS | Section title |
| member.checkins.title | CHECK-INS | Section title |
| member.checkins.empty | No check-ins yet. Each visit is listed here. | Empty line |
| member.nudges.title | NUDGES | Section title |
| member.nudges.empty | No nudges yet. Recorded nudges are listed here. | Empty line |
| member.nudges.cameBack | CAME BACK | Tag when `cameBack` |
| member.notFound.title | MEMBER NOT FOUND | Page title on a 404 (another coach's member, or a bad id); the server's sentence sits under it |
| member.notFound.back | BACK TO MEMBERS | Primary button under it |

## 7. Nudge composer (dialog on desktop, sheet on phone)
| id | Text | Where |
| --- | --- | --- |
| nudge.title | NUDGE {FIRST} | Title, first name in capitals |
| nudge.template | TEMPLATE | Picker label |
| nudge.templateNone | Write my own | First picker option |
| nudge.text | MESSAGE | Textarea label (editable) |
| nudge.helpPhone | Records the nudge, then opens your text app with this message to {name}. | Meta, phone variant |
| nudge.helpDesktop | Tenure doesn't send texts. Copy the message and send it to {phone} from your phone. | Meta, computer variant |
| nudge.send | TEXT {FIRST} | Primary, phone variant, first name in capitals (records the nudge, then opens the text app) |
| nudge.copy | COPY MESSAGE | Primary, computer variant |
| nudge.markSent | RECORD NUDGE | Secondary, computer variant; records the nudge |
| nudge.copied | Message copied | Toast |
| nudge.noPhoneTitle | NO PHONE ON FILE | Section title, no-phone variant |
| nudge.noPhoneBody | Talk to {first} at the gym, then record the nudge here. | Sentence |
| nudge.noPhoneAction | RECORD NUDGE | Primary; records with no text link |
| nudge.recordedFor | Nudge to {first} recorded | Toast alternative with name (use this one) |

## 8. Nudges history (`/nudges`)
| id | Text | Where |
| --- | --- | --- |
| nudges.title | NUDGES | Page title |
| nudges.sub | Every nudge in the last 30 days. | Meta, owner |
| nudges.subCoach | Your nudges in the last 30 days. | Meta, coach |
| nudges.cameBack | CAME BACK | Tag: a check-in within 7 days after the nudge |
| nudges.waiting | No visit yet | Meta when under 7 days old and no visit yet |
| nudges.noVisit | No visit in 7 days | Meta when 7 days passed with no check-in |
| nudges.empty | NO NUDGES YET | Empty title |
| nudges.emptyBody | Nudge someone from SLIPPING NOW and it shows up here. | Sentence |

## 9. Reports (`/reports`, owner)
| id | Text | Where |
| --- | --- | --- |
| reports.title | REPORTS | Page title |
| reports.cohorts.title | COHORTS | Section title |
| reports.cohorts.explain | For each month's new members, the share who reached day 30, 60 or 90 and visited in the 7 days before it. | One sentence |
| reports.col.month | JOINED | Column header; value `Aug 2026` |
| reports.col.members | MEMBERS | Column header |
| reports.col.day30 | DAY 30 | Column header |
| reports.col.day60 | DAY 60 | Column header |
| reports.col.day90 | DAY 90 | Column header |
| reports.visits.title | VISITS BY WEEK | Section title |
| reports.visits.explain | Average visits a week since joining, for members still coming and members who slipped. | One sentence |
| reports.chart.still | STILL COMING | Series label, yellow |
| reports.chart.slipped | SLIPPED | Series label, steel |
| reports.chart.line | THE LINE · 3 A WEEK | Dashed chalk line label |
| reports.chart.stillDef | Still coming: visited in the last 14 days. | Meta under the chart |
| reports.chart.title | Visits a week since joining | Chart title (read by screen readers) |
| reports.chart.axis | Week since joining | X-axis label |
| reports.chart.point | Week {n}: still coming {still}, slipped {slipped} | Data point label |
| reports.chart.none | none | Data point value when a series has no members that week |
| reports.nudges.title | NUDGE RESULTS | Section title |
| reports.nudges.explain | The share of nudges sent in the last 90 days that were followed by a check-in within 7 days. | One sentence |
| reports.nudges.sent | NUDGES SENT | KPI label |
| reports.nudges.cameBack | CAME BACK | KPI label |
| reports.nudges.rate | RATE | KPI label, `{n}%`, `—` if none sent |

## 10. Templates (`/templates`)
| id | Text | Where |
| --- | --- | --- |
| templates.title | TEMPLATES | Page title |
| templates.new | NEW TEMPLATE | Primary button, owner only |
| templates.readOnly | Your owner edits templates. You can use them when you nudge. | Coach meta |
| templates.preview | PREVIEW | Section label |
| templates.field.name | NAME | Editor field label |
| templates.field.body | MESSAGE | Editor field label |
| templates.sample | Sample member: {name} | Meta above the preview |
| templates.vars.title | VARIABLES | Help label |
| templates.var.first | {first} | the member's first name |
| templates.var.first.def | The member's first name | Meaning, next to `{first}` |
| templates.var.coach | {coach} | the first name of whoever sends the text |
| templates.var.coach.def | The first name of whoever sends the text | Meaning, next to `{coach}` |
| templates.var.gym | {gym} | your gym's name |
| templates.var.gym.def | Your gym's name | Meaning, next to `{gym}` |
| templates.var.days | {days} | days since the member's last visit |
| templates.var.days.def | Days since the member's last visit | Meaning, next to `{days}` |
| templates.save | SAVE TEMPLATE | Primary in the editor |
| templates.saved | Template saved | Toast |
| templates.delete | DELETE | Quiet button in the editor |
| templates.deleted | Template deleted | Toast |
| templates.deleteTitle | DELETE THIS TEMPLATE | Dialog title |
| templates.deleteBody | "{name}" will be deleted for everyone. Nudges already sent keep their text. | Dialog sentence |
| templates.deleteConfirm | DELETE TEMPLATE | Dialog primary |
| templates.empty | NO TEMPLATES | Empty title |
| templates.emptyBody | Add one, and every nudge can start from it. | Sentence |

## 11. Settings (`/settings`, owner)

### Gym and staff
| id | Text | Where |
| --- | --- | --- |
| settings.title | SETTINGS | Page title |
| settings.gym.title | GYM | Section title |
| settings.gym.name | GYM NAME | Field label |
| settings.gym.tz | TIMEZONE | Field label |
| settings.saved | Settings saved | Toast |
| settings.staff.title | STAFF | Section title |
| settings.staff.inactive | Inactive | Meta tag |
| settings.staff.memberOne | 1 member | Staff row meta, exactly 1 |
| settings.staff.members | {n} members | Staff row meta |
| settings.staff.slipping | {n} slipping | Staff row meta |
| settings.invite | INVITE A COACH | Primary button |
| settings.invite.name | COACH NAME | Dialog field label |
| settings.invite.create | CREATE LINK | Dialog primary |
| settings.invite.hint | Send this link to your coach. It works once and expires on {date}. | Dialog sentence |
| settings.invite.copy | COPY LINK | Button |
| settings.invite.copied | Invite link copied | Toast |
| settings.deactivate | DEACTIVATE | Row button |
| settings.deactivateTitle | DEACTIVATE {NAME} | Dialog title |
| settings.deactivateBody | {name} won't be able to log in. Their members stay on the board. | Dialog sentence |
| settings.deactivateConfirm | DEACTIVATE | Dialog primary |

### Open on a phone
| id | Text | Where |
| --- | --- | --- |
| phone.title | OPEN ON A PHONE | Section title |
| phone.step1 | 1. Turn on the Wi-Fi hotspot on this computer. | Step |
| phone.step2 | 2. Connect your phone to that Wi-Fi. | Step |
| phone.step3 | 3. Scan this code, or type the address. | Step |
| phone.qr | QR code for {url} | Image alt text |
| phone.none | No network address found. Connect this computer to Wi-Fi, then reload the page. | When `phoneUrls` is empty |

### Kiosk
| id | Text | Where |
| --- | --- | --- |
| kiosk.set.title | KIOSK | Section title |
| kiosk.set.body | Open it on the front-desk screen. Members check in with their phone number, without logging in. | Sentence |
| kiosk.set.open | OPEN THE KIOSK | Primary button |
| kiosk.set.copy | COPY LINK | Button |
| kiosk.set.copied | Kiosk link copied | Toast |

### Import
| id | Text | Where |
| --- | --- | --- |
| import.title | IMPORT | Section title |
| import.step1 | 1. Choose a CSV file. | Step |
| import.step2 | 2. Match the columns. | Step |
| import.step3 | 3. Check the preview, then import. | Step |
| import.kind | WHAT TO IMPORT | Field label |
| import.kind.members | MEMBERS | Option |
| import.kind.checkins | CHECK-INS | Option |
| import.choose | CHOOSE CSV FILE | Button |
| import.paste | OR PASTE THE CSV | Textarea label |
| import.map.title | COLUMNS | Mapping section label |
| import.map.pick | Choose a column | Select placeholder |
| import.map.required | Required | Meta tag |
| import.field.external_id | MEMBER ID | Members and check-ins |
| import.field.first_name | FIRST NAME | Required |
| import.field.last_name | LAST NAME | Members |
| import.field.phone | PHONE | Members; check-ins (when no member ID) |
| import.field.email | EMAIL | Members |
| import.field.joined_on | JOINED ON | Required, members |
| import.field.coach_email | COACH EMAIL | Members |
| import.field.checked_in_at | CHECKED IN AT | Required, check-ins |
| import.sample | FIRST 10 ROWS | Preview table label |
| import.preview | PREVIEW | Section label |
| import.rowOne | 1 row | Meta, exactly 1 |
| import.rows | {n} rows | Meta |
| import.summary | {created} new, {updated} updated, {skipped} skipped | Result line, e.g. `12 new, 0 updated, 2 skipped` |
| import.problem | Row {n}: {problem} | Per-row line, e.g. `Row 7: no joined date.` |
| import.problems | PROBLEMS | Section label above the per-row lines |
| import.commit | IMPORT MEMBERS | Primary for members; IMPORT CHECK-INS for check-ins |
| import.commitCheckins | IMPORT CHECK-INS | Primary for check-ins |
| import.done | IMPORT FINISHED | Toast |

## 12. Billing (`/billing`, owner)
| id | Text | Where |
| --- | --- | --- |
| billing.title | BILLING | Page title |
| billing.pilot | PILOT DAY {n} OF 90 | Section title, 3-segment tape |
| billing.offer | FREE 90-DAY PILOT. THEN $99 A MONTH. | Headline |
| billing.flat | One flat price per gym. Unlimited members. | Sentence |
| billing.payback | Keep 2 members a month and it pays for itself. | Sentence |
| billing.plan | CONTINUE AT $99 A MONTH | Button |
| billing.notLive | Payments aren't live in this demo. | Shown on plan click and under the button |

## 13. Me (`/me`, phone)
| id | Text | Where |
| --- | --- | --- |
| me.title | ME | Page title |
| me.name | NAME | Field label |
| me.email | EMAIL | Field label |
| me.gym | GYM | Field label |
| me.role | ROLE | Field label |
| me.logout | LOG OUT | Primary button |

## 14. Kiosk (`/kiosk/:token`)
Full screen, no nav. The gym name sits top left, no SAMPLE DATA tag unless the gym is the demo.

| id | Text | Where |
| --- | --- | --- |
| kiosk.idle.title | CHECK IN | Idle title |
| kiosk.idle.prompt | Enter your phone number. | Under the title |
| kiosk.keypad.back | ⌫ | Key (aria-label from `kiosk.keypad.backLabel`) |
| kiosk.search.toggle | USE MY NAME | Quiet button |
| kiosk.search.label | FIRST NAME | Input label |
| kiosk.search.none | No member by that name. Try your phone number. | Empty results |
| kiosk.join | NEW HERE? JOIN | Secondary button |
| kiosk.join.submit | JOIN AND CHECK IN | Primary |
| kiosk.welcome.first | WELCOME, {FIRST}. DAY 1 OF 90. | First visit (day 0) |
| kiosk.welcome.back | WELCOME BACK, {FIRST}. WEEK {n}. | Returning member |
| kiosk.welcome.line | ON THE LINE THIS WEEK. | Sub line when `visitsThisWeek` is 3 or more |
| kiosk.welcome.visits | {n} visits this week. | Sub line when under 3 (`1 visit`) |
| kiosk.notFound | We couldn't find that number. Try your name, or tap NEW HERE? JOIN. | Not found (404 text plus action) |
| kiosk.reset | Ready for the next member in {n}. | Hint while the confirmation shows, counting 5 to 1 |
| kiosk.phone.hint | Not a US number? Start with + and the country code. | Under the number display |
| kiosk.display.label | Phone number | Number display `aria-label` |
| kiosk.keypad.label | Phone keypad | Keypad `aria-label` |
| kiosk.keypad.backLabel | Delete last digit | ⌫ key `aria-label` |
| kiosk.keypad.plusLabel | Plus sign, for the country code | + key `aria-label` |
| kiosk.keypad.submit | CHECK IN | Keypad primary |
| kiosk.search.phone | USE MY PHONE NUMBER | Quiet button, back to the keypad |
| kiosk.search.results | Matching members | Results list `aria-label` |
| kiosk.notFound.action | Try your name, or tap NEW HERE? JOIN. | Added after a server sentence that is not the 404 one (`kiosk.notFound` keeps the 404 sentence first) |
| kiosk.welcome.visit | 1 visit this week. | Sub line, exactly 1 (`kiosk.welcome.visits` for 0 or 2) |
| kiosk.join.title | JOIN | Join form title |
| kiosk.join.prompt | Your first name is enough. Add a phone number to check in with it next time. | Under the join title |
| kiosk.join.first | FIRST NAME | Field label |
| kiosk.join.last | LAST NAME | Field label |
| kiosk.join.phone | PHONE | Field label |
| kiosk.join.optional | OPTIONAL | Meta tag on last name and phone |
| kiosk.join.firstRequired | Enter your first name. | Field error (same words as the server) |
| kiosk.join.cancel | CANCEL | Secondary in the join form |
| kiosk.retry | TRY AGAIN | Button after an error |
| kiosk.loading | Loading | While the kiosk loads |

## 15. Toasts (4 s)
| id | Text | When |
| --- | --- | --- |
| toast.checkin | {NAME} CHECKED IN | Live event, e.g. `SAM O. CHECKED IN` |
| toast.nudge | Nudge to {first} recorded | After TEXT {FIRST} or RECORD NUDGE; on a phone it shows before the text app opens |
| toast.inviteCopied | Invite link copied | Settings |
| toast.import | IMPORT FINISHED | Import commit; the summary line sits in the panel |

## 16. Errors

### From the API (SPEC §6; the server sends the sentence, the client shows it as given)
| Case | Text |
| --- | --- |
| 401 login | That email and password don't match. |
| 429 login | Too many attempts. Try again in 10 minutes. |
| 404 kiosk check-in | We couldn't find that number. |
| 404 member (coach asking for another coach's member, or bad id) | We couldn't find that member. |
| 404 invite / token | This link no longer works. Ask for a new one. |
| 403 role | Only the owner can do that. Ask your owner. |
| 409 duplicate | That email or phone number is already in use. Check it and try again. |
| 400 generic | Part of that form isn't valid. Check it and try again. |

### Client validation (one red line under the field)
| id | Text |
| --- | --- |
| err.required | Required. |
| err.email | Enter an email like name@gym.com. |
| err.password | Use 8 characters or more. |
| err.match | The passwords don't match. |
| err.phone | Enter a 10-digit US number, or + and the country code. |
| err.csv | That file isn't a CSV. Choose a .csv file. |
| err.mapping | Choose a column for each required field. |
| err.network | Can't reach Tenure. Check your connection and try again. |
| err.session | Your session ended. Log in again. |
| err.server | Something went wrong on our side. Try again in a minute. |

### Also from the API (the server sends the sentence, the client shows it as given)
| Case | Text |
| --- | --- |
| 429 kiosk (30 tries a minute per device) | Too many tries. Try again in a minute. |
| 400 kiosk join, no first name | Enter your first name. |
| 400 import, CSV over 2 MB (413 when the whole request is over 4 MB) | That file is over 2 MB. Choose a CSV of 2 MB or less. |
| 401 not logged in (any route but login) | Log in to continue. |
| 400 request not sent as JSON | Send the request as JSON. |
| 403 request from another site | This request didn't come from Tenure. |
| 404 unknown API path | That isn't part of the Tenure API. |
| 404 anything else | We couldn't find that. |
| 400 password over 200 characters | That password is too long. Use 200 characters or fewer. |
| 400 no gym name | Enter your gym's name. |
| 400 no name (sign-up, invite) | Enter your name. |
| 400 no coach name (invite) | Enter the coach's name. |
| 400 timezone | Choose a timezone from the list. |
| 400 QR code for an address that isn't this computer's | That link can't be made into a QR code. |
| 400 status filter | Choose a status from the list. |
| 400 coach not on staff | Choose a coach from your staff. |
| 404 coach | We couldn't find that coach. |
| 400 coach active flag missing | Choose whether the coach is active. |
| 400 deactivating the owner | The owner's account can't be deactivated. |
| 404 template | We couldn't find that template. |
| 400 template with no name | Enter a name for the template. |
| 400 nudge with no template or message | Choose a template or write a message. |
| 400 message missing or over 1,000 characters | Enter a message of 1,000 characters or fewer. |
| 413 request body over 64 KB (any route but import) | That request is over 64 KB. Send 64 KB or less. |
| 429 sign-up (5 per 10 minutes per device) | Too many sign-ups from this device. Try again in 10 minutes. |

## 17. Accessibility labels
| id | Text | Where |
| --- | --- | --- |
| a11y.logo | Tenure | Wordmark `aria-label` / alt (link to Today) |
| a11y.cell.visits | Week {n}: {v} visits | Board cell; `Week 3: 2 visits`, `Week 3: 1 visit` |
| a11y.cell.one | Week {n}: 1 visit | Board cell with 1 |
| a11y.cell.none | Week {n}: no visits | Board cell with 0 |
| a11y.cell.now | Week {n}: in progress, {v} visits so far | Current week; `Week 5: in progress, 1 visit so far` |
| a11y.cell.nowOne | Week {n}: in progress, 1 visit so far | Current week with 1 |
| a11y.cell.future | Week {n}: not reached yet | Weeks after the current one |
| a11y.tabs | Main | Sidebar navigation `aria-label` |
| a11y.tabbar | Tabs | Phone tab bar `aria-label` |
| a11y.more | More | Phone MORE tab `aria-label` |
| a11y.nudge | Nudge | Icon-only nudge button |
| a11y.nudgeMember | Nudge {name} | Nudge button on a member row or card |
| a11y.slipping | `, slipping` | Appended to a member name on the board when slipping |
| a11y.days.one | {n} visit in the first {d} days | THE 90 DAYS grid, exactly 1 visit |
| a11y.days.many | {n} visits in the first {d} days | THE 90 DAYS grid |
| a11y.chart | Line chart: average visits a week since joining, for members still coming and members who slipped | Reports chart |
