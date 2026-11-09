# Changelog

## v2.0 (the redesign's words, 8 Nov)
- **Capitals in Apple's split** (Uzair's pick, words-1, with his 8 Nov answer that page and section titles take it too): Title Case on what you press (buttons, links styled as buttons, tabs, menu and picker items, segments) and on short titles (page, section, sheet, dialog and empty-state titles); sentence case on everything you read, and on any title or button that is a full sentence or a question. The header gives the rule and the small words; each row's Where starts with its kind, and the copy test checks the casing by kind. Progress labels end in an ellipsis ("Saving…", and `common.loading` and `kiosk.loading` "Loading…").
- **The word pass:** no "we" or "our" (the not-found and import lines, `err.server`, `settings.invite.hint`, `reset.lede`); the empty states say what fills them ("Members appear here…"); the kiosk's visits line counts toward 3 ("{n} of 3 visits this week."); `nudge.helpDesktop` says where messages go from, with no singular Regulars.
- **The confirms name the member, with one-word buttons** (Uzair, 8 Nov): "Archive {name}?" with "Archive", "Delete {name}?" with "Delete" (`member.archive.ask`, `member.archive.says`, `member.delete.ask`; `member.archiveConfirm` and `member.deleteConfirm` become "Archive" and "Delete").
- **The kiosk's join button says "Join the Gym"** (`kiosk.join`, Uzair, 8 Nov). The kiosk switches between a segmented "Phone Number" / "Name" choice, so "Use My Name" and "Use My Phone Number" go once the kiosk job switches; their ids stay until then.
- **New ids for the empty states and the done Nudge:** `today.slipping.emptyTitle` "Nobody's Slipping", `today.checkins.emptyTitle`, `today.empty.coachTitle`, `board.empty.search` and its line, `nudges.emptyAction`, `today.slipping.all`, `nudge.done` "Nudged" with `a11y.nudgedMember`, `nudge.howTo`, `kiosk.search.noneFor`. Where a line gained or lost a placeholder it took a new id, and the old id stays until its screen switches.
- **The status table's last column is the mark**, not a colour: a red falling triangle for Slipping, a gray empty ring for New, a filled dot for On the line, a half ring for Below the line.
- **The screens' new lines** (the screen scouts' tables): the owner's Reports and Settings tabs; Today's live headline in four forms and the figures' hints; the board's count line and "No New Members"; the member page's back link (`member.back.*`, `a11y.backTo`); "No Archived Members"; Reports' takeaway headlines ("{n} of {total} nudges led to a visit", Uzair's pattern) with the nudges bar's legend and name; the home page's sourced figures, closing section, sources and footer; Settings' Account group and the QR codes' Show Link and Hide Link; the kiosk's segmented "Phone Number" / "Name" choice (`kiosk.mode.*`). Coaches get no Me tab (`tab.coach.me` stays retired).
- **The home headline is the tagline**, "Turn new members into regulars." (`home.title`), and `home.title.mark` follows it ("regulars.") until the underline goes after the stall.
- **The tagline is under the logo on Log In and Sign Up** (`brand.tagline`, new), so Log In shows no second line under its title and `login.tagline` goes (audit B2-10). At the stall, `demo.try` also shows on Log In in place of `login.toSignup.link`.
- **Retire after the screen jobs merge**, in one cleanup commit (each is still read until then): `tab.owner.more`, `tab.coach.more`, `tab.owner.nudges`, `tab.coach.nudges`, `a11y.more`, `nudge.contact`, `theme.*`, `kiosk.keypad.back`, `nudge.helpPhone`, `member.archiveTitle`, `member.archiveBody`, `member.deleteTitle`, `kiosk.search.none`, `kiosk.search.toggle`, `kiosk.search.phone`, `brand.descriptor`, and `common.open` and `a11y.openMember` if no screen reads them. After the stall: `reports.nudges.sent`, `reports.nudges.rate`, `reports.nudges.title` and `home.title.mark`.

- **The casing check** (NFR-COPY-01, in the copy test): each row's kind comes from its Where, and a missed capital fails `npm test`. It found one more, `theme.choice.system` "Same as Device". `home.source.1`, a citation, is its one exception.

129 strings changed, 61 added, 1 removed (`login.tagline`).

| id | Before | After |
| --- | --- | --- |
| theme.choice.system | Same as device | Same as Device |
| home.title | Here is who stays. | Turn new members into regulars. |
| home.title.mark | who stays. | regulars. |
| api.coachNotFound | We couldn't find that coach. | This coach was removed, or isn't on your staff. |
| api.kioskNotFound | We couldn't find that number. | That number isn't on file. |
| api.memberNotFound | We couldn't find that member. | This member was deleted, or isn't assigned to you. |
| api.notFound | We couldn't find that. | Not found. |
| api.templateNotFound | We couldn't find that template. | This template was deleted. |
| billing.pilot | Pilot day {n} of 90 | Pilot Day {n} of 90 |
| board.empty | No members to show | No Matching Members |
| board.emptyBody | No members match these filters. Clear the search, or show all members. | Try another status or coach. |
| board.emptyClear | Clear filters | Clear Filters |
| board.filter.allCoaches | All coaches | All Coaches |
| board.title | The board | Board |
| common.loading | Loading | Loading… |
| common.retry | Try again | Try Again |
| demo.reset | Reset the demo | Reset the Demo |
| demo.reset.body | Members, visits, nudges, templates, settings and staff go back to the sample gym. The kiosk link stays the same, and every device signed in to the demo is signed out. | Everything goes back to the sample gym, and every device using the demo is logged out. The kiosk link stays the same. |
| demo.try | Try the demo | Try the Demo |
| err.server | Something went wrong on our side. Try again in a minute. | Something went wrong. Try again in a minute. |
| home.board.title | The board | The Board |
| home.login | Log in | Log In |
| home.start | Set up your gym | Set Up Your Gym |
| import.choose | Choose CSV file | Choose CSV File |
| import.commit | Import members | Import Members |
| import.commitCheckins | Import check-ins | Import Check-Ins |
| import.dates.toDayFirst | Read them day first | Read Them Day First |
| import.dates.toMonthFirst | Read them month first | Read Them Month First |
| import.kind.checkins | Check-ins | Check-Ins |
| import.problem.findCheckinTime | We couldn't find a check-in date and time column. Choose which column holds it. | No check-in date and time column found. Choose the one that holds it. |
| import.problem.findJoinDate | We couldn't find a join date column. Choose which column holds it. | No join date column found. Choose the one that holds it. |
| import.problem.findMatch | We couldn't find a member ID or phone column to match check-ins to members. Choose one. | No member ID or phone column found to match check-ins to members. Choose one. |
| import.problem.findName | We couldn't find a name column. Choose the column with the first name or the full name. | No name column found. Choose the one with first or full names. |
| invite.bad.action | Go to log in | Go to Log In |
| invite.bad.title | This link doesn't work | This Link Doesn't Work |
| invite.submitting | Joining | Joining… |
| invite.toLogin.link | Log in | Log In |
| kiosk.idle.title | Check in | Check In |
| kiosk.join | New here? Join | Join the Gym |
| kiosk.join.submit | Join and check in | Join and Check In |
| kiosk.keypad.submit | Check in | Check In |
| kiosk.loading | Loading | Loading… |
| kiosk.notFound | We couldn't find that number. Try your name, or join as a new member. | That number isn't on file. Try your name, or join as a new member. |
| kiosk.retry | Try again | Try Again |
| kiosk.search.phone | Use my phone number | Use My Phone Number |
| kiosk.search.toggle | Use my name | Use My Name |
| kiosk.set.copy | Copy link | Copy Link |
| kiosk.set.open | Open the kiosk | Open the Kiosk |
| kiosk.welcome.visit | 1 visit this week. | 1 of 3 visits this week. |
| kiosk.welcome.visits | {n} visits this week. | {n} of 3 visits this week. |
| login.submit | Log in | Log In |
| login.submitting | Logging in | Logging In… |
| login.title | Log in | Log In |
| login.toSignup.link | Create your account | Create Your Account |
| me.logout | Log out | Log Out |
| member.archiveConfirm | Archive member | Archive |
| member.checkins.empty | No check-ins yet. Each visit is listed here. | No visits yet. Each check-in at the front desk appears here. |
| member.checkins.title | Check-ins | Visits |
| member.coach.none | No coach | No Coach |
| member.days.title | The 90 days | The 90 Days |
| member.delete | Delete permanently | Delete Permanently |
| member.deleteConfirm | Delete member | Delete |
| member.notFound.back | Back to members | Back to Members |
| member.notFound.title | Member not found | Member Not Found |
| member.restore | Restore member | Restore Member |
| member.weeks.title | The 13 weeks | The 13 Weeks |
| members.add | Add member | Add Member |
| members.add.submit | Add member | Add Member |
| members.add.title | Add a member | Add a Member |
| members.empty | No members found | No Members Yet |
| members.emptyNone | Members are listed here once they join at the front desk or are imported. | Members appear here once they join at the front desk or you import them. |
| members.view.first90 | First 90 days | First 90 Days |
| nav.logout | Log out | Log Out |
| notFound.link | Go to the home page | Go to the Home Page |
| notFound.title | Page not found | Page Not Found |
| nudge.contact.text | Text message | Text Message |
| nudge.copy | Copy message | Copy Message |
| nudge.helpDesktop | Messages aren't sent from Regulars. Pick WhatsApp, or copy the message and send it to {phone} from your phone. | Messages go from your own phone. Choose WhatsApp, or copy the message and send it to {phone}. |
| nudge.noPhoneAction | Record nudge | Record Nudge |
| nudge.noPhoneTitle | No phone on file | No Phone on File |
| nudge.templateNone | Write my own | Write My Own |
| nudges.empty | No nudges yet | No Nudges Yet |
| nudges.emptyBody | Nudge someone from Slipping now and it shows up here. | Nudge a slipping member from Today. Each nudge shows here, with whether they came back within 7 days. |
| phone.copy | Copy link | Copy Link |
| phone.title | Open on a phone | Open on a Phone |
| reports.cohorts.explain | For each month's new members, the share who reached day 30, 60 or 90 and visited in the 7 days before it. | Of each month's new members who reached day 30, 60 or 90, the share who visited in the week before it. |
| reports.nudges.title | Nudge results | Nudge Results |
| reports.visits.title | Visits by week | Visits by Week |
| reset.bad.action | Go to log in | Go to Log In |
| reset.bad.title | This link doesn't work | This Link Doesn't Work |
| reset.lede | Enter the email you log in with, and we'll send you a link to choose a new password. | Enter the email you log in with, and a link to choose a new password goes there. |
| reset.new.submit | Save password | Save Password |
| reset.new.submitting | Saving | Saving… |
| reset.new.title | Choose a new password | Choose a New Password |
| reset.submit | Send reset link | Send Reset Link |
| reset.submitting | Sending | Sending… |
| reset.title | Reset your password | Reset Your Password |
| reset.toLogin.link | Log in | Log In |
| routeError.retry | Try again | Try Again |
| routeError.title | This page didn't open | Can't Open This Page |
| settings.import.link | Import members or check-ins | Import Members or Check-Ins |
| settings.invite | Invite staff | Invite Staff |
| settings.invite.copy | Copy link | Copy Link |
| settings.invite.create | Create link | Create Link |
| settings.invite.hint | We emailed this link to {email}. It works once and expires on {date}. | This link was emailed to {email}. It works once, until {date}. |
| signup.countryPick | Choose a country | Choose a Country |
| signup.submit | Start the pilot | Start the Pilot |
| signup.submitting | Creating your gym | Creating Your Gym… |
| signup.title | Set up your gym | Set Up Your Gym |
| signup.toLogin.link | Log in | Log In |
| templates.deleteConfirm | Delete template | Delete Template |
| templates.deleteTitle | Delete this template | Delete This Template |
| templates.empty | No templates | No Templates |
| templates.emptyBody | Add one, and every nudge can start from it. | Write a message once, then start any nudge from it. |
| templates.new | New template | New Template |
| templates.readOnly | Your owner edits templates. You can use them when you nudge. | Only owners can edit templates. You can use any of them in a nudge. |
| templates.save | Save template | Save Template |
| today.board.open | Open the board | Open the Board |
| today.board.title | The board | The Board |
| today.checkins.empty | No check-ins yet today. They appear here as members arrive. | Members appear here as they check in at the front desk. |
| today.checkins.title | Checked in today | Checked In Today |
| today.empty.coach | No members are assigned to you yet. They appear here once your owner assigns them. | Members appear here once an owner assigns them to you. |
| today.empty.import | Import members | Import Members |
| today.empty.kiosk | Open the kiosk | Open the Kiosk |
| today.empty.kioskBody | Have members check in at the front desk. The board fills from there. | Members appear here the first time they check in at the front desk. Each one gets a 90-day board. |
| today.empty.title | No members yet | No Members Yet |
| today.retry | Try again | Try Again |
| today.slipping.empty | Nobody is slipping. | No new member has had 2 weeks in a row with under 2 visits. |
| today.slipping.title | Slipping now | Slipping Now |

## v1.9 (the name, 7 Nov)
- **The name is Regulars** (Uzair's pick in the redesign), a display-only rename: `brand.name` and `a11y.logo` say "Regulars", and so does every line that named the product: `home.lede`, `nudge.helpDesktop`, `err.network`, `api.crossSite` and `api.notApi`. Regulars is a plural noun naming one product, so no line makes it the subject of a singular verb: `home.lede` becomes "With Regulars, a coach sees who's slipping…", and `nudge.helpDesktop` "Messages aren't sent from Regulars." Internal identifiers stay `tenure`.
- **The Nudge button** says "Nudge", with no arrow (`today.slipping.nudge`, `member.nudge`), as the printed pieces show it.

## v1.8 (the stall version)
- After the stall critique (Uzair, 7 Nov): `tag.sample` also shows in the app header for the demo gym; in stall mode the home page shows neither `home.login` nor `home.start`.
- Uzair's review-stop picks: the home page's headline and button, Settings' phone steps

- **Stall mode:** "Reset the demo" (Uzair's pick) beside "Try the demo", with its confirm's question and line and the toast once it's done (`demo.reset`, `demo.reset.title`, `demo.reset.body`, `demo.reset.done`).
- **Home:** working lines for the headline, the line under it, the offer and the two buttons (`home.*`), placeholders until Uzair's pick in the home page copy round.
- **Home, pick L2:** the headline's underlined words (`home.title.mark`), and the board picture's title, accessible name and six sample names (`home.board.*`).
- **The kiosk:** `kiosk.join.promptName`, "Your first name is enough.", under the join title on the demo gym, which asks for no phone.
- **Members:** "Past 90 days" (`members.past90`, Uzair's pick), in place of a status from day 90 on Members and the member page; "Joined" (`member.joinedOn`), the member page's label over the joined date.
- **Today:** `today.empty.kioskBody`, an owner's empty gym without the import: "Have members check in at the front desk. The board fills from there."
- **Reports:** "Still waiting", the nudges inside their 7 days, beside the nudge rate that leaves them out.
- **The shell:** a coach's first sidebar item says "Today", as the tabs do (`nav.coach.today`, pick D2; it was "My members"); "Check the address, or start again from Today." and "Go to Today" (`shell.notFound.body`, `shell.notFound.link`) on the not-found page inside the app; the theme button and Log out live in the More sheet below 1024 px (the notes of `nav.logout`, `theme.toDark`, `theme.toLight` and `shell.pilot`).
- **Today and the board (the 7 Nov picks):** a coach's Today is titled "Today", as the owner's (`today.coach.title`, pick D2); Checked in today's row splits into its time and its name (`today.checkins.time`, `today.checkins.name`, pick K2), and `today.checkins.row` retires.
- **Members:** a filtered list with no match shows the board's empty words (`board.empty`, `board.emptyBody`), so `members.emptyBody` retires (F36).

## v1.7, 7 Nov 2026: the first version

Every word the first version needs, from Uzair's answers (`docs/milestone-2/answers.md`), the first version's decisions (`docs/milestone-2/FIRST-VERSION.md`), the scout briefs' new copy and the critic's resolutions. The website's home words wait for their own copy round.

- **Members:** "Add member" and the "Add a member" dialog; the three views "First 90 days", "Everyone" and "Archived"; the member page's name edit, its Change labels and "No coach"; "Archive", "Archive this member?" and "Archive member"; "Restore member"; "Delete permanently", "Delete this member for good?" and "Delete member". `member.joined` takes `{date}`, since `t()` can't fill `{Mon d}`. A member with a single name renders as that name alone.
- **Lists:** one quiet "Open" button ends each member row, with the member's name in its accessible name. One `common.retry` for every screen whose data doesn't load (`today.retry` stays, with the same words).
- **Nudges:** "Contact {first}" opens Text message, WhatsApp and Copy message, and the two help lines are rewritten for it. Every nudge shows its channel: "Text", "WhatsApp", "Copied" or "In person". `nudge.send`, `nudge.markSent` and `nudge.recordedFor` retire: the Contact menu replaces the first two, and the third duplicated `toast.nudge`. `{coach}` is whoever sends the message, not only a text.
- **The kiosk:** "Welcome back, {first}." from day 90. The not-found lines describe the action instead of quoting the "New here? Join" button. The phone hint and `err.phone` work for any country. An archived member's phone, or a join that matches one, gets "Please see the front desk to check in." The Sample data tag is the kiosk's only.
- **Staff and Settings:** "Invite staff", with a Coach or Owner choice (the `role.*` words) and an email; the invite page's owner wording; "Reactivate"; the Country field; a copy button for the phone link; the import box and its link "Import members or check-ins". With several owners, `api.role`, `api.ownerActive` and `api.coachName` no longer assume one owner or a coach.
- **The import:** its own page, with a Full name column; the date-order line, the rows as read, and the switch "Read them day first" or "Read them month first"; every problem line, ported word for word from the old import's `csv.mjs`, `mapping.mjs` and `plan.mjs`. The bad-phone line works for any country, the name lines allow a Full name column, and two lines are new: a phone that is another member's, and a row that restores an archived member.
- **Accounts:** sign-up's line "Start a free 90-day pilot for your gym." and its Country select, with the five open markets named; password reset ("Reset your password", "Send reset link", "Choose a new password", "Save password") and "Forgot your password?" on Login; "Try the demo" in stall mode.
- **Billing:** no price and no plan button, so `billing.plan`, `billing.notLive` and `billing.payback` retire, and the offer and its line drop the price.
- **The shell:** the phone tab bar's five tabs for both roles (Today, Board, Members, Nudges and More) and `nav.me`; `tab.coach.me` and the never-rendered `more.items` retire.
- **Errors:** an `api.*` sentence for each of the first version's 8 new error codes.

17 strings changed, 135 added, 8 removed. The notes changed on 32 more, with no change to their words: `a11y.tabs`, `billing.pilot`, `import.field.first_name`, `import.kind`, `import.problem`, `import.title`, `invite.bad.action`, `invite.lede`, `kiosk.set.open`, `kiosk.welcome.back`, `member.edit`, `nav.logout`, `nudge.copied`, `nudge.copy`, `nudge.noPhoneAction`, `reports.chart.line`, `reports.chart.slipped`, `reports.chart.still`, `role.coach`, `role.owner`, `shell.pilot`, `tab.coach.nudges`, `tab.owner.more`, `tag.sample`, `templates.var.coach`, `toast.nudge`, `today.board.open`, `today.checkins.row`, `today.empty.body`, `today.empty.coach`, `today.empty.import` and `today.retry`.

| id | Before | After |
| --- | --- | --- |
| api.coachName | Enter the coach's name. | Enter the name of the person you're inviting. |
| api.ownerActive | The owner's account can't be deactivated. | The last active owner can't be deactivated. |
| api.role | Only the owner can do that. Ask your owner. | Only an owner can do that. Ask an owner. |
| billing.flat | One flat price per gym. Unlimited members. | Unlimited members during the pilot. |
| billing.offer | Free 90-day pilot. Then $99 a month. | Free 90-day pilot. |
| err.phone | Enter a 10-digit US number, or + and the country code. | Enter a number from your gym's country, or + and the country code. |
| kiosk.notFound | We couldn't find that number. Try your name, or tap New here? Join. | We couldn't find that number. Try your name, or join as a new member. |
| kiosk.notFound.action | Try your name, or tap New here? Join. | Try your name, or join as a new member. |
| kiosk.phone.hint | Not a US number? Start with + and the country code. | Number from another country? Start with + and the country code. |
| member.joined | Joined {Mon d} | Joined {date} |
| nudge.helpDesktop | Tenure doesn't send texts. Copy the message and send it to {phone} from your phone. | Tenure doesn't send messages. Pick WhatsApp, or copy the message and send it to {phone} from your phone. |
| nudge.helpPhone | Records the nudge, then opens your text app with this message to {name}. | Records the nudge, then opens the app you pick with this message to {name}. |
| settings.invite | Invite a coach | Invite staff |
| settings.invite.hint | Send this link to your coach. It works once and expires on {date}. | We emailed this link to {email}. It works once and expires on {date}. |
| settings.invite.name | Coach name | Name |
| signup.lede | Free 90-day pilot. Then $99 a month. | Start a free 90-day pilot for your gym. |
| templates.var.coach.def | The first name of whoever sends the text | The first name of whoever sends the message |

| id | Added |
| --- | --- |
| a11y.openMember | Open {name} |
| api.country | Choose a country from the list. |
| api.inviteRole | Choose whether to invite a coach or an owner. |
| api.joinedOn | Choose a join date of today or earlier. |
| api.memberArchived | Please see the front desk to check in. |
| api.memberFirstName | Enter the member's first name. |
| api.memberNotArchived | Archive this member before deleting them. |
| api.resetInvalid | This reset link has expired or was already used. Get a new one from the log-in page. |
| api.resetTooMany | Too many reset requests. Try again in 10 minutes. |
| common.copyFailed | Couldn't copy. Select the link and copy it. |
| common.open | Open |
| common.retry | Try again |
| country.AE | United Arab Emirates |
| country.CA | Canada |
| country.GB | United Kingdom |
| country.PK | Pakistan |
| country.US | United States |
| demo.try | Try the demo |
| import.dates.dayFirst | Dates are read day first. |
| import.dates.fromCountry | Set from your gym's country. Check the first rows below. |
| import.dates.fromFile | Set from the file: some of its dates only read this way. |
| import.dates.monthFirst | Dates are read month first. |
| import.dates.row | Row {n}: {raw} is {date} |
| import.dates.rowBad | Row {n}: {raw} can't be read this way |
| import.dates.rows | How the first rows read |
| import.dates.toDayFirst | Read them day first |
| import.dates.toMonthFirst | Read them month first |
| import.field.full_name | Full name |
| import.problem.badCheckinTime | couldn't read the check-in time "{value}". |
| import.problem.badEmail | "{value}" isn't a valid email address, so it was left blank. |
| import.problem.badJoinDate | couldn't read the join date "{value}". |
| import.problem.badPhone | "{value}" isn't a valid phone number, so it was left blank. |
| import.problem.beforeJoined | the check-in is before the member joined ({date}). |
| import.problem.extraColumns | Row {n} has {count} columns but the header has {columns}. |
| import.problem.findCheckinTime | We couldn't find a check-in date and time column. Choose which column holds it. |
| import.problem.findJoinDate | We couldn't find a join date column. Choose which column holds it. |
| import.problem.findMatch | We couldn't find a member ID or phone column to match check-ins to members. Choose one. |
| import.problem.findName | We couldn't find a name column. Choose the column with the first name or the full name. |
| import.problem.future | the check-in time is in the future. |
| import.problem.idUsedEarlier | the member ID "{value}" is already used earlier in the file. Give this row its own ID. |
| import.problem.missingColumns | Row {n} has only {count} of {columns} columns. |
| import.problem.noCheckinTime | no check-in time. |
| import.problem.noCheckinTimeColumn | No check-in time column is chosen, so no check-ins can be imported. |
| import.problem.noFirstName | no first name. |
| import.problem.noJoinDate | no join date. |
| import.problem.noJoinDateColumn | No join date column is chosen, so no members can be imported. |
| import.problem.noMatchColumn | No member ID or phone column is chosen, so check-ins cannot be matched to members. |
| import.problem.noMemberId | no member matches ID "{value}". |
| import.problem.noMemberKey | no member matches this row (no ID or phone). |
| import.problem.noMemberPhone | no member matches phone "{value}". |
| import.problem.noName | no name. |
| import.problem.noNameColumn | No first name or full name column is chosen, so no members can be imported. |
| import.problem.phoneTaken | "{value}" is another member's phone number, so the phone was left as it was. |
| import.problem.repeated | this member already appears earlier in the file. |
| import.problem.restored | this member was archived, so importing restores them. |
| import.problem.unclosedQuote | The file ends inside a quoted value. Check for a missing closing quote. |
| import.problem.unknownCoach | no coach has the email "{value}", so no coach was assigned. |
| import.problem.upToDate | already up to date. |
| import.problem.withinHour | duplicate: this member already has a check-in within an hour. |
| invite.lede.owner | Your owner invited you as a co-owner. |
| kiosk.welcome.plain | Welcome back, {first}. |
| login.forgot | Forgot your password? |
| member.archive | Archive |
| member.archiveBody | They leave every list and the kiosk search. Their history stays, and Reports still count it. |
| member.archiveConfirm | Archive member |
| member.archiveDone | {name} archived |
| member.archiveTitle | Archive this member? |
| member.archived | Archived |
| member.coach.none | No coach |
| member.delete | Delete permanently |
| member.deleteBody | Their visits and nudges are deleted too. This can't be undone. |
| member.deleteConfirm | Delete member |
| member.deleteDone | {name} deleted |
| member.deleteTitle | Delete this member for good? |
| member.edit.coach | Change coach |
| member.edit.name | Change name |
| member.edit.phone | Change phone |
| member.firstName | First name |
| member.lastName | Last name |
| member.name | Name |
| member.optional | Optional |
| member.restore | Restore member |
| member.restoreDone | {name} restored |
| members.add | Add member |
| members.add.joined | Joined on |
| members.add.submit | Add member |
| members.add.title | Add a member |
| members.added | {name} added |
| members.card.meta | {week} · {pace} · {last} |
| members.emptyArchived | Members you archive are listed here. |
| members.emptyNone | Members are listed here once they join at the front desk or are imported. |
| members.view | View |
| members.view.archived | Archived |
| members.view.everyone | Everyone |
| members.view.first90 | First 90 days |
| nav.me | Me |
| nudge.contact | Contact {first} |
| nudge.contact.text | Text message |
| nudge.contact.whatsapp | WhatsApp |
| nudge.copyFailed | Couldn't copy. Select the message and copy it. |
| nudges.channel.copy | Copied |
| nudges.channel.inPerson | In person |
| nudges.channel.text | Text |
| nudges.channel.whatsapp | WhatsApp |
| phone.copied | Phone link copied |
| phone.copy | Copy link |
| reset.bad.action | Go to log in |
| reset.bad.title | This link doesn't work |
| reset.email | Email |
| reset.lede | Enter the email you log in with, and we'll send you a link to choose a new password. |
| reset.new.password | New password |
| reset.new.passwordHelp | 8 characters or more. |
| reset.new.submit | Save password |
| reset.new.submitting | Saving |
| reset.new.title | Choose a new password |
| reset.saved | Password saved |
| reset.sent | If an account uses that email, a reset link is on its way. It works once, for an hour. |
| reset.submit | Send reset link |
| reset.submitting | Sending |
| reset.title | Reset your password |
| reset.toLogin | Remember your password? |
| reset.toLogin.link | Log in |
| settings.gym.country | Country |
| settings.import.body | Bring in your member list or past check-ins from a CSV file. |
| settings.import.link | Import members or check-ins |
| settings.import.title | Import |
| settings.invite.email | Email |
| settings.invite.role | Role |
| settings.reactivate | Reactivate |
| signup.country | Country |
| signup.countryPick | Choose a country |
| signup.countryRequired | Choose a country from the list. |
| tab.coach.members | Members |
| tab.coach.more | More |
| tab.owner.nudges | Nudges |

| id | Removed |
| --- | --- |
| billing.notLive | Payments aren't live in this demo. |
| billing.payback | Keep 2 members a month and it pays for itself. |
| billing.plan | Continue at $99 a month |
| more.items | Reports · templates · settings · billing · log out |
| nudge.markSent | Record nudge |
| nudge.recordedFor | Nudge to {first} recorded |
| nudge.send | Text {first} |
| tab.coach.me | Me |

## v1.6, 6 Nov 2026: links that stand on their own

A link that stands on its own is now a small secondary button after a short prompt, so each sign-in footer splits into the prompt and the button's label, and the labels drop their closing full stop (button labels take no closing punctuation). The invite screen's link gets the same shape, with a new id for its label. The board's empty line describes the action instead of quoting a button's label. The notes on the prompts and labels say which is which. 6 strings changed, 1 added. No string removed.

| id | Before | After |
| --- | --- | --- |
| login.toSignup | New gym? Create your account. | New gym? |
| login.toSignup.link | Create your account. | Create your account |
| signup.toLogin | Already have an account? Log in. | Already have an account? |
| signup.toLogin.link | Log in. | Log in |
| invite.toLogin | Already have an account? Log in. | Already have an account? |
| board.emptyBody | No members match these filters. Clear the search or choose All. | No members match these filters. Clear the search, or show all members. |

| id | Added |
| --- | --- |
| invite.toLogin.link | Log in |

## v1.5, 6 Nov 2026: page titles

1 string added: the browser tab title for each page, which puts `brand.name` after the page's own title, as §0 says it is used. No string changed or removed.

| id | Added |
| --- | --- |
| brand.pageTitle | {page} · {brand} |

## v1.4, 6 Nov 2026: the Today screen

4 strings added for the Today screen: the board's two other column headers, the retry button when Today doesn't load, and the accessible name of each toast's close button. No string changed or removed.

| id | Added |
| --- | --- |
| today.board.head.weeks | Weeks |
| today.board.head.status | Status |
| today.retry | Try again |
| toast.dismiss | Dismiss |

## v1.3, 6 Nov 2026: the links on the sign-in screens

2 strings added so the log-in and sign-up screens can link only the last words of their quiet links, as the deck says: each is the linked tail of the full sentence, which stays the one the screen shows. The note on `signup.toLogin` now names its link, as `login.toSignup` and `invite.toLogin` do. No string changed or removed.

| id | Added |
| --- | --- |
| login.toSignup.link | Create your account. |
| signup.toLogin.link | Log in. |

## v1.2, 6 Nov 2026: theme switch, and pages that can't open

12 strings added for the theme switch in the app header, the theme setting on the Me page, the page shown when a screen fails to load, and a not-found page with its own words (it borrowed `api.notFound` and `brand.name` before). No string changed or removed.

| id | Added |
| --- | --- |
| theme.toDark | Switch to dark theme |
| theme.toLight | Switch to light theme |
| theme.choice | Theme |
| theme.choice.light | Light |
| theme.choice.dark | Dark |
| theme.choice.system | Same as device |
| routeError.title | This page didn't open |
| routeError.body | Check your connection and try again. |
| routeError.retry | Try again |
| notFound.title | Page not found |
| notFound.body | Check the address, or start again from the home page. |
| notFound.link | Go to the home page |

## v1.1, 6 Nov 2026: sentence case for the new look

Every string moves from capitals to sentence case for the Hanken Grotesk look: first word and proper nouns capitalized, acronyms (CSV, QR, US, ID, KB) kept. Letter case only: no word, number or punctuation changed. The placeholders `{FIRST}` and `{NAME}`, which existed only to print a value in capitals, are now `{first}` and `{name}`; names render as written (`Sam O.`). 211 strings changed.

| id | Before | After |
| --- | --- | --- |
| auth.hero.day | DAY | Day |
| auth.hero.line | GET EVERY NEW MEMBER THERE. | Get every new member there. |
| billing.offer | FREE 90-DAY PILOT. THEN $99 A MONTH. | Free 90-day pilot. Then $99 a month. |
| billing.pilot | PILOT DAY {n} OF 90 | Pilot day {n} of 90 |
| billing.plan | CONTINUE AT $99 A MONTH | Continue at $99 a month |
| billing.title | BILLING | Billing |
| board.empty | NO MEMBERS TO SHOW | No members to show |
| board.emptyBody | No members match these filters. Clear the search or choose ALL. | No members match these filters. Clear the search or choose All. |
| board.emptyClear | CLEAR FILTERS | Clear filters |
| board.filter.all | ALL | All |
| board.filter.allCoaches | ALL COACHES | All coaches |
| board.filter.coach | COACH | Coach |
| board.filter.status | STATUS | Status |
| board.head.member | NEW MEMBER | New member |
| board.legend.none | NONE | None |
| board.legend.week | THIS WEEK | This week |
| board.pace | {x}/WK | {x}/wk |
| board.title | THE BOARD | The board |
| brand.descriptor | MEMBER RETENTION FOR INDEPENDENT GYMS | Member retention for independent gyms |
| brand.name | TENURE | Tenure |
| common.cancel | CANCEL | Cancel |
| common.close | CLOSE | Close |
| common.save | SAVE | Save |
| import.choose | CHOOSE CSV FILE | Choose CSV file |
| import.commit | IMPORT MEMBERS | Import members |
| import.commitCheckins | IMPORT CHECK-INS | Import check-ins |
| import.done | IMPORT FINISHED | Import finished |
| import.field.checked_in_at | CHECKED IN AT | Checked in at |
| import.field.coach_email | COACH EMAIL | Coach email |
| import.field.email | EMAIL | Email |
| import.field.external_id | MEMBER ID | Member ID |
| import.field.first_name | FIRST NAME | First name |
| import.field.joined_on | JOINED ON | Joined on |
| import.field.last_name | LAST NAME | Last name |
| import.field.phone | PHONE | Phone |
| import.kind | WHAT TO IMPORT | What to import |
| import.kind.checkins | CHECK-INS | Check-ins |
| import.kind.members | MEMBERS | Members |
| import.map.title | COLUMNS | Columns |
| import.paste | OR PASTE THE CSV | Or paste the CSV |
| import.preview | PREVIEW | Preview |
| import.problems | PROBLEMS | Problems |
| import.sample | FIRST 10 ROWS | First 10 rows |
| import.title | IMPORT | Import |
| invite.bad.action | GO TO LOG IN | Go to log in |
| invite.bad.title | THIS LINK DOESN'T WORK | This link doesn't work |
| invite.email | EMAIL | Email |
| invite.name | YOUR NAME | Your name |
| invite.password | PASSWORD | Password |
| invite.submit | JOIN {gymName} | Join {gymName} |
| invite.submitting | JOINING | Joining |
| invite.title | JOIN {gymName} | Join {gymName} |
| kiosk.idle.title | CHECK IN | Check in |
| kiosk.join | NEW HERE? JOIN | New here? Join |
| kiosk.join.cancel | CANCEL | Cancel |
| kiosk.join.first | FIRST NAME | First name |
| kiosk.join.last | LAST NAME | Last name |
| kiosk.join.optional | OPTIONAL | Optional |
| kiosk.join.phone | PHONE | Phone |
| kiosk.join.submit | JOIN AND CHECK IN | Join and check in |
| kiosk.join.title | JOIN | Join |
| kiosk.keypad.submit | CHECK IN | Check in |
| kiosk.notFound | We couldn't find that number. Try your name, or tap NEW HERE? JOIN. | We couldn't find that number. Try your name, or tap New here? Join. |
| kiosk.notFound.action | Try your name, or tap NEW HERE? JOIN. | Try your name, or tap New here? Join. |
| kiosk.retry | TRY AGAIN | Try again |
| kiosk.search.label | FIRST NAME | First name |
| kiosk.search.phone | USE MY PHONE NUMBER | Use my phone number |
| kiosk.search.toggle | USE MY NAME | Use my name |
| kiosk.set.copy | COPY LINK | Copy link |
| kiosk.set.open | OPEN THE KIOSK | Open the kiosk |
| kiosk.set.title | KIOSK | Kiosk |
| kiosk.welcome.back | WELCOME BACK, {FIRST}. WEEK {n}. | Welcome back, {first}. Week {n}. |
| kiosk.welcome.first | WELCOME, {FIRST}. DAY 1 OF 90. | Welcome, {first}. Day 1 of 90. |
| kiosk.welcome.line | ON THE LINE THIS WEEK. | On the line this week. |
| login.email | EMAIL | Email |
| login.password | PASSWORD | Password |
| login.submit | LOG IN | Log in |
| login.submitting | LOGGING IN | Logging in |
| login.tagline | KEEP NEW MEMBERS PAST DAY 90. | Keep new members past day 90. |
| login.title | LOG IN | Log in |
| me.email | EMAIL | Email |
| me.gym | GYM | Gym |
| me.logout | LOG OUT | Log out |
| me.name | NAME | Name |
| me.role | ROLE | Role |
| me.title | ME | Me |
| member.checkins.title | CHECK-INS | Check-ins |
| member.coach | COACH | Coach |
| member.days.title | THE 90 DAYS | The 90 days |
| member.edit | CHANGE | Change |
| member.email | EMAIL | Email |
| member.notFound.back | BACK TO MEMBERS | Back to members |
| member.notFound.title | MEMBER NOT FOUND | Member not found |
| member.nudge | NUDGE → | Nudge → |
| member.nudges.cameBack | CAME BACK | Came back |
| member.nudges.title | NUDGES | Nudges |
| member.pace | {x} / WK | {x} / wk |
| member.phone | PHONE | Phone |
| member.status | STATUS | Status |
| member.weeks.title | THE 13 WEEKS | The 13 weeks |
| members.col.last | LAST VISIT | Last visit |
| members.col.name | NAME | Name |
| members.col.pace | PACE | Pace |
| members.col.week | WEEK | Week |
| members.empty | NO MEMBERS FOUND | No members found |
| members.title | MEMBERS | Members |
| more.items | REPORTS · TEMPLATES · SETTINGS · BILLING · LOG OUT | Reports · templates · settings · billing · log out |
| nav.coach.board | BOARD | Board |
| nav.coach.members | MEMBERS | Members |
| nav.coach.nudges | NUDGES | Nudges |
| nav.coach.templates | TEMPLATES | Templates |
| nav.coach.today | MY MEMBERS | My members |
| nav.logout | LOG OUT | Log out |
| nav.menu | MENU | Menu |
| nav.owner.billing | BILLING | Billing |
| nav.owner.board | BOARD | Board |
| nav.owner.members | MEMBERS | Members |
| nav.owner.nudges | NUDGES | Nudges |
| nav.owner.reports | REPORTS | Reports |
| nav.owner.settings | SETTINGS | Settings |
| nav.owner.templates | TEMPLATES | Templates |
| nav.owner.today | TODAY | Today |
| nudge.copy | COPY MESSAGE | Copy message |
| nudge.markSent | RECORD NUDGE | Record nudge |
| nudge.noPhoneAction | RECORD NUDGE | Record nudge |
| nudge.noPhoneTitle | NO PHONE ON FILE | No phone on file |
| nudge.send | TEXT {FIRST} | Text {first} |
| nudge.template | TEMPLATE | Template |
| nudge.text | MESSAGE | Message |
| nudge.title | NUDGE {FIRST} | Nudge {first} |
| nudges.cameBack | CAME BACK | Came back |
| nudges.empty | NO NUDGES YET | No nudges yet |
| nudges.emptyBody | Nudge someone from SLIPPING NOW and it shows up here. | Nudge someone from Slipping now and it shows up here. |
| nudges.title | NUDGES | Nudges |
| phone.title | OPEN ON A PHONE | Open on a phone |
| reports.chart.line | THE LINE · 3 A WEEK | The line · 3 a week |
| reports.chart.slipped | SLIPPED | Slipped |
| reports.chart.still | STILL COMING | Still coming |
| reports.cohorts.title | COHORTS | Cohorts |
| reports.col.day30 | DAY 30 | Day 30 |
| reports.col.day60 | DAY 60 | Day 60 |
| reports.col.day90 | DAY 90 | Day 90 |
| reports.col.members | MEMBERS | Members |
| reports.col.month | JOINED | Joined |
| reports.nudges.cameBack | CAME BACK | Came back |
| reports.nudges.rate | RATE | Rate |
| reports.nudges.sent | NUDGES SENT | Nudges sent |
| reports.nudges.title | NUDGE RESULTS | Nudge results |
| reports.title | REPORTS | Reports |
| reports.visits.title | VISITS BY WEEK | Visits by week |
| role.coach | COACH | Coach |
| role.owner | OWNER | Owner |
| settings.deactivate | DEACTIVATE | Deactivate |
| settings.deactivateConfirm | DEACTIVATE | Deactivate |
| settings.deactivateTitle | DEACTIVATE {NAME} | Deactivate {name} |
| settings.gym.name | GYM NAME | Gym name |
| settings.gym.title | GYM | Gym |
| settings.gym.tz | TIMEZONE | Timezone |
| settings.invite | INVITE A COACH | Invite a coach |
| settings.invite.copy | COPY LINK | Copy link |
| settings.invite.create | CREATE LINK | Create link |
| settings.invite.name | COACH NAME | Coach name |
| settings.staff.title | STAFF | Staff |
| settings.title | SETTINGS | Settings |
| signup.email | EMAIL | Email |
| signup.gymName | GYM NAME | Gym name |
| signup.name | YOUR NAME | Your name |
| signup.password | PASSWORD | Password |
| signup.submit | START THE PILOT | Start the pilot |
| signup.submitting | CREATING YOUR GYM | Creating your gym |
| signup.title | SET UP YOUR GYM | Set up your gym |
| status.below | BELOW THE LINE | Below the line |
| status.new | NEW | New |
| status.on | ON THE LINE | On the line |
| status.slipping | SLIPPING | Slipping |
| tab.coach.board | BOARD | Board |
| tab.coach.me | ME | Me |
| tab.coach.nudges | NUDGES | Nudges |
| tab.coach.today | TODAY | Today |
| tab.owner.board | BOARD | Board |
| tab.owner.members | MEMBERS | Members |
| tab.owner.more | MORE | More |
| tab.owner.today | TODAY | Today |
| tag.sample | SAMPLE DATA | Sample data |
| templates.delete | DELETE | Delete |
| templates.deleteConfirm | DELETE TEMPLATE | Delete template |
| templates.deleteTitle | DELETE THIS TEMPLATE | Delete this template |
| templates.empty | NO TEMPLATES | No templates |
| templates.field.body | MESSAGE | Message |
| templates.field.name | NAME | Name |
| templates.new | NEW TEMPLATE | New template |
| templates.preview | PREVIEW | Preview |
| templates.save | SAVE TEMPLATE | Save template |
| templates.title | TEMPLATES | Templates |
| templates.vars.title | VARIABLES | Variables |
| toast.checkin | {NAME} CHECKED IN | {name} checked in |
| toast.import | IMPORT FINISHED | Import finished |
| today.board.open | OPEN THE BOARD | Open the board |
| today.board.title | THE BOARD | The board |
| today.checkins.title | CHECKED IN TODAY | Checked in today |
| today.coach.title | MY MEMBERS | My members |
| today.empty.import | IMPORT MEMBERS | Import members |
| today.empty.kiosk | OPEN THE KIOSK | Open the kiosk |
| today.empty.title | NO MEMBERS YET | No members yet |
| today.kpi.new | NEW MEMBERS | New members |
| today.kpi.nudged | NUDGED THIS WEEK | Nudged this week |
| today.kpi.onLine | ON THE LINE | On the line |
| today.kpi.slipping | SLIPPING | Slipping |
| today.owner.title | TODAY | Today |
| today.slipping.nudge | NUDGE → | Nudge → |
| today.slipping.title | SLIPPING NOW | Slipping now |
