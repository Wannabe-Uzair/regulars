# Copy round 1 applied: app and docs

Source: `copy/chosen.json` (2026-11-06). Rehearsal items from the coordinator are at the end.

## App copy (`app/COPY.md`, built into `client/src/copy.generated.json`)

| Where | Before | After |
| --- | --- | --- |
| COPY `login.tagline` | GET EVERY NEW MEMBER TO DAY 90. | KEEP NEW MEMBERS PAST DAY 90. |
| COPY `status.below` | BELOW | BELOW THE LINE |
| COPY §1 order of checks | SLIPPING, NEW, ON THE LINE, BELOW. | SLIPPING, NEW, ON THE LINE, BELOW THE LINE. |
| COPY `nudge.send` | SEND FROM MY PHONE | TEXT {FIRST} (renders TEXT SAM) |
| COPY `nudge.copy` | COPY TEXT | COPY MESSAGE |
| COPY `nudge.markSent` | MARK AS SENT | RECORD NUDGE |
| COPY `nudge.noPhoneAction` | MARK AS SENT | RECORD NUDGE |
| COPY `today.empty.import` | IMPORT YOUR MEMBERS | IMPORT MEMBERS |
| COPY `signup.title` | CREATE YOUR GYM | SET UP YOUR GYM |
| COPY `signup.submit` | CREATE GYM | START THE PILOT |
| COPY `billing.plan` | CHOOSE THE $99 PLAN | CONTINUE AT $99 A MONTH |
| COPY `billing.payback` | Keep two members a month and it pays for itself. | Keep 2 members a month and it pays for itself. |
| COPY `toast.nudge` "When" note | After send or mark as sent | After TEXT {FIRST} or RECORD NUDGE; on a phone it shows before the text app opens |
| `client/src/components/core/NudgeComposer.jsx` | `t('nudge.send')` | `t('nudge.send', { FIRST: m.firstName.toUpperCase() })` |

## Starter templates (`server/seed/northside.mjs` TEMPLATES; the seeded past nudges render from these)

| Where | Before | After |
| --- | --- | --- |
| TEMPLATES[0] body | … 6 pm class? — Coach {coach} | … 6 pm class? - Coach {coach} |
| TEMPLATES[1] name | Quick check-in | First weeks |
| TEMPLATES[1] body | Hi {first}, it's {coach} from {gym}. How are your first few weeks going? Anything I can help with? | Hi {first}, it's {coach} from {gym}. How are your first few weeks going? Tell me if I can help with anything. |
| TEMPLATES[2] name | Back on track | One visit |
| TEMPLATES[2] body | Hey {first}, it's been {days} days. One visit this week gets you back on track. See you soon? — {coach} | Hi {first}, it's been {days} days since we saw you. One visit this week is a good restart. Want me to save you a spot? - {coach} |

## App name

| Where | Before | After |
| --- | --- | --- |
| `client/public/manifest.webmanifest` `name` | Tenure | Tenure: member retention |
| `client/public/manifest.webmanifest` `short_name` | Tenure | Tenure (unchanged) |
| `client/index.html` `<title>` | Tenure | Tenure: member retention |
| `client/index.html` `apple-mobile-web-app-title` | Tenure | Tenure (unchanged) |

## Docs

| Where | Before | After |
| --- | --- | --- |
| `app/DEMO.md` §3 1:15 click | Press SEND FROM MY PHONE | Press TEXT SAM |
| `app/DEMO.md` §3 notes, CHECK ON THE DAY | buttons read NUDGE → and SEND FROM MY PHONE | buttons read NUDGE → and TEXT SAM |
| `app/DEMO.md` §3 notes, CHECK ON THE DAY | tapping SEND FROM MY PHONE … COPY TEXT and MARK AS SENT | tapping TEXT SAM … COPY MESSAGE and RECORD NUDGE |
| `VISITOR-QA.md` Q7 | taps SEND FROM MY PHONE | taps TEXT and the member's name (TEXT SAM) |
| `app/SPEC.md` §5 seed templates | "Quick check-in", "Back on track", em-dash sign-offs | "First weeks", "One visit", the new bodies, hyphen sign-offs (one GSM-7 SMS) |
| `app/SPEC.md` §5 sending | COPY TEXT | COPY MESSAGE |
| `app/SPEC.md` §7 `/login…` row | IMPORT YOUR MEMBERS | IMPORT MEMBERS |
| `app/SPEC.md` §7 nudge composer row | SEND FROM MY PHONE (phone) or COPY TEXT + MARK AS SENT (computer) | TEXT {FIRST}, e.g. TEXT SAM (phone) or COPY MESSAGE + RECORD NUDGE (computer) |
| `app/SPEC.md` §7 PWA line | name Tenure | name "Tenure: member retention", short name Tenure |
| `app/SPEC.md` §8 demo gym | Chris L. (BELOW) | Chris L. (BELOW THE LINE) |

## Rehearsal items (coordinator, same round)

| Where | Before | After |
| --- | --- | --- |
| `NudgeComposer.jsx` phone send | records, then opens `sms:` at once (toast never seen) | records, shows the "Nudge to {first} recorded" toast, opens `sms:` 300 ms later |
| `app/DEMO.md` §3 1:45 click | Back to the laptop board | Back to the laptop, on Today: point at the CHECKED IN TODAY row and the toast |
| `app/DEMO.md` §3 1:45 say | "And there you are, in week 1, on the owner's board." | "And there you are. Checked in today, week 1, on the owner's screen." |
| `app/DEMO.md` §3 notes, CHECK ON THE DAY | the new row on the board shows up within a few seconds | the visitor shows up in CHECKED IN TODAY with the {NAME} CHECKED IN toast; keep the laptop on Today (the board row is below the fold) |
| `app/DEMO.md` §2 new "Privacy" | — | Visitors use only the kiosk; phone optional; never hand over the laptop or owner login (it shows every phone number); `npm run seed` after the stall erases visitors' names and numbers |
| `app/DEMO.md` §6 What not to say | — | Same privacy rule as one bullet |
