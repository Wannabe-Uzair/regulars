# Regulars at the stall: the runbook

How to run Regulars at the expo stall, in plain steps. The app runs on one laptop inside Docker. Phones and the kiosk
reach it over a phone hotspot or a travel router. No internet is needed at the stall once the first start is done.

The name visitors see is Regulars: on the screens, the brochure and the standee. Inside, the code name stays tenure, so
the `tenure` folder, the commands, the TENURE_ settings, the tenure-data volume and the lines Terminal prints keep it.

Everything you type goes into the **Terminal** app (press Cmd+Space, type Terminal, press Return). Copy each grey box
exactly, paste it into Terminal, and press Return.

Sign-ins: "Try the Demo" signs anyone in as the sample gym's owner with one tap, so nobody needs a password at the
stall. Don't type a demo password anywhere, and don't put one on a sign.

## 1. Moving Regulars to the stall laptop (the night before, at home, online)

### Install Docker Desktop

1. On the stall laptop, open the Apple menu, then About This Mac. Note the **Chip**: Apple (M1, M2, and so on) or Intel.
2. Go to docker.com, choose Download Docker Desktop, and pick the Mac version for that chip.
3. Open the downloaded file and drag Docker into Applications. Open Docker from Applications.
4. Read and accept Docker's agreement. You can skip signing in to a Docker account.
5. Wait until Docker Desktop says the engine is running (a green status in the bottom-left corner of its window). The
   whale icon stays in the menu bar while it runs.

### Get the code onto it

Copy the whole `tenure` folder from this Mac onto the stall laptop (a USB drive, or AirDrop), into your home folder.
It is about 1.5 GB. To copy less, leave out the `node_modules` and `.claude` folders inside it; neither is needed.

### Which build runs

The stall laptop runs the branch `redesign` if it passes every check and Uzair's look by 09:00 on the stall day;
otherwise it runs `stall-fallback`, the tested build with the new name. Both say Regulars. `stall-tested` is the last
resort: it still says Tenure, so if it runs, answer the name question from the briefing ("Tenure was the working name
until last night").

To change the build, stop the app (Ctrl+C), then in Terminal, in the `tenure` folder, switch to the branch Uzair names:

```bash
git switch stall-fallback
```

Then start the app as usual. Do this online (a phone hotspot with mobile data will do): the first start after a switch
rebuilds the app, and without the internet the rebuild fails and the app starts as it was last built, on the old
branch. If git refuses to switch, run `git switch --discard-changes --ignore-other-worktrees <branch>` (the stall
laptop holds no code changes of its own).

The copied `tenure` folder holds each branch as it was when copied, and the repo has no remote, so copy the folder
again after the 09:00 call. The data lives in Docker's `tenure-data` volume, not in the folder.

After a switch, read Terminal, not `git branch --show-current` (which only reports the folder). If Terminal prints
"Using the image built last time", the old build is still running, so go online and start again.

The night before: run `git --version` once on the stall laptop (if git is missing, macOS offers to install its command
line tools, which needs the internet). Then rehearse the switch at home, online: switch to stall-fallback, start it,
see Regulars, switch back to redesign and start it, so both builds are made while online.

### The first run

1. In Terminal, go into the folder. Type `cd ` (with a space after it), drag the `tenure` folder from Finder onto the
   Terminal window, and press Return.
2. Start the app:

   ```bash
   TENURE_COUNTRY=US scripts/stall.sh
   ```

   The first time takes a few minutes: Docker downloads what it needs. That is why this step is done online, at home.
   Later starts take seconds, and work offline.
3. When it is ready, Terminal shows lines like these (your address and code will differ):

   ```text
   Tenure on http://localhost:5175 (this computer)
     on a phone: http://192.168.1.20:5175
     kiosk: http://192.168.1.20:5175/kiosk/…
   ```

   These lines keep the code name, Tenure; the screens say Regulars.

4. Open http://localhost:5175 in Chrome or Safari on the laptop. You should see the Regulars home page, "Turn new
   members into regulars.", with **Try the Demo**.
5. Leave this Terminal window open while the app runs. To stop it, click the Terminal window and press Ctrl+C.

If Terminal says "permission denied", type `TENURE_COUNTRY=US bash scripts/stall.sh` instead.

### The demo data

The first start fills the app with a sample gym, Northside Strength: 3 staff and 85 members, all made up. The kiosk and
every app screen show a "Sample data" tag: on a phone in the header beside the gym's name, on the laptop in the
sidebar, and on the kiosk at the top right. The sample gym's dates count from
the day it is set up, so set it up again on the morning of the stall (section 3, "Before the doors open").

**The stall runs the sample gym as a US gym**, like the brochure, the standee and the slides. Every start of the app for
the stall is this command: the first run at home, the morning's start, every restart in section 5, and a spare laptop
if you use one.

```bash
TENURE_COUNTRY=US scripts/stall.sh
```

Without it, the sample gym takes its country from the laptop's time zone, and Pakistan time gives Pakistan. The sample
gym keeps the laptop's own clock: never set TENURE_TZ, or check-ins show another city's times and the demo's day rolls
over at the wrong hour. Settings then reads United States, with the laptop's Karachi time.

If the sample gym was set up before you started this way (Settings says Pakistan), press **Reset the Demo** (section 3)
once after starting with TENURE_COUNTRY=US, and the sample gym switches to the US. Start it the same way every time, or
the next reset goes back to Pakistan.

If a visitor asks: "The sample gym is a made-up US gym, like the brochure; the clock is this laptop's."

### The printed pieces

The print files are in `marketing/exports`, named `Regulars-*`. For the print shop, send `Regulars-PRINT-NOTE.txt`
with the brochure and standee files it names: it says which file to send for each piece and what to ask for. Print
`Regulars-visitor-answers-A4.pdf` yourself, on an office printer at A4 and 100%, for the stall table. The `Tenure-*`
files carry the old name: don't print them.

## 2. The network

The laptop and the two demo phones (the kiosk phone and the coach phone) must be on the same Wi-Fi, one that lets its
devices reach each other. The app doesn't need the internet.

1. **Start the network.** Turn on a phone's hotspot (iPhone: Settings, Personal Hotspot, Allow Others to Join; Android:
   Settings, Hotspot), or switch on the travel router. Use a phone that isn't one of the demo phones, if you can.
