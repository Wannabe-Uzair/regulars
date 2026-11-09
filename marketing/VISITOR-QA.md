# Regulars — visitor questions

Read this before the stall; glance at it during. Each answer is two or three plain sentences. Say them at a calm pace,
one idea per breath, and let the fact sit. Every fact here comes from `brand/DESIGN.md` §2 and `app/SPEC.md`. When a
number has a source, say the source with it. If a question is not on this page, use the last section.

Three things are always true at the stall: everything on screen is sample data, the app is a prototype that is not on
sale yet, and a person sends every text; nothing is ever sent from Regulars.

## What it is and who it's for

### 1. What is it?

> It's Regulars, a dashboard for independent gyms. It follows each new member's first 90 days, shows who is slipping, and lets a coach text them from their own phone. That window matters: 6 in 10 new members are gone by month three (Sperandei et al., 2016).

### 2. Who is it for?

> Owners and coaches of independent gyms in the US. The owner sees every new member. Each coach sees only the members assigned to them.

### 3. How is that different from the software my gym already has?

> Some gym systems do flag members at risk, often on their bigger plans. Ours is the narrow version: only a new member's first 90 days, one rule anyone can check, and messages from the coach's own phone.

## How it works

### 4. How does a member count as slipping?

> The app counts each new member's visits, week by week, from the day they join. Two finished weeks in a row with fewer than 2 visits each, and they show as slipping. A week with 3 or more visits puts them on the line.

### 5. Why 3 visits a week?

> The ones who stay hit 3 visits a week. In a 2001 UK industry study, members who came 3 or more times a week in their first month renewed 78% of the time. Under once a week, it was 59%.

### 6. Where does the data come from?

> The owner imports a CSV file of members and check-ins, and checks a preview before anything is saved. Members also check in at a front-desk kiosk with their phone number, no login needed. There are no integrations with other gym software.

### 7. Does it text my members?

> No, nothing is ever sent from Regulars. One tap opens a personal text from you or their coach, ready to send: the coach picks a message, can edit it, and chooses Text message or WhatsApp. The nudge is recorded, and marked Came back if the member visits within 7 days.

### 8. Is there AI in it?

> No. The app counts visits per week and applies fixed rules, so you can always see why someone shows as slipping. A person decides who to text and what to say.

## Data and privacy

### 9. Where is the member data kept?

*The honest answer includes "we don't know yet".*

> In this demo, everything lives on this laptop, in one database file. The app doesn't use the internet here; the phones reach the laptop over a local Wi-Fi network. Where a real gym's data would live is a decision we haven't made.

### 10. Who can see it, and is it secure?

> The owner sees every member; a coach sees only their own, and the server checks that on every request. Passwords are stored as hashes, not as text. We have no security certification; this is a prototype.

## Price and availability

### 11. What does it cost?

> The plan we'd test: a free 90-day pilot, then $99 a month per gym. Not on sale yet. One flat price. Unlimited members. Most US members pay under $50 a month (Health & Fitness Association). Keep 2 members a month, and from the second month it pays for itself.

### 12. Can I use it at my gym? When does it launch?

*The honest answer is "we don't know yet".*

> Not today. It's a prototype built for this expo, so nothing is on sale yet, and there is no sign-up today and no launch date. What comes after the expo, we haven't decided.

## The project

### 13. Is Northside Strength a real gym?

> No. Northside Strength is sample data, and every member and coach on screen is made up. The app itself is real: accounts, a database, CSV import, the kiosk and live updates, all running on this laptop.

### 14. Does it work? Has a gym used it?

*The honest answer is "we don't know yet".*

> We don't know yet. No gym has used Regulars, so we can't say it keeps members. The numbers we quote describe gyms in general, not Regulars.

### 15. Who built it?

> Four of us: Uzair Imran, Moiz Hamid, Zain ul Abideen and Ali Hassan. We built the prototype for this expo, and the name, Regulars, is a working name.

## If you don't know

Questions outside this page get one of these. Don't guess, and don't promise a feature, a date or a price.

- "Good question. We haven't worked that out, and I'd rather not guess."
- "That isn't in the prototype. Here is what it does today." Then show the closest screen.
- "I don't have a figure for that. The numbers we use are on the brochure, each with its source."
