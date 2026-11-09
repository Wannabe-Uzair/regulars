# Tenure expo stall runbook

Four people, one laptop, one phone, one second phone. Tenure is sample data for a demo gym (Northside Strength). Screens and button names follow `SPEC.md` and `COPY.md`. The app is still being built, so anything marked **CHECK ON THE DAY** may differ from this page.

## 1. Before the expo (the night before)

1. Install and seed:
   ```
   cd tenure/app && npm run install:all && npm run seed
   ```
   `npm run seed` prints the shared demo password. Keep that terminal output handy.
2. Start the stall build: `npm run stall`. It builds the client and prints the phone URLs.
3. Test the phone link at home: phone and laptop on the same Wi-Fi, open a printed URL on the phone, log in as Mike.
4. Set Sam O.'s phone number to a teammate's real number (Settings, or Sam's member page, CHANGE). This lets the nudge text arrive on a second phone at the stall. Re-seeding resets it, so repeat after every `npm run seed`.
5. Charge the laptop, the demo phone, the teammate's phone, any tablet, and a power bank.
6. Bring a phone with Messages that can text another teammate's phone (the demo phone). Bring a charging cable and the Ethernet or USB adapter you plan to share from.
7. Agree who does what: Presenter (talks), Driver (laptop), Coach phone (Mike), Kiosk host (welcomes visitors).

## 2. Setting up at the stall (10 minutes)

### Network

The phone needs to reach the laptop. Pick one.

**A. The Mac creates the Wi-Fi (venue gives Ethernet, or an iPhone is plugged in by USB).**
System Settings, General, Sharing, Internet Sharing. Set "Share your connection from" to Ethernet or iPhone USB, and "To computers using" to Wi-Fi. Open Wi-Fi Options to set a network name, a password and security, then switch Internet Sharing on. Join the phone to that network.
CHECK ON YOUR MAC: menu names and options differ between macOS versions, and sharing turns Wi-Fi off as a client on the Mac.

**B. The venue has no internet.** Tenure does not need internet, only a shared network. Two ways:
- Try Internet Sharing anyway: pick any listed source (for example Ethernet or iPhone USB) and see whether it lets you turn sharing on and create the Wi-Fi network. CHECK ON YOUR MAC: some versions only start sharing when the source has a connection.
- Use a teammate's phone Personal Hotspot (Settings, Personal Hotspot). Put the laptop and the demo phone both on it. This phone should be neither the demo phone nor the one receiving the text.

Whichever you pick, start `npm run stall` after the laptop has joined or created the network, so the printed URLs show the right address.

### Start and log in

1. In `tenure/app`, run `npm run stall`. Leave the terminal open.
2. Open the app on the laptop (URL printed by the command). Log in as the owner, Mike (see section 4).
3. Go to SETTINGS, find OPEN ON A PHONE, and scan the QR code with the demo phone camera. If it will not scan, type the address under the code.
4. On the demo phone, log in as Mike too. He owns the gym and also coaches, and Sam is one of his members, so the nudge on the phone is signed Coach Mike, as on the printed pieces. (A coach like Priya sees only her own members, so she can't open Sam.) Optional: add to the home screen (Tenure is a PWA).
5. Kiosk: in SETTINGS, KIOSK, press OPEN THE KIOSK. Put it in a second browser window, or open the same link on a tablet on the stall network. Leave it on the check-in screen for visitors.
6. Dry run: do the script in section 3 once before the doors open. Then reset (below).

### Reset between demos

Needed after a visitor joins at the kiosk or someone edits data.
1. Stop the server: press Ctrl+C in the `npm run stall` terminal.
2. `npm run seed`
3. `npm run stall`
4. Log in again on the laptop and the phone. Set Sam's number again (step 4 of section 1).

`npm run seed` uses this laptop's time zone (it prints it), so check-in times match the clock in the room. Seed on the
day of the stall, after 9 am: the sample gym's check-ins for today fall between 6:00 and 8:59 am.

### Privacy

Visitors use only the kiosk. A phone number is optional there; a first name is enough.
Never hand the laptop or the owner login to a visitor. The owner login shows every member's phone number, visitors' included.
After the stall, run `npm run seed`. It erases every visitor's name and number.

## 3. The 2-minute demo script

Say the lines at a calm pace, one idea per breath, and let each fact sit before the next click. Numbers come only from the approved facts in `tenure/brand/DESIGN.md` section 2; say the source with the number. Say "sample data" once near the start. For visitor questions afterwards, see `tenure/VISITOR-QA.md`.

| Time | Click | Say |
| --- | --- | --- |
| 0:00 | Laptop on the Today screen as Mike | "6 in 10 new members are gone by month three. That's from Sperandei and colleagues, 2016. They rarely quit on day one. They fade: one missed week, then two, then a cancellation." |
| 0:15 | Point at the board | "The ones who stay hit 3 visits a week. On the board, that is the line." |
| 0:25 | Point at SLIPPING NOW | "These members are slipping: two weak weeks in a row. This is sample data. None of these people are real." |
| 0:40 | Click Sam O. | "Sam is one of Coach Mike's members. Here he is, week by week. Fewer visits each week, and none lately." |
| 0:55 | Hand over to the demo phone, logged in as Mike. Open Sam, press NUDGE → | "Now the coach's side, on his own phone." |
| 1:05 | Pick the template "We missed you" | "He picks a message, and it fills in Sam's name. He can edit any of it." |
| 1:15 | Press TEXT SAM | "Tenure doesn't send the text. It opens his own Messages app." |
| 1:25 | Messages opens with the text. Send it. Show the teammate's phone buzzing | "It arrives as an ordinary text, from the coach. Tenure records the nudge." |
| 1:35 | Invite a visitor to the kiosk: NEW HERE? JOIN, first name only | "This is the front desk. Join as a new member. A first name is enough." |
| 1:45 | Back to the laptop, on Today: point at the CHECKED IN TODAY row and the toast | "And there you are. Checked in today, week 1, on the owner's screen." |
| 1:55 | Point at the price | "The plan is a free 90-day pilot, then $99 a month per gym. Tenure is a prototype for this expo, so nothing is for sale today." |

Notes:
- If there is time, add after 0:15: "IHRSA's figures: 78% of members at 3 or more visits a week renew. Under once a week, it is 59%." Do not add other figures.
- CHECK ON THE DAY: Sam O. is in SLIPPING NOW on Mike's list.
- To show the coach's view, log in as Priya in a second browser window: she sees only her own members.
- CHECK ON THE DAY: the template name reads "We missed you" and the buttons read NUDGE → and TEXT SAM.
- CHECK ON THE DAY: the kiosk join flow (NEW HERE? JOIN) works, and the visitor shows up in CHECKED IN TODAY with the {NAME} CHECKED IN toast within a few seconds. Keep the laptop on Today: on the board the new row sits below the fold.
- CHECK ON THE DAY: tapping TEXT SAM opens Messages with the number and text filled in. On a computer it shows COPY MESSAGE and RECORD NUDGE instead.

## 4. Logins

| Email | Role | Use |
| --- | --- | --- |
| `mike@northside.test` | Owner (also coaches) | Laptop and demo phone |
| `priya@northside.test` | Coach | Optional: the coach's view (only her members) |
| `jordan@northside.test` | Coach | Spare |

Password: the shared demo password is `DEMO_PASSWORD` in `server/seed/northside.mjs`, and `npm run seed` prints it. Do not post it anywhere public.

## 5. If something goes wrong

| Problem | Fix |
| --- | --- |
| Phone cannot open the link | Check the phone and laptop are on the same network (not mobile data). The Mac may show a firewall prompt about incoming connections: click Allow. If you missed it, check System Settings, Network, Firewall. Try the other URL listed by `npm run stall` or in OPEN ON A PHONE. Restart `npm run stall` after changing networks. |
| Port already in use | An old server is still running. Find it with `lsof -i :5175`, stop that process (only one you started), and run `npm run stall` again. |
| Visitor typed something silly at the kiosk | Reset: stop the server, `npm run seed`, `npm run stall`, log in again (section 2). |
| Nudge text does not arrive | Check Sam's phone number is the teammate's number, then check that phone has signal. Fall back: say it opens Messages and show the draft. |
| No Wi-Fi at all | Run everything on the laptop. Show the phone layout in a narrow browser window (about 390 px wide, or use the browser's device toolbar). Use Mike's login in two windows, one of them narrow. |
| Phone logged out | Log in again as Mike (section 4). |

## 6. What not to say

- Tenure is a concept. It is not launching. Do not say it is available, shipping or live.
- Do not claim results, customers, pilots in progress, testimonials or integrations. No "trusted by".
- Do not say Tenure improves retention. It is untested. The numbers describe gyms, not Tenure.
- Everything on screen is sample data (SAMPLE DATA tag). Sam, Priya and Mike are made up.
- Payments are not live in this demo.
- Do not offer the laptop or the owner login to a visitor. Visitors use only the kiosk, and the phone number there is optional. The owner login shows every phone number. After the stall, `npm run seed` erases every visitor's name and number.
- No hype and no exclamation marks. The banned words are listed in `tenure/brand/DESIGN.md` section 2.
- Do not put roles, school or course names next to team names. Team: Uzair Imran, Moiz Hamid, Zain ul Abideen, Ali Hassan.