2. **Join the laptop to it** (the Wi-Fi menu at the top right of the screen).
3. **Start the app after the laptop has joined** (Ctrl+C first if it is running, then
   `TENURE_COUNTRY=US scripts/stall.sh`). The app finds the laptop's address when it starts, and the links use that
   address. Each time the laptop joins a different network, or after the laptop restarts, stop the app and start it
   again with `TENURE_COUNTRY=US scripts/stall.sh`.
4. **Join the kiosk phone and the coach phone to the same Wi-Fi.**
5. **Find the links.** The first line Terminal prints is the laptop's address, for example "Phones on this network can
   open http://172.20.10.3:5175". On the laptop, press **Try the Demo**, then click **Settings** in the sidebar. It
   shows two QR codes: the kiosk's under **Kiosk** (first), and the phone link's under **Open on a Phone** (on the
   laptop only, not on a phone). The links themselves stay hidden: press **Show Link** under a QR code to see one, or
   to copy it with **Copy Link**.
6. **Open them on the phones.** Point the phone's camera at the QR code and tap the link. To type it instead, press
   Show Link and type the address in Safari or Chrome exactly as shown, including `http://` and the `:5175`. Then
   press **Hide Link** and leave Settings: don't leave it open on the laptop, because anyone in the aisle can scan the
   kiosk's QR code.
7. **Save the hotspot's data.** On the laptop, turn on Low Data Mode for the hotspot network (System Settings, Wi-Fi,
   Details).

### Who joins the hotspot

Only the laptop, the kiosk phone and the coach phone join the hotspot. Don't share its password. A visitor's phone on
it would get the sample gym's owner screens and Reset the Demo, and a phone hotspot takes only a few devices.

If a visitor asks to try it on their own phone: "This runs on a local network for the demo, so it's on our phones
today. Here, try the kiosk."

### When a phone can't reach the laptop

Try these in order:

- **Same Wi-Fi?** Check the phone's Wi-Fi settings show the same network as the laptop.
- **The Mac's firewall.** The first time, the Mac may ask whether Docker may accept incoming network connections:
  click **Allow**. If you missed it: System Settings, Network, Firewall, Options, and set Docker to "Allow incoming
  connections".
- **Mobile data instead of Wi-Fi.** A Wi-Fi with no internet can make a phone quietly use mobile data, which can't reach
  the laptop. Turn mobile data off on that phone for the demo. On Android, if it asks whether to stay on a Wi-Fi without
  internet, choose to stay connected.
- **A network that keeps devices apart.** Some travel routers and venue Wi-Fi block devices from reaching each other
  (often called "AP isolation", "client isolation" or a guest network). Turn that off in the router's settings, or use
  a phone hotspot instead. Never rely on the venue's Wi-Fi.
- **The address changed.** If the laptop rejoined the network, its address may have changed: stop the app (Ctrl+C), run
  `TENURE_COUNTRY=US scripts/stall.sh` again, and scan the new QR codes.
- **The phone running the hotspot** may not reach the laptop on some models. Use another phone for the demo.
- **Still nothing.** Run the whole demo on the laptop: the kiosk in one browser window, Today in another.

## 3. The stall's flow

### The four of us

Four fixed roles for the whole day. Uzair fills in the names tonight.

- **Host** (name: ____________): greets visitors, gives the one line ("With Regulars, a gym sees which new members
  are slipping in their first 90 days, so a coach can reach them in time"), hands out brochures, and answers from
  `marketing/VISITOR-QA.md` and `docs/STALL-BRIEFING.md`.
- **Laptop driver** (name: ____________): runs Today, the board and Reports on the laptop, is the only one who presses
  Reset the Demo, watches Terminal, and fixes problems from section 5.
- **Phones** (name: ____________): hands the kiosk phone to visitors and takes it back, and shows the nudge on the
  coach phone.
- **Pitch and relief** (name: ____________): gives the 3-minute pitch to judges, runs the reel, covers breaks, and
  keeps the phones charged.

The hand-offs:

- The host to the laptop driver: "Let me show you how it works."
- The laptop driver to the phones: "Check in as a new member on this phone, and watch the laptop."
- Questions about the price or a pilot go back to the host.
- A question that VISITOR-QA.md and the briefing don't cover: "Good question. We haven't worked that out, and I'd
  rather not guess."

Keep two of us on the floor at all times, and take breaks one at a time. The laptop driver is always one of the two
who practiced a restart and a reset.

### Before the doors open

1. Plug the laptop in. In System Settings, set the laptop not to sleep while plugged in (Battery, or Lock Screen,
   depending on the macOS version), or the app goes away whenever the lid or screen sleeps.
2. Start the network and the app (section 2).
3. Take a backup (section 4).
4. On the laptop, open http://localhost:5175, scroll to the foot of the home page, and press **Reset the Demo** (the
   quiet button under the sources). A box asks "Start the demo over?": press **Reset the Demo** in it. The sample gym
   is set up again for today. The kiosk link stays the same, so a kiosk already open keeps working.
5. Do one 20-minute practice run in the four roles: a visitor, a group and a judges' visit, as below. Then the laptop
   driver presses Reset the Demo again.

### With each visitor

1. **Try the Demo, on the laptop.** On the Regulars home page, press **Try the Demo**. It opens **Today**: a sentence
   saying how many new members are slipping, four figures under it, then **Slipping Now** and **Checked In Today**.
2. **A visitor checks in at the kiosk, on a phone.** Open the kiosk link on a phone (scan the QR code under Kiosk, in
   Settings on the laptop) and hand it to the visitor, saying: "Type any first name, a made-up one is fine. It shows on
   our laptop, and we wipe it when we reset. Skip the last name." They tap **Join the Gym** (under the keypad), type a
   first name, and tap **Join and Check In**. The kiosk draws a check and says "Welcome, (name). Day 1 of 90.", then
   gets ready for the next person on its own. If someone types what looks like a real full name, the laptop driver
   resets before the next visitor (step 5).
3. **Today updates live.** Within a couple of seconds the visitor appears on the laptop under **Checked In Today**,
   with a short "(name) checked in" message. Nobody needs to reload.
4. **A coach contacts a slipping member, from a phone.** On a second phone, open the phone link (scan the QR code
   under Open on a Phone, in Settings on the laptop), press **Try the Demo**, and on Today, under Slipping Now, tap
   **Nudge** beside a member (Sam O., say). A sheet rises with the template "We missed you" already picked. Tap **Text
   Message** or **WhatsApp**. The app records the nudge and opens the phone's own app with the message filled in. The
   sample members' numbers are made up, so show the message and go back without sending it. Back in the browser, Sam's
   button now reads **Nudged**, with a check, on that phone. Keep the coach phone upright: turned sideways it is wider
   than 640 px and gets the laptop's box, without Text Message.
5. **Reset, by one person only.** Only the laptop driver presses **Reset the Demo**, on the laptop, when no one else is
   mid-demo, and says "Resetting" first. Reset after a group leaves, and at once if a visitor typed a full name, a rude
   word or someone else's name, because the demo gym has no Archive or Delete button. Before a judge's visit, reset,
   then press Try the Demo again on the laptop and the coach phone, and don't reset until they leave. The reset is the
   quiet button at the foot of the Regulars home page (http://localhost:5175): confirm it, then press Try the Demo
   again on each screen, as every one is signed out. The kiosk keeps working.

In stall mode, the Regulars home page shows **Try the Demo** (in the bar at the top, under the headline, and again near
the end), the line "Free 90-day pilot. Unlimited members.", and **Reset the Demo** as a quiet button at the foot of the
page. There is no Log In and no Set Up Your Gym, so a visitor has nothing to sign up to. Visitors use the kiosk, and the
demo screens only with you beside them. Behind Docker, the whole stall shares one limit of 30 kiosk check-ins a minute.

Never press Reset the Demo on a phone.

### Finding your way round the app

- **The kiosk** opens on **Phone Number**, with a keypad and **Check In**. A member who doesn't know their number taps
  **Name** and types their first name. A new visitor taps **Join the Gym**.
- **On the laptop**, the sidebar on the left holds every page (Today, Board, Members, Reports and Settings, the same five as the phone's tabs),
  with **Log Out** at its foot.
- **On a phone**, the bar at the bottom has five tabs: Today, Board, Members, Reports and Settings. **Log Out** is at
  the end of Settings, under Account. You rarely need it: a reset signs every screen out anyway.
- **A member's row** opens their page, with 90 days of visits and their nudges. The link at the top goes back to the
  page you came from.
- **The Nudge sheet** has Cancel at the top left. On a phone it offers Text Message, WhatsApp and Copy Message; on the
  laptop, WhatsApp and Copy Message only (a laptop can't send a text). Keep the coach phone upright: turned sideways it
  is wider than 640 px and gets the laptop's box, without Text Message.

### If the stall runs stall-fallback

The fallback build has the same steps, with the older screens. What differs:

| On redesign | On stall-fallback |
| --- | --- |
| **Try the Demo**, **Reset the Demo** (at the foot of the home page) | **Try the demo**, **Reset the demo** (side by side, under the headline) |
| **Slipping Now**, **Checked In Today** | **Slipping now**, **Checked in today** |
| Kiosk: **Join the Gym**, then **Join and Check In** | **New here? Join**, then **Join and check in** |
| Kiosk: **Phone Number** / **Name** | **Use my name** |
| Nudge: **Text Message**, **WhatsApp**, **Copy Message** in the sheet | **Contact Sam** opens a menu: **Text message**, **WhatsApp**, **Copy message** |
| Settings: the links behind **Show Link** | The links show under their QR codes |
| Phone: **Log Out** in Settings, under Account | **Log out** under the **More** tab |

### Passers-by, groups and judges

- **Passing by (30 seconds):** the host gives the one line, points at the board on the standee and hands over a
  brochure.
- **A group:** pass the kiosk phone round. Each person joins with a first name and watches it appear on the laptop. One
  of them nudges Sam O. from the coach phone. The laptop driver resets when the group leaves.
- **Judges (about 5 minutes):** before they arrive, the laptop driver resets and presses Try the Demo again on the
  laptop and the coach phone. Then give the pitch from the live deck, or the PDF if the live deck is not in this build (below). After the last slide, press Cmd+Ctrl+F to
  leave full screen and switch to the app's tab for the live loop: kiosk join, Today updating, a nudge, Reports (it
  opens on how many nudges led to a visit). Leave a minute for questions.

### The live deck

If `slides.html?present` shows the slides as one long page and not one at a time, this build has no live deck: give
the pitch from the PDF backup below.

1. In Chrome on the laptop, open `marketing/slides/slides.html?present`: drag `slides.html` from Finder onto Chrome,
   click the address bar, type `?present` at the end, and press Return.
2. Go full screen: View, Enter Full Screen (Cmd+Ctrl+F).
3. The clicker or the arrow keys step through it. The words for each slide are in `marketing/slides/notes.md`.
4. After slide 3 the deck plays the reel (30 seconds, with its voice): let it finish (it holds on its last picture),
   then click on to "Meet Regulars". If a Play button shows instead, press the clicker once (or click it). Before the
   judges arrive, turn the laptop's sound up and step to the film once to hear it, then press Home. If the reel's still picture shows, or
   slide 3 goes straight to "Meet Regulars", the film isn't on this laptop: click straight on.

The backup is `marketing/exports/Regulars-pitch.pdf`: open it in Preview, then View, Slideshow. The PDF has the 8
slides and no reel.

### The reel

The reel is a 30-second film: the problem, then Sam's story in the app. Its files are in `marketing/exports`:

- `Regulars-reel-16x9-loop.mp4`: no voice. **This is the stall's loop.** Play it on a second screen facing the walkway:
  open it in QuickTime, then View, Loop, then full screen (Cmd+Ctrl+F). With no second screen, skip it.
- `Regulars-reel-16x9.mp4`: the same film with the voice, for playing aloud (the deck already plays it after slide 3).
- `Regulars-reel-9x16.mp4`: the upright version, for showing on a phone (AirDrop it to a team phone the night
  before).

The old `Tenure-reel-*` files are retired (they carried the old name). If the `Regulars-reel-*` files aren't there, skip the
reel and run the deck without it.

## 4. Backups

A backup copies all of the app's data to one file. Take one before the stall (after setting up, before the doors open).
After the stall, take one only if you need the day's data, and take it before you reset or wipe anything. The app can
keep running while you back up. In a second Terminal window (Cmd+N), go into the `tenure` folder as in section 1, then:

```bash
scripts/backup.sh backup
```

It prints where the file went: the `apps/api/data/backups` folder inside `tenure`, named with the date and time. Copy
the files you want to keep onto a USB drive too.

To put a backup back: stop the app (Ctrl+C in its window), then run this with the file's name, then start it again.

```bash
scripts/backup.sh restore apps/api/data/backups/tenure-2026-11-08-090000.db
```

```bash
TENURE_COUNTRY=US scripts/stall.sh
```

It refuses while the app is running, and keeps the data it replaced as a `tenure-before-restore-…` file in the same
folder.

**Deleted means gone from the app, not from backups.** When a member is deleted, or the demo is reset, they leave
the app's live data, but every backup taken before that still holds them: visitors' names included. Keep backups only as
long as you need them. To forget someone completely, also delete the older backup files (in Finder, move them to the
Bin and empty it). Once the day is checked, delete every backup that holds visitors' names.

## 5. When something goes wrong

The commands that start with `docker` need Docker's command in Terminal. If Terminal answers "command not found:
docker", run this once in that window first (the `scripts/…` commands find Docker on their own):

```bash
export PATH="$HOME/.docker/bin:$PATH"
```

| What you see | What to do |
| --- | --- |
| "Docker Desktop isn't running" | Open Docker Desktop, wait for the engine to run, then `TENURE_COUNTRY=US scripts/stall.sh` again. |
| "The docker command isn't found" | Docker Desktop isn't installed, or hasn't been opened yet. Install it, open it once, open a new Terminal window, and try again. |
| "Bind for 0.0.0.0:5175 failed: port is already allocated" | Another copy of the app is running: press Ctrl+C in its window, or quit the other program. If you can't find it, start on another port: `TENURE_PORT=5176 TENURE_COUNTRY=US scripts/stall.sh`. The links then end in `:5176`. |
| "The build failed … Using the image built last time" | Normal with no internet: the app starts as it was last built. If it says there is no image from an earlier build, connect the laptop to the internet and start it again. |
| "… is not one of the open markets" | TENURE_COUNTRY has a wrong code. At the stall it is always US: `TENURE_COUNTRY=US scripts/stall.sh`. |
| A phone can't open the link | Section 2, "When a phone can't reach the laptop". |
| A screen shows Log In, or is signed out | Someone pressed Reset the Demo. Go back to the home page on the laptop (http://localhost:5175) and press **Try the Demo**. For a phone, once the laptop has pressed Try the Demo, open the phone link again from the QR code under Open on a Phone in the laptop's Settings. After a reset the laptop is signed out too. Don't sign in or press Create Your Account on the Log In page. |
| Today looks stale | Pull down or reload the page. |
| Anything else odd | **Restart:** Ctrl+C in the app's window, then `TENURE_COUNTRY=US scripts/stall.sh`. The data stays. |
| The sample gym is in a mess | **Re-seed:** press Reset the Demo on the home page. |
| Still broken | **Start from scratch:** take a backup, then run `docker compose down -v` and `TENURE_COUNTRY=US scripts/stall.sh`. This wipes all data and sets up a new sample gym, with a new kiosk link, so scan the QR codes again. |

**Where the logs are.** The app's messages scroll in the Terminal window it runs in. If that window is gone, open a new
one, go into the `tenure` folder, and run `docker compose logs --tail 100`. Docker Desktop shows them too: Containers,
then tenure, then Logs. `docker compose ps` says whether the app is up: "healthy" means it answers.
